import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import PlatformAuthTransaction


TRANSACTION_TTL_SECONDS = 600


def _required_secret() -> bytes:
    value = os.getenv(
        "ABHINAVA_AUTH_TRANSACTION_SECRET"
    )

    if not value:
        raise RuntimeError(
            "ABHINAVA_AUTH_TRANSACTION_SECRET "
            "is not configured"
        )

    return value.encode("utf-8")


def _hash_value(value: str) -> str:
    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_auth_transaction(
    db: Session,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> tuple[str, str]:
    """
    Create a short-lived OAuth transaction.

    Returns:
        (state, nonce)

    Only SHA-256 hashes of state and nonce are persisted.

    The nonce is deterministically derived from the random
    state using a server-side secret, allowing secure nonce
    reconstruction during the callback without storing the
    raw nonce.
    """

    state = secrets.token_urlsafe(32)

    nonce = hmac.new(
        _required_secret(),
        state.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    now = _utc_now()

    transaction = PlatformAuthTransaction(
        state_hash=_hash_value(state),
        nonce_hash=_hash_value(nonce),
        created_at=now,
        expires_at=now + timedelta(
            seconds=TRANSACTION_TTL_SECONDS
        ),
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.add(transaction)
    db.commit()

    return state, nonce


def derive_nonce_from_state(
    state: str,
) -> str:
    """
    Reconstruct the nonce generated for an OAuth state.
    """

    return hmac.new(
        _required_secret(),
        state.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def consume_auth_transaction(
    db: Session,
    *,
    state: str,
) -> PlatformAuthTransaction | None:
    """
    Validate and consume a Google OAuth transaction.

    A transaction can only be consumed once and must not
    be expired.
    """

    if not state:
        return None

    now = _utc_now()

    transaction = (
        db.query(PlatformAuthTransaction)
        .filter(
            PlatformAuthTransaction.state_hash
            == _hash_value(state),
            PlatformAuthTransaction.consumed_at.is_(None),
            PlatformAuthTransaction.expires_at > now,
        )
        .with_for_update()
        .first()
    )

    if transaction is None:
        return None

    transaction.consumed_at = now

    db.commit()
    db.refresh(transaction)

    return transaction