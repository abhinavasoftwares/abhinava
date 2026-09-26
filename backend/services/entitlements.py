from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from fastapi import HTTPException

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    Client,
    ClientSubscription,
    ClientSubscriptionModule,
    Invoice,
    Payment,
)


ACTIVE_SUBSCRIPTION_STATUS = "ACTIVE"

SUCCESS_PAYMENT_STATUS = "SUCCESS"

OPEN_INVOICE_STATUSES = {
    "ISSUED",
    "PARTIALLY_PAID",
    "OVERDUE",
}


@dataclass(frozen=True)
class EntitlementResult:
    client_id: int
    account_status: str

    firebase_ready: bool

    access_allowed: bool
    access_reason: str

    subscription_id: int | None
    subscription_status: str | None
    subscription_start_date: date | None
    subscription_end_date: date | None

    billing_status: str

    invoice_id: int | None
    invoice_status: str | None

    invoice_total: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal

    modules: tuple[str, ...]


def money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(
        Decimal("0.01")
    )


def get_successful_payment_total(
    db: Session,
    invoice_id: int,
) -> Decimal:
    result = (
        db.query(
            func.coalesce(
                func.sum(Payment.amount),
                0,
            )
        )
        .filter(
            Payment.invoice_id == invoice_id,
            Payment.status == SUCCESS_PAYMENT_STATUS,
        )
        .scalar()
    )

    return money(
        Decimal(str(result or 0))
    )


def get_current_subscription(
    db: Session,
    client_id: int,
) -> ClientSubscription | None:
    return (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.client_id == client_id,
            ClientSubscription.status == ACTIVE_SUBSCRIPTION_STATUS,
        )
        .order_by(
            ClientSubscription.id.desc()
        )
        .first()
    )


def get_current_invoice(
    db: Session,
    subscription: ClientSubscription,
) -> Invoice | None:
    return (
        db.query(Invoice)
        .filter(
            Invoice.client_subscription_id
            == subscription.id,
            Invoice.status != "VOID",
        )
        .order_by(
            Invoice.invoice_date.desc(),
            Invoice.id.desc(),
        )
        .first()
    )


def get_subscription_modules(
    db: Session,
    subscription_id: int,
) -> tuple[str, ...]:
    modules = (
        db.query(ClientSubscriptionModule.module_key)
        .filter(
            ClientSubscriptionModule.client_subscription_id
            == subscription_id
        )
        .order_by(
            ClientSubscriptionModule.module_key.asc()
        )
        .all()
    )

    return tuple(
        module_key
        for (module_key,) in modules
    )


def calculate_billing_status(
    invoice: Invoice | None,
    paid_amount: Decimal,
    outstanding_amount: Decimal,
) -> str:
    if invoice is None:
        return "NO_INVOICE"

    if invoice.status == "PAID":
        return "PAID"

    if outstanding_amount <= Decimal("0.00"):
        return "PAID"

    if invoice.status == "OVERDUE":
        return "OVERDUE"

    if paid_amount > Decimal("0.00"):
        return "PARTIALLY_PAID"

    if invoice.status in OPEN_INVOICE_STATUSES:
        return "DUE"

    return invoice.status


