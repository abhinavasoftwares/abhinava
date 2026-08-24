import os

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from models import Client


DEVELOPMENT_CLIENT_ID = 15


def resolve_crm_client(
    request: Request,
    db: Session,
) -> Client:
    """
    Resolve the CRM client from the incoming CRM origin.

    Production:
        The CRM Origin must match a registered
        Client.crm_domain.

    Development:
        When CRM_DEV_MODE=true, Client 15 is used
        as the temporary development tenant.

    This resolver returns only the Client configuration
    record. It does not return client business data.
    """

    crm_dev_mode = (
        os.getenv("CRM_DEV_MODE", "").lower()
        == "true"
    )

    origin = request.headers.get("origin")

    # ========================================================
    # DEVELOPMENT FALLBACK
    # ========================================================

    if crm_dev_mode:
        client = (
            db.query(Client)
            .filter(
                Client.id
                == DEVELOPMENT_CLIENT_ID
            )
            .first()
        )

        if client is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Development CRM tenant "
                    "was not found."
                ),
            )

        return client

    # ========================================================
    # PRODUCTION TENANT RESOLUTION
    # ========================================================

    if not origin:
        raise HTTPException(
            status_code=400,
            detail=(
                "CRM origin is required "
                "for tenant resolution."
            ),
        )

    origin = origin.rstrip("/")

    # Registered crm_domain values are stored as
    # origins, for example:
    #
    # https://crm.shridharajewellers.com
    #
    client = (
        db.query(Client)
        .filter(
            Client.crm_domain
            == origin
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No CRM tenant is registered "
                "for this domain."
            ),
        )

    return client