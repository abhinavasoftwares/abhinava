from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import PlatformUser


IDENTITY_PROVIDER_GOOGLE = "google"

ROLE_OWNER = "OWNER"

STATUS_INVITED = "INVITED"
STATUS_ACTIVE = "ACTIVE"
STATUS_SUSPENDED = "SUSPENDED"
STATUS_DISABLED = "DISABLED"


class PlatformIdentityError(Exception):
    """Base error for platform identity resolution."""


class PlatformIdentityDenied(PlatformIdentityError):
    """Raised when a Google identity is not permitted."""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def resolve_google_identity(
    db: Session,
    *,
    google_subject: str,
    email: str,
    display_name: str | None,
) -> PlatformUser:
    """
    Resolve a verified Google identity to an Abhinava platform user.

    The Google subject (`sub`) is the immutable external identity.

    First-login behavior:
        Existing invited platform identity with matching email
        + no external_subject
        -> bind Google subject
        -> activate identity

    Returning-login behavior:
        Existing active identity
        + matching Google subject
        -> allow login

    Anything else is denied.
    """

    normalized_email = email.strip().lower()

    if not google_subject.strip():
        raise PlatformIdentityDenied(
            "Google subject is missing."
        )

    if not normalized_email:
        raise PlatformIdentityDenied(
            "Google email is missing."
        )

    user = (
        db.query(PlatformUser)
        .filter(
            PlatformUser.identity_provider
            == IDENTITY_PROVIDER_GOOGLE,
            PlatformUser.email
            == normalized_email,
        )
        .with_for_update()
        .first()
    )

    if user is None:
        raise PlatformIdentityDenied(
            "Google identity is not registered for Abhinava."
        )

    # ---------------------------------------------------------
    # First verified login:
    # The platform identity was bootstrapped but the Google
    # subject has not yet been bound.
    # ---------------------------------------------------------
    if user.external_subject is None:

        if user.status != STATUS_INVITED:
            raise PlatformIdentityDenied(
                "Platform identity is not eligible for "
                "initial activation."
            )

        user.external_subject = google_subject
        user.display_name = display_name
        user.status = STATUS_ACTIVE
        user.last_login_at = _utc_now()

        db.commit()
        db.refresh(user)

        return user

    # ---------------------------------------------------------
    # Returning login:
    # The Google subject must match exactly.
    # ---------------------------------------------------------
    if user.external_subject != google_subject:
        raise PlatformIdentityDenied(
            "Google identity does not match the registered "
            "platform identity."
        )

    if user.status != STATUS_ACTIVE:
        raise PlatformIdentityDenied(
            "Platform identity is not active."
        )

    user.display_name = display_name
    user.last_login_at = _utc_now()

    db.commit()
    db.refresh(user)

    return user