def calculate_client_entitlement(
    db: Session,
    client: Client,
    today: date | None = None,
) -> EntitlementResult:

    today = today or date.today()

    # --------------------------------------------------------
    # ACCOUNT STATUS
    # --------------------------------------------------------

    if client.account_status != "ACTIVE":
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=False,
            access_allowed=False,
            access_reason="ACCOUNT_DISABLED",
            subscription_id=None,
            subscription_status=None,
            subscription_start_date=None,
            subscription_end_date=None,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    # --------------------------------------------------------
    # FIREBASE READINESS
    # --------------------------------------------------------

    firebase_ready = (
        bool(client.firebase_project_id)
        and bool(client.firebase_web_app_id)
        and str(
            client.firebase_provisioning_status or ""
        ).upper()
        == "READY"
    )

    if not firebase_ready:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=False,
            access_allowed=False,
            access_reason="FIREBASE_NOT_READY",
            subscription_id=None,
            subscription_status=None,
            subscription_start_date=None,
            subscription_end_date=None,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    # --------------------------------------------------------
    # CURRENT SUBSCRIPTION
    # --------------------------------------------------------

    subscription = get_current_subscription(
        db=db,
        client_id=client.id,
    )

    if subscription is None:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=True,
            access_allowed=False,
            access_reason="NO_ACTIVE_SUBSCRIPTION",
            subscription_id=None,
            subscription_status=None,
            subscription_start_date=None,
            subscription_end_date=None,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    # --------------------------------------------------------
    # SUBSCRIPTION DATE STATE
    # --------------------------------------------------------

    if subscription.status != ACTIVE_SUBSCRIPTION_STATUS:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=True,
            access_allowed=False,
            access_reason=(
                f"SUBSCRIPTION_{subscription.status}"
            ),
            subscription_id=subscription.id,
            subscription_status=subscription.status,
            subscription_start_date=subscription.start_date,
            subscription_end_date=subscription.end_date,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    if today < subscription.start_date:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=True,
            access_allowed=False,
            access_reason="SUBSCRIPTION_NOT_STARTED",
            subscription_id=subscription.id,
            subscription_status=subscription.status,
            subscription_start_date=subscription.start_date,
            subscription_end_date=subscription.end_date,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    if today >= subscription.end_date:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=True,
            access_allowed=False,
            access_reason="SUBSCRIPTION_EXPIRED",
            subscription_id=subscription.id,
            subscription_status=subscription.status,
            subscription_start_date=subscription.start_date,
            subscription_end_date=subscription.end_date,
            billing_status="NOT_EVALUATED",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=(),
        )

    # --------------------------------------------------------
    # MODULES
    # --------------------------------------------------------

    modules = get_subscription_modules(
        db=db,
        subscription_id=subscription.id,
    )

    # --------------------------------------------------------
    # CURRENT INVOICE / PAYMENT STATE
    # --------------------------------------------------------

    invoice = get_current_invoice(
        db=db,
        subscription=subscription,
    )

    if invoice is None:
        return EntitlementResult(
            client_id=client.id,
            account_status=client.account_status,
            firebase_ready=True,
            access_allowed=True,
            access_reason="ACTIVE_SUBSCRIPTION",
            subscription_id=subscription.id,
            subscription_status=subscription.status,
            subscription_start_date=subscription.start_date,
            subscription_end_date=subscription.end_date,
            billing_status="NO_INVOICE",
            invoice_id=None,
            invoice_status=None,
            invoice_total=Decimal("0.00"),
            paid_amount=Decimal("0.00"),
            outstanding_amount=Decimal("0.00"),
            modules=modules,
        )

    invoice_total = money(
        Decimal(str(invoice.total_amount))
    )

    paid_amount = get_successful_payment_total(
        db=db,
        invoice_id=invoice.id,
    )

    outstanding_amount = money(
        max(
            invoice_total - paid_amount,
            Decimal("0.00"),
        )
    )

    billing_status = calculate_billing_status(
        invoice=invoice,
        paid_amount=paid_amount,
        outstanding_amount=outstanding_amount,
    )

    # --------------------------------------------------------
    # ACCESS POLICY
    # --------------------------------------------------------
    #
    # IMPORTANT:
    #
    # Payment state is currently informational.
    # We have NOT yet defined a grace-period / blocking
    # policy, so an unpaid invoice does not automatically
    # disable an otherwise valid active subscription.
    #
    # That policy will be introduced separately and centrally.
    #

    return EntitlementResult(
        client_id=client.id,
        account_status=client.account_status,
        firebase_ready=True,
        access_allowed=True,
        access_reason="ACTIVE_SUBSCRIPTION",
        subscription_id=subscription.id,
        subscription_status=subscription.status,
        subscription_start_date=subscription.start_date,
        subscription_end_date=subscription.end_date,
        billing_status=billing_status,
        invoice_id=invoice.id,
        invoice_status=invoice.status,
        invoice_total=invoice_total,
        paid_amount=paid_amount,
        outstanding_amount=outstanding_amount,
        modules=modules,
    )


def client_has_module(
    entitlement: EntitlementResult,
    module_key: str,
) -> bool:
    if not entitlement.access_allowed:
        return False

    return module_key in entitlement.modules

def require_module(
    entitlement: EntitlementResult,
    module_key: str,
) -> None:
    if not entitlement.access_allowed:
        raise HTTPException(
            status_code=403,
            detail="CRM access is not available.",
        )

    if module_key not in entitlement.modules:
        raise HTTPException(
            status_code=403,
            detail=(
                f"The '{module_key}' module is not "
                "enabled for this subscription."
            ),
        )