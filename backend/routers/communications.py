from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Client,
    ClientCommunication,
    PlatformAuditEvent,
    PlatformUser,
)

from schemas import (
    EmailCommunicationCreate,
    EmailCommunicationResponse,
)

from services.email import send_email

from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/communications",
    tags=["Communications"],
)


# ============================================================
# EMAIL HTML
# ============================================================

def build_email_html(
    *,
    client: Client,
    subject: str,
    message: str,
) -> str:

    escaped_message = (
        message
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
    )

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{subject}</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#f5f5f5;
        font-family:Arial,sans-serif;
    "
>

<div
    style="
        max-width:640px;
        margin:30px auto;
        background:#ffffff;
        border-radius:12px;
        padding:32px;
        border:1px solid #e5e7eb;
    "
>

    <h2
        style="
            margin-top:0;
            color:#111827;
        "
    >
        {subject}
    </h2>

    <p
        style="
            color:#374151;
            line-height:1.7;
        "
    >
        {escaped_message}
    </p>

    <div
        style="
            margin-top:30px;
            padding-top:18px;
            border-top:1px solid #e5e7eb;
            color:#6b7280;
            font-size:13px;
        "
    >
        <strong>
            Abhinava
        </strong>

        <br>

        Powered by Abhinava
    </div>

</div>

</body>
</html>
"""


# ============================================================
# SEND EMAIL
# ============================================================

@router.post(
    "/email",
    response_model=EmailCommunicationResponse,
)
def send_client_email(
    payload: EmailCommunicationCreate,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    # ========================================================
    # AUTHORIZATION
    # ========================================================

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to send client emails."
            ),
        )

    # ========================================================
    # CLIENT
    # ========================================================

    client = (
        db.query(Client)
        .filter(
            Client.id == payload.client_id
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    # ========================================================
    # ACCOUNT STATUS
    # ========================================================

    if client.account_status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail=(
                "Communication cannot be sent "
                "for a disabled client."
            ),
        )

    # ========================================================
    # CREATE COMMUNICATION RECORD
    # ========================================================

    communication = ClientCommunication(
        client_id=client.id,

        channel="EMAIL",

        direction="OUTBOUND",

        communication_type="EMAIL",

        recipient=payload.recipient.strip(),

        sender=platform_user.email,

        subject=payload.subject.strip(),

        message=payload.message,

        template_name=(
            payload.template_name.strip()
            if payload.template_name
            else None
        ),

        status="PENDING",

        provider="RESEND",

        sent_by=platform_user.id,
    )

    db.add(communication)
    db.flush()

    # ========================================================
    # SEND
    # ========================================================

    html = build_email_html(
        client=client,
        subject=payload.subject.strip(),
        message=payload.message,
    )

    result = send_email(
        recipient=payload.recipient.strip(),
        subject=payload.subject.strip(),
        html=html,
    )

    now = datetime.now(timezone.utc)

    if result.success:

        communication.status = "SENT"

        communication.provider_message_id = (
            result.provider_message_id
        )

        communication.sent_at = now

        communication.failure_reason = None

        outcome = "SUCCESS"

    else:

        communication.status = "FAILED"

        communication.failure_reason = (
            result.error
        )

        communication.sent_at = None

        outcome = "FAILURE"

    # ========================================================
    # AUDIT
    # ========================================================

    audit_event = PlatformAuditEvent(
        event_type="CLIENT_EMAIL_SENT",

        outcome=outcome,

        actor_platform_user_id=platform_user.id,

        actor_identity=platform_user.email,

        target_type="CLIENT_COMMUNICATION",

        target_id=str(
            communication.id
        ),

        client_id=client.id,

        tenant_id=client.tenant_id,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=(
            request.headers.get(
                "user-agent"
            )
        ),

        event_metadata={
            "communication_id": (
                communication.id
            ),

            "recipient": (
                communication.recipient
            ),

            "subject": (
                communication.subject
            ),

            "provider": "RESEND",

            "provider_message_id": (
                communication.provider_message_id
            ),

            "status": (
                communication.status
            ),

            "failure_reason": (
                communication.failure_reason
            ),
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
                "Email communication could not "
                "be recorded."
            ),
        ) from exc

    db.refresh(communication)

    # ========================================================
    # RETURN PROVIDER FAILURE AS API ERROR
    # ========================================================

    if not result.success:

        raise HTTPException(
            status_code=502,
            detail={
                "message": (
                    "Email provider rejected "
                    "the message."
                ),
                "communication_id": (
                    communication.id
                ),
                "reason": (
                    result.error
                ),
            },
        )

    return communication


# ============================================================
# CLIENT COMMUNICATION HISTORY
# ============================================================

@router.get(
    "/client/{client_id}",
    response_model=list[
        EmailCommunicationResponse
    ],
)
def list_client_communications(
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
                "to view communications."
            ),
        )

    client = (
        db.query(Client)
        .filter(
            Client.id == client_id
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    return (
        db.query(ClientCommunication)
        .filter(
            ClientCommunication.client_id
            == client_id
        )
        .order_by(
            ClientCommunication.created_at.desc()
        )
        .all()
    )