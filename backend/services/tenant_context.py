from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from models import Client, PlatformUser
from services.platform_dependencies import (
    get_current_platform_user,
    get_db,
)


def get_client_by_id(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
) -> Client:
    """
    Resolve a platform-managed client.

    Platform users operate in the Abhinava control plane.
    Tenant CRM users will be handled separately.

    OWNER currently has access to all clients.
    Additional platform-role restrictions can be
    introduced here as the platform grows.
    """

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access clients.",
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

    return client


def require_active_tenant(
    client: Client = Depends(get_client_by_id),
) -> Client:
    """
    Require a client whose tenant Firebase environment
    is ready for tenant operations.
    """

    if client.firebase_provisioning_status != "ACTIVE":
        raise HTTPException(
            status_code=409,
            detail=(
                "Tenant environment is not ready. "
                f"Current provisioning status: "
                f"{client.firebase_provisioning_status}"
            ),
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail="Tenant Firebase project is not configured.",
        )

    return client