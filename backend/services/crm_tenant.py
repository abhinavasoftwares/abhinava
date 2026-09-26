import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Client
from services.entitlements import calculate_client_entitlement


CRM_SLUG_PATTERN = re.compile(
    r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
)


def normalize_crm_slug(value: str) -> str:
    """
    Normalize a human-readable business name or slug
    into the canonical CRM slug format.

    Examples:

        Shri Ram Jewels
            -> shri-ram-jewels

        Shri Ram Jewels & Sons
            -> shri-ram-jewels-sons

        SHRIDHARA Jewellers
            -> shridhara-jewellers
    """

    if not value:
        raise ValueError(
            "CRM slug source cannot be empty."
        )

    value = value.strip().lower()

    # Replace every non-alphanumeric sequence
    # with a single hyphen.
    value = re.sub(
        r"[^a-z0-9]+",
        "-",
        value,
    )

    # Remove leading/trailing hyphens.
    value = value.strip("-")

    if not value:
        raise ValueError(
            "Unable to generate a valid CRM slug."
        )

    if not CRM_SLUG_PATTERN.fullmatch(value):
        raise ValueError(
            "Generated CRM slug is invalid."
        )

    return value


def generate_unique_crm_slug(
    db: Session,
    business_name: str,
) -> str:
    """
    Generate a unique CRM slug for a new client.

    Example:

        Shri Ram Jewels
        -> shri-ram-jewels

    If that slug already exists:

        shri-ram-jewels-2
        shri-ram-jewels-3
        ...
    """

    base_slug = normalize_crm_slug(
        business_name
    )

    slug = base_slug
    counter = 2

    while (
        db.query(Client.id)
        .filter(
            Client.crm_slug == slug
        )
        .first()
        is not None
    ):
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def validate_crm_slug(
    crm_slug: str,
) -> str:
    """
    Validate an externally supplied CRM slug.

    This is useful for future admin functionality
    where we allow an administrator to choose a slug.
    """

    normalized = crm_slug.strip().lower()

    if not CRM_SLUG_PATTERN.fullmatch(
        normalized
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid CRM slug. Use only lowercase "
                "letters, numbers, and single hyphens."
            ),
        )

    return normalized


def resolve_crm_client(
    crm_slug: str,
    db: Session,
) -> Client:
    """
    Resolve a CRM tenant using its public CRM slug.

    Public URL:

        https://crm.abhinava.site/{crm_slug}

    The slug identifies the tenant.

    The slug itself does NOT grant authorization.
    Subsequent phases will apply account,
    subscription, payment, and authenticated-user
    authorization checks.
    """

    if not crm_slug:
        raise HTTPException(
            status_code=400,
            detail="CRM tenant slug is required.",
        )

    normalized_slug = validate_crm_slug(
        crm_slug
    )

    client = (
        db.query(Client)
        .filter(
            Client.crm_slug
            == normalized_slug
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No CRM tenant was found "
                "for this URL."
            ),
        )

    return client

def require_crm_access(
    db: Session,
    client: Client,
):
    entitlement = calculate_client_entitlement(
        db=db,
        client=client,
    )

    if not entitlement.access_allowed:
        reason_messages = {
            "ACCOUNT_DISABLED": (
                "This CRM account is currently disabled."
            ),
            "FIREBASE_NOT_READY": (
                "This CRM tenant is not ready."
            ),
            "NO_ACTIVE_SUBSCRIPTION": (
                "This CRM account does not have an active subscription."
            ),
            "SUBSCRIPTION_NOT_STARTED": (
                "This CRM subscription has not started yet."
            ),
            "SUBSCRIPTION_EXPIRED": (
                "This CRM subscription has expired."
            ),
        }

        detail = reason_messages.get(
            entitlement.access_reason,
            "CRM access is currently unavailable.",
        )

        raise HTTPException(
            status_code=403,
            detail=detail,
        )

    if not entitlement.firebase_ready:
        raise HTTPException(
            status_code=409,
            detail="CRM tenant Firebase connection is not ready.",
        )

    return entitlement