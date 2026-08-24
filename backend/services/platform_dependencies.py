from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import SessionLocal
from models import PlatformSession, PlatformUser
from services.platform_session import (
    get_active_platform_session,
)


SESSION_COOKIE_NAME = "abhinava_platform_session"


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_current_platform_user(
    request: Request,
    db: Session = Depends(get_db),
) -> PlatformUser:
    """
    Resolve the currently authenticated Abhinava platform user.

    Authentication is based exclusively on the HttpOnly
    platform session cookie.

    Expired or revoked sessions are rejected.
    """

    raw_session_token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if not raw_session_token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated.",
        )

    session = get_active_platform_session(
        db=db,
        raw_token=raw_session_token,
    )

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Session is invalid or expired.",
        )

    platform_user = (
        db.query(PlatformUser)
        .filter(
            PlatformUser.id
            == session.platform_user_id
        )
        .first()
    )

    if platform_user is None:
        raise HTTPException(
            status_code=401,
            detail="Platform user no longer exists.",
        )

    if platform_user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="Platform user is not active.",
        )

    return platform_user