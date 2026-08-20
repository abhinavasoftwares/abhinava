import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import PlatformSession


SESSION_TTL_SECONDS = 60 * 60 * 8


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_platform_session(
    db: Session,
    *,
    platform_user_id,
    ip_address: str | None,
    user_agent: str | None,
) -> tuple[str, PlatformSession]:
    """
    Create a platform authentication session.

    The raw session token is returned exactly once to the caller.
    Only its SHA-256 hash is stored in PostgreSQL.
    """

    raw_token = secrets.token_urlsafe(48)

    now = _utc_now()

    session = PlatformSession(
        platform_user_id=platform_user_id,
        session_token_hash=_hash_token(raw_token),
        created_at=now,
        expires_at=now + timedelta(
            seconds=SESSION_TTL_SECONDS
        ),
        last_seen_at=now,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return raw_token, session


def get_active_platform_session(
    db: Session,
    *,
    raw_token: str,
) -> PlatformSession | None:
    """
    Resolve an active session from a raw browser token.

    Expired and revoked sessions are never returned.
    """

    if not raw_token:
        return None

    now = _utc_now()

    session = (
        db.query(PlatformSession)
        .filter(
            PlatformSession.session_token_hash
            == _hash_token(raw_token),
            PlatformSession.revoked_at.is_(None),
            PlatformSession.expires_at > now,
        )
        .first()
    )

    return session


def revoke_platform_session(
    db: Session,
    *,
    raw_token: str,
) -> bool:
    """
    Revoke a platform session.

    Returns True when an active session was revoked.
    """

    session = get_active_platform_session(
        db,
        raw_token=raw_token,
    )

    if session is None:
        return False

    session.revoked_at = _utc_now()

    db.commit()

    return True
