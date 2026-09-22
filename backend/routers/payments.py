from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Client,
    Invoice,
    Payment,
    PlatformAuditEvent,
    PlatformUser,
)

from schemas import (
    PaymentCreate,
    PaymentResponse,
)

from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ============================================================
# CONSTANTS
# ============================================================

VALID_PAYMENT_METHODS = {
    "CASH",
    "UPI",
    "BANK_TRANSFER",
    "CHEQUE",
    "CARD",
    "OTHER",
}

SUCCESS_STATUS = "SUCCESS"


# ============================================================
# HELPERS
# ============================================================

def normalize_payment_method(
    value: str,
) -> str:

    normalized = value.strip().upper()

    if normalized not in VALID_PAYMENT_METHODS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid payment method. "
                "Allowed values: CASH, UPI, BANK_TRANSFER, "
                "CHEQUE, CARD, OTHER."
            ),
        )

    return normalized


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
            Payment.status == SUCCESS_STATUS,
        )
        .scalar()
    )

    return money(
        Decimal(str(result or 0))
    )


def get_invoice_balance(
    db: Session,
    invoice: Invoice,
) -> tuple[Decimal, Decimal, Decimal]:

    total_amount = money(
        Decimal(str(invoice.total_amount))
    )

    paid_amount = get_successful_payment_total(
        db=db,
        invoice_id=invoice.id,
    )

    outstanding_amount = money(
        total_amount - paid_amount
    )

    return (
        total_amount,
        paid_amount,
        outstanding_amount,
    )


# ============================================================
# RECORD PAYMENT
# ============================================================

@router.post(
    "",
    response_model=PaymentResponse,
)
def record_payment(
    payload: PaymentCreate,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    # ========================================================
    # PLATFORM AUTHORIZATION
    # ========================================================

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to record payments."
            ),
        )

    # ========================================================
    # INVOICE
    # ========================================================

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == payload.invoice_id
        )
        .first()
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    # ========================================================
    # CLIENT
    # ========================================================

    client = (
        db.query(Client)
        .filter(
            Client.id == invoice.client_id
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "The invoice is linked to a client "
                "that no longer exists."
            ),
        )

    # ========================================================
    # INVOICE STATUS
    # ========================================================

    if invoice.status in {
        "VOID",
        "PAID",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Payment cannot be recorded against "
                f"an invoice with status {invoice.status}."
            ),
        )

    # ========================================================
    # PAYMENT METHOD
    # ========================================================

    payment_method = normalize_payment_method(
        payload.payment_method
    )

    # ========================================================
    # AMOUNT
    # ========================================================

    payment_amount = money(
        Decimal(str(payload.amount))
    )

    if payment_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero.",
        )

    # ========================================================
    # CURRENT BALANCE
    # ========================================================

    (
        total_amount,
        paid_amount,
        outstanding_amount,
    ) = get_invoice_balance(
        db=db,
        invoice=invoice,
    )

    if outstanding_amount <= Decimal("0.00"):
        invoice.status = "PAID"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="This invoice is already fully paid.",
        )

    # ========================================================
    # PREVENT OVERPAYMENT
    # ========================================================

    if payment_amount > outstanding_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Payment amount exceeds the outstanding "
                f"invoice balance of "
                f"{invoice.currency} {outstanding_amount}."
            ),
        )

    # ========================================================
    # CREATE PAYMENT
    # ========================================================

    now = datetime.now(timezone.utc)

    payment = Payment(
        client_id=client.id,
        invoice_id=invoice.id,

        amount=payment_amount,

        currency=invoice.currency,

        payment_method=payment_method,

        payment_reference=(
            payload.payment_reference.strip()
            if payload.payment_reference
            else None
        ),

        status=SUCCESS_STATUS,

        paid_at=now,

        notes=(
            payload.notes.strip()
            if payload.notes
            else None
        ),

        created_by=platform_user.id,
    )

    db.add(payment)
    db.flush()

    # ========================================================
    # CALCULATE NEW BALANCE
    # ========================================================

    new_paid_amount = money(
        paid_amount + payment_amount
    )

    new_outstanding_amount = money(
        total_amount - new_paid_amount
    )

    if new_outstanding_amount == Decimal("0.00"):
        invoice.status = "PAID"
    else:
        invoice.status = "PARTIALLY_PAID"

    # ========================================================
    # AUDIT
    # ========================================================

    audit_event = PlatformAuditEvent(
        event_type="PAYMENT_RECORDED",

        outcome="SUCCESS",

        actor_platform_user_id=platform_user.id,

        actor_identity=platform_user.email,

        target_type="PAYMENT",

        target_id=str(payment.id),

        client_id=client.id,

        tenant_id=client.tenant_id,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=(
            request.headers.get("user-agent")
        ),

        event_metadata={
            "payment_id": payment.id,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,

            "payment_amount": str(
                payment_amount
            ),

            "currency": payment.currency,

            "payment_method": payment.payment_method,

            "payment_reference": (
                payment.payment_reference
            ),

            "previous_paid_amount": str(
                paid_amount
            ),

            "new_paid_amount": str(
                new_paid_amount
            ),

            "remaining_balance": str(
                new_outstanding_amount
            ),

            "invoice_status": invoice.status,
        },
    )

    db.add(audit_event)

    # ========================================================
    # COMMIT
    # ========================================================

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment could not be recorded. "
                "No payment or invoice changes were saved."
            ),
        ) from exc

    db.refresh(payment)

    return payment


# ============================================================
# CLIENT PAYMENT HISTORY
# ============================================================

@router.get(
    "/client/{client_id}",
    response_model=list[PaymentResponse],
)
def list_client_payments(
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
            detail="You do not have permission to view payments.",
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    return (
        db.query(Payment)
        .filter(
            Payment.client_id == client_id
        )
        .order_by(
            Payment.paid_at.desc(),
            Payment.id.desc(),
        )
        .all()
    )


# ============================================================
# INVOICE PAYMENT HISTORY
# ============================================================

@router.get(
    "/invoice/{invoice_id}",
    response_model=list[PaymentResponse],
)
def list_invoice_payments(
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
            detail="You do not have permission to view payments.",
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

    return (
        db.query(Payment)
        .filter(
            Payment.invoice_id == invoice_id
        )
        .order_by(
            Payment.paid_at.desc(),
            Payment.id.desc(),
        )
        .all()
    )


# ============================================================
# INVOICE BALANCE
# ============================================================

@router.get(
    "/invoice/{invoice_id}/balance"
)
def get_invoice_payment_balance(
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
            detail="You do not have permission to view payments.",
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

    (
        total_amount,
        paid_amount,
        outstanding_amount,
    ) = get_invoice_balance(
        db=db,
        invoice=invoice,
    )

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "currency": invoice.currency,
        "invoice_total": total_amount,
        "paid_amount": paid_amount,
        "outstanding_amount": outstanding_amount,
        "invoice_status": invoice.status,
    }