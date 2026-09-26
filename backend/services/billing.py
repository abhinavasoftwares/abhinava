from calendar import monthrange
from datetime import date
from decimal import Decimal
from sqlalchemy import func

from models import Payment

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import (
    Client,
    ClientSubscription,
    Invoice,
    InvoiceLineItem,
)


TAX_RATE = Decimal("18.00")


def money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(
        Decimal("0.01")
    )


def calculate_next_period_end(
    period_start: date,
    billing_cycle: str,
) -> date:

    if billing_cycle == "annual":

        try:
            return date(
                period_start.year + 1,
                period_start.month,
                period_start.day,
            )

        except ValueError:
            # February 29 → February 28
            return date(
                period_start.year + 1,
                2,
                28,
            )

    if billing_cycle == "monthly":

        if period_start.month == 12:
            next_year = period_start.year + 1
            next_month = 1
        else:
            next_year = period_start.year
            next_month = period_start.month + 1

        last_day = monthrange(
            next_year,
            next_month,
        )[1]

        return date(
            next_year,
            next_month,
            min(
                period_start.day,
                last_day,
            ),
        )

    raise ValueError(
        "Unsupported billing cycle."
    )


def calculate_subscription_amounts(
    price_before_tax: Decimal,
):
    price_before_tax = money(
        price_before_tax
    )

    tax_amount = money(
        price_before_tax
        * TAX_RATE
        / Decimal("100")
    )

    total_amount = money(
        price_before_tax + tax_amount
    )

    return (
        price_before_tax,
        tax_amount,
        total_amount,
    )


def invoice_already_exists(
    db: Session,
    subscription_id: int,
    period_start: date,
    period_end: date,
) -> Invoice | None:

    return (
        db.query(Invoice)
        .filter(
            Invoice.client_subscription_id
            == subscription_id,

            Invoice.period_start
            == period_start,

            Invoice.period_end
            == period_end,
        )
        .first()
    )


def create_renewal_invoice(
    db: Session,
    subscription: ClientSubscription,
    invoice_date: date,
) -> Invoice | None:

    period_start = subscription.end_date

    period_end = calculate_next_period_end(
        period_start=period_start,
        billing_cycle=subscription.billing_cycle,
    )

    # --------------------------------------------------------
    # DUPLICATE PROTECTION
    # --------------------------------------------------------

    existing_invoice = invoice_already_exists(
        db=db,
        subscription_id=subscription.id,
        period_start=period_start,
        period_end=period_end,
    )

    if existing_invoice is not None:
        return None

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    price_before_tax = money(
        Decimal(
            str(subscription.price_before_tax)
        )
    )

    (
        price_before_tax,
        tax_amount,
        total_amount,
    ) = calculate_subscription_amounts(
        price_before_tax
    )

    # --------------------------------------------------------
    # CLIENT
    # --------------------------------------------------------

    client = (
        db.query(Client)
        .filter(
            Client.id == subscription.client_id
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Subscription is linked to a "
                "missing client."
            ),
        )

    # --------------------------------------------------------
    # INVOICE NUMBER
    # --------------------------------------------------------

    from routers.subscriptions import (
        generate_invoice_number,
    )

    invoice = Invoice(
        client_id=client.id,

        client_subscription_id=subscription.id,

        invoice_number=generate_invoice_number(),

        invoice_date=invoice_date,

        due_date=period_start,

        period_start=period_start,

        period_end=period_end,

        invoice_type="RENEWAL",

        status="ISSUED",

        currency=subscription.currency,

        subtotal=price_before_tax,

        discount_amount=Decimal("0.00"),

        tax_rate=TAX_RATE,

        tax_amount=tax_amount,

        total_amount=total_amount,

        notes=(
            f"{subscription.subscription_name} "
            f"{subscription.billing_cycle} "
            f"subscription renewal."
        ),
    )

    db.add(invoice)
    db.flush()

    # --------------------------------------------------------
    # LINE ITEM
    # --------------------------------------------------------

    db.add(
        InvoiceLineItem(
            invoice_id=invoice.id,

            description=(
                f"{subscription.subscription_name} — "
                f"{subscription.billing_cycle.title()} "
                f"Subscription Renewal"
            ),

            quantity=Decimal("1.00"),

            unit_price=price_before_tax,

            amount=price_before_tax,
        )
    )

    return invoice


def get_invoice_payment_summary(
    db: Session,
    invoice: Invoice,
) -> dict:

    paid_amount = (
        db.query(
            func.coalesce(
                func.sum(Payment.amount),
                0,
            )
        )
        .filter(
            Payment.invoice_id == invoice.id,
            Payment.status == "SUCCESS",
        )
        .scalar()
    )

    paid_amount = money(
        Decimal(str(paid_amount or 0))
    )

    total_amount = money(
        Decimal(str(invoice.total_amount))
    )

    outstanding_amount = money(
        max(
            total_amount - paid_amount,
            Decimal("0.00"),
        )
    )

    if outstanding_amount == Decimal("0.00"):

        effective_status = "PAID"

    elif (
        invoice.due_date
        and date.today() > invoice.due_date
        and invoice.status not in {
            "PAID",
            "VOID",
        }
    ):

        effective_status = "OVERDUE"

    elif paid_amount > Decimal("0.00"):

        effective_status = "PARTIALLY_PAID"

    else:

        effective_status = invoice.status

    return {
        "invoice_total": total_amount,

        "paid_amount": paid_amount,

        "outstanding_amount": outstanding_amount,

        "fully_paid": (
            outstanding_amount
            == Decimal("0.00")
        ),

        "status": effective_status,
    }

def activate_paid_renewal(
    db: Session,
    invoice: Invoice,
) -> bool:
    """
    Activate a renewal only after the invoice has been
    completely paid.

    Returns True when a renewal subscription period
    was extended.
    """

    if invoice.invoice_type != "RENEWAL":
        return False

    if invoice.status != "PAID":
        return False

    if not invoice.client_subscription_id:
        return False

    if invoice.period_start is None:
        return False

    if invoice.period_end is None:
        return False

    subscription = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.id
            == invoice.client_subscription_id
        )
        .with_for_update()
        .first()
    )

    if subscription is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Renewal invoice is linked to "
                "a missing subscription."
            ),
        )

    # --------------------------------------------------------
    # IDEMPOTENCY
    # --------------------------------------------------------
    #
    # If this renewal period has already been activated,
    # do not extend it again.
    #

    if subscription.end_date >= invoice.period_end:
        return False

    # --------------------------------------------------------
    # VALIDATE RENEWAL PERIOD
    # --------------------------------------------------------

    if subscription.end_date != invoice.period_start:
        raise HTTPException(
            status_code=409,
            detail=(
                "Renewal invoice period does not match "
                "the current subscription period."
            ),
        )

    # --------------------------------------------------------
    # ACTIVATE RENEWAL
    # --------------------------------------------------------

    subscription.end_date = invoice.period_end
    subscription.status = "ACTIVE"

    db.flush()

    return True