from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db

from models import (
    ClientSubscription,
    Invoice,
    PlatformUser,
)

from services.billing import (
    create_renewal_invoice,
)

from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)


# ============================================================
# RUN RENEWALS
# ============================================================

@router.post(
    "/run-renewals"
)
def run_subscription_renewals(
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to run billing renewals."
            ),
        )

    today = date.today()

    subscriptions = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.status == "ACTIVE",

            ClientSubscription.end_date <= today,
        )
        .order_by(
            ClientSubscription.id.asc()
        )
        .all()
    )

    created = []

    skipped = []

    for subscription in subscriptions:

        invoice = create_renewal_invoice(
            db=db,
            subscription=subscription,
            invoice_date=today,
        )

        if invoice is None:

            skipped.append(
                {
                    "subscription_id": subscription.id,
                    "reason": (
                        "Renewal invoice already exists."
                    ),
                }
            )

            continue

        created.append(
            {
                "subscription_id": subscription.id,
                "client_id": subscription.client_id,
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "period_start": invoice.period_start,
                "period_end": invoice.period_end,
                "total_amount": invoice.total_amount,
            }
        )

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Billing renewal processing failed."
            ),
        ) from exc

    return {
        "message": "Billing renewal process completed.",
        "processed_date": today,
        "subscriptions_checked": len(
            subscriptions
        ),
        "invoices_created": created,
        "skipped": skipped,
    }


# ============================================================
# CLIENT INVOICE HISTORY
# ============================================================

@router.get(
    "/clients/{client_id}/invoices"
)
def list_client_invoices(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to view invoices."
            ),
        )

    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.client_id == client_id
        )
        .order_by(
            Invoice.invoice_date.desc(),
            Invoice.id.desc(),
        )
        .all()
    )

    return invoices


# ============================================================
# CLIENT BILLING SUMMARY
# ============================================================

@router.get(
    "/clients/{client_id}/summary"
)
def get_client_billing_summary(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to view billing."
            ),
        )

    subscriptions = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.client_id
            == client_id
        )
        .order_by(
            ClientSubscription.start_date.desc()
        )
        .all()
    )

    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.client_id == client_id
        )
        .order_by(
            Invoice.invoice_date.desc()
        )
        .all()
    )

    outstanding = sum(
        (
            invoice.total_amount
            for invoice in invoices
            if invoice.status
            in {
                "ISSUED",
                "PARTIALLY_PAID",
                "OVERDUE",
            }
        ),
        0,
    )

    paid = sum(
        (
            invoice.total_amount
            for invoice in invoices
            if invoice.status == "PAID"
        ),
        0,
    )

    return {
        "client_id": client_id,

        "active_subscription": next(
            (
                subscription
                for subscription in subscriptions
                if subscription.status == "ACTIVE"
            ),
            None,
        ),

        "subscription_history": subscriptions,

        "invoice_count": len(invoices),

        "paid_invoice_count": sum(
            1
            for invoice in invoices
            if invoice.status == "PAID"
        ),

        "outstanding_amount": outstanding,

        "paid_invoice_total": paid,

        "invoices": invoices,
    }

@router.get(
    "/invoices/{invoice_id}"
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to view invoices."
            ),
        )

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id
        )
        .first()
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    from services.billing import (
        get_invoice_payment_summary,
    )

    payment_summary = get_invoice_payment_summary(
        db=db,
        invoice=invoice,
    )

    return {
        "id": invoice.id,
        "client_id": invoice.client_id,
        "client_subscription_id": (
            invoice.client_subscription_id
        ),
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "period_start": invoice.period_start,
        "period_end": invoice.period_end,
        "invoice_type": invoice.invoice_type,
        "status": invoice.status,
        "currency": invoice.currency,
        "subtotal": invoice.subtotal,
        "discount_amount": invoice.discount_amount,
        "tax_rate": invoice.tax_rate,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "notes": invoice.notes,

        "payment_summary": payment_summary,
    }

@router.post(
    "/subscriptions/{subscription_id}/generate-invoice"
)
def generate_subscription_invoice(
    subscription_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to generate invoices."
            ),
        )

    subscription = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.id
            == subscription_id
        )
        .first()
    )

    if subscription is None:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found.",
        )

    if subscription.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=(
                "Invoices can only be generated "
                "for active subscriptions."
            ),
        )

    invoice = create_renewal_invoice(
        db=db,
        subscription=subscription,
        invoice_date=date.today(),
    )

    if invoice is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "An invoice already exists "
                "for the next subscription period."
            ),
        )

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to generate invoice.",
        ) from exc

    db.refresh(invoice)

    return {
        "message": "Invoice generated successfully.",
        "invoice": invoice,
    }