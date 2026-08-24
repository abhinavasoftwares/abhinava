from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import SessionLocal
from services.platform_auth_transaction import (
    create_auth_transaction,
)
from services.platform_oidc import (
    build_google_authorization_url,
    get_google_oidc_configuration,
)
from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/auth",
    tags=["Platform Authentication"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("/google/login")
async def google_login(
    request: Request,
    db: Session = Depends(get_db),
):
    client_host = (
        request.client.host
        if request.client
        else None
    )

    user_agent = request.headers.get(
        "user-agent"
    )

    state, nonce = create_auth_transaction(
        db=db,
        ip_address=client_host,
        user_agent=user_agent,
    )

    oidc_config = (
        await get_google_oidc_configuration()
    )

    authorization_endpoint = oidc_config.get(
        "authorization_endpoint"
    )

    if not authorization_endpoint:
        raise RuntimeError(
            "Google authorization endpoint is missing "
            "from OIDC discovery."
        )

    authorization_url = (
        build_google_authorization_url(
            state=state,
            nonce=nonce,
            authorization_endpoint=authorization_endpoint,
        )
    )

    return RedirectResponse(
        url=authorization_url,
        status_code=302,
    )


@router.get("/google/callback")
async def google_callback():
    return {
        "message": "Google callback route is being implemented"
    }