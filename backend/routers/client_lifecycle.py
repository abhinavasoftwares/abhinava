from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Client,
    PlatformAuditEvent,
    PlatformUser,
)

from schemas import (
    ClientLifecycleResponse,
    ClientStatusChangeRequest,
)

from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/clients",
    tags=["Client Lifecycle"],
)


# ============================================================
# AUTHORIZE PLATFORM ADMIN
# ============================================================

def require_client_lifecycle_admin(
    platform_user: PlatformUser,
):
    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to manage client lifecycle."
            ),
        )


# ============================================================
# DISABLE CLIENT
# ============================================================

@router.post(
    "/{client_id}/disable",
    response_model=ClientLifecycleResponse,
)
def disable_client(
    client_id: int,
    payload: ClientStatusChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    require_client_lifecycle_admin(
        platform_user
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

    if client.account_status == "DISABLED":
        raise HTTPException(
            status_code=409,
            detail="Client is already disabled.",
        )

    now = datetime.now(timezone.utc)

    client.account_status = "DISABLED"
    client.disabled_at = now
    client.disabled_by = platform_user.email
    client.disabled_reason = payload.reason.strip()

    audit = PlatformAuditEvent(
        event_type="CLIENT_DISABLED",
        outcome="SUCCESS",
        actor_platform_user_id=platform_user.id,
        actor_identity=platform_user.email,
        target_type="CLIENT",
        target_id=str(client.id),
        client_id=client.id,
        tenant_id=client.tenant_id,
        ip_address=(
            request.client.host
            if request.client
            else None
        ),
        user_agent=request.headers.get(
            "user-agent"
        ),
        event_metadata={
            "reason": client.disabled_reason,
            "disabled_at": now.isoformat(),
        },
    )

    db.add(audit)

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to disable client.",
        ) from exc

    db.refresh(client)

    return ClientLifecycleResponse(
        client_id=client.id,
        account_status=client.account_status,
        disabled_at=client.disabled_at,
        disabled_by=client.disabled_by,
        disabled_reason=client.disabled_reason,
    )


# ============================================================
# ENABLE CLIENT
# ============================================================

@router.post(
    "/{client_id}/enable",
    response_model=ClientLifecycleResponse,
)
def enable_client(
    client_id: int,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):

    require_client_lifecycle_admin(
        platform_user
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

    if client.account_status == "ACTIVE":
        raise HTTPException(
            status_code=409,
            detail="Client is already active.",
        )

    now = datetime.now(timezone.utc)

    previous_reason = client.disabled_reason

    client.account_status = "ACTIVE"
    client.disabled_at = None
    client.disabled_by = None
    client.disabled_reason = None

    audit = PlatformAuditEvent(
        event_type="CLIENT_ENABLED",
        outcome="SUCCESS",
        actor_platform_user_id=platform_user.id,
        actor_identity=platform_user.email,
        target_type="CLIENT",
        target_id=str(client.id),
        client_id=client.id,
        tenant_id=client.tenant_id,
        ip_address=(
            request.client.host
            if request.client
            else None
        ),
        user_agent=request.headers.get(
            "user-agent"
        ),
        event_metadata={
            "previous_disabled_reason": (
                previous_reason
            ),
            "enabled_at": now.isoformat(),
        },
    )

    db.add(audit)

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to enable client.",
        ) from exc

    db.refresh(client)

    return ClientLifecycleResponse(
        client_id=client.id,
        account_status=client.account_status,
        disabled_at=client.disabled_at,
        disabled_by=client.disabled_by,
        disabled_reason=client.disabled_reason,
    )