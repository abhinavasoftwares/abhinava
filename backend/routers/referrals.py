from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    PlatformUser,
    ReferralCode,
)
from schemas import (
    ReferralCodeCreate,
    ReferralCodeUpdate,
    ReferralCodeResponse,
    ReferralValidationResponse,
)
from services.platform_dependencies import (
    get_current_platform_user,
)


router = APIRouter(
    prefix="/referrals",
    tags=["Referral Codes"],
)


# ============================================================
# DATABASE
# ============================================================


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# PLATFORM ADMIN AUTHORIZATION
# ============================================================


def require_platform_admin(
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
                "to manage referral codes."
            ),
        )

    return platform_user


# ============================================================
# HELPERS
# ============================================================


def normalize_code(value: str) -> str:
    return value.strip().upper()


def validate_discount_definition(
    discount_type: str,
    discount_value: Decimal,
):
    normalized_type = (
        discount_type.strip().upper()
    )

    if normalized_type not in {
        "PERCENTAGE",
        "FIXED",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "discount_type must be "
                "PERCENTAGE or FIXED."
            ),
        )

    value = Decimal(discount_value)

    if value <= 0:
        raise HTTPException(
            status_code=400,
            detail="Discount value must be greater than zero.",
        )

    if (
        normalized_type == "PERCENTAGE"
        and value > 100
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Percentage discount cannot "
                "exceed 100%."
            ),
        )

    return normalized_type, value


def calculate_discount(
    *,
    discount_type: str,
    discount_value: Decimal,
    base_price: Decimal,
) -> Decimal:
    base_price = Decimal(base_price)

    if base_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Base price cannot be negative.",
        )

    if discount_type == "PERCENTAGE":
        amount = (
            base_price
            * discount_value
            / Decimal("100")
        )
    else:
        amount = discount_value

    amount = amount.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    return min(
        max(amount, Decimal("0.00")),
        base_price,
    )


def ensure_valid_dates(
    valid_from,
    valid_until,
):
    if (
        valid_from
        and valid_until
        and valid_until < valid_from
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "valid_until cannot be earlier "
                "than valid_from."
            ),
        )


def ensure_code_usable(
    referral: ReferralCode,
):
    if not referral.is_active:
        raise HTTPException(
            status_code=400,
            detail="Referral code is inactive.",
        )

    today = date.today()

    if (
        referral.valid_from
        and today < referral.valid_from
    ):
        raise HTTPException(
            status_code=400,
            detail="Referral code is not active yet.",
        )

    if (
        referral.valid_until
        and today > referral.valid_until
    ):
        raise HTTPException(
            status_code=400,
            detail="Referral code has expired.",
        )

    if (
        referral.max_uses is not None
        and referral.used_count >= referral.max_uses
    ):
        raise HTTPException(
            status_code=400,
            detail="Referral code usage limit has been reached.",
        )


# ============================================================
# LIST
# ============================================================


@router.get(
    "",
)
def list_referral_codes(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _: PlatformUser = Depends(
        require_platform_admin
    ),
):
    query = db.query(ReferralCode)

    if not include_inactive:
        query = query.filter(
            ReferralCode.is_active.is_(True)
        )

    codes = (
        query
        .order_by(
            ReferralCode.created_at.desc()
        )
        .all()
    )

    return {
        "referral_codes": [
            {
                "id": item.id,
                "code": item.code,
                "description": item.description,
                "discount_type": item.discount_type,
                "discount_value": item.discount_value,
                "max_uses": item.max_uses,
                "used_count": item.used_count,
                "valid_from": item.valid_from,
                "valid_until": item.valid_until,
                "is_active": item.is_active,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in codes
        ]
    }


# ============================================================
# CREATE
# ============================================================


@router.post(
    "",
    response_model=ReferralCodeResponse,
)
def create_referral_code(
    payload: ReferralCodeCreate,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        require_platform_admin
    ),
):
    code = normalize_code(payload.code)

    existing = (
        db.query(ReferralCode)
        .filter(
            ReferralCode.code == code
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                "A referral code with this "
                "code already exists."
            ),
        )

    discount_type, discount_value = (
        validate_discount_definition(
            payload.discount_type,
            payload.discount_value,
        )
    )

    ensure_valid_dates(
        payload.valid_from,
        payload.valid_until,
    )

    referral = ReferralCode(
        code=code,
        description=(
            payload.description.strip()
            if payload.description
            else None
        ),
        discount_type=discount_type,
        discount_value=discount_value,
        max_uses=payload.max_uses,
        used_count=0,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        is_active=True,
        created_by_platform_user_id=platform_user.id,
    )

    db.add(referral)
    db.commit()
    db.refresh(referral)

    return referral


# ============================================================
# UPDATE
# ============================================================


@router.patch(
    "/{referral_code_id}",
    response_model=ReferralCodeResponse,
)
def update_referral_code(
    referral_code_id: int,
    payload: ReferralCodeUpdate,
    db: Session = Depends(get_db),
    _: PlatformUser = Depends(
        require_platform_admin
    ),
):
    referral = (
        db.query(ReferralCode)
        .filter(
            ReferralCode.id
            == referral_code_id
        )
        .first()
    )

    if referral is None:
        raise HTTPException(
            status_code=404,
            detail="Referral code not found.",
        )

    if payload.discount_type is not None:
        discount_type = (
            payload.discount_type
            .strip()
            .upper()
        )
    else:
        discount_type = (
            referral.discount_type
        )

    if payload.discount_value is not None:
        discount_value = Decimal(
            payload.discount_value
        )
    else:
        discount_value = (
            referral.discount_value
        )

    validate_discount_definition(
        discount_type,
        discount_value,
    )

    valid_from = (
        payload.valid_from
        if payload.valid_from is not None
        else referral.valid_from
    )

    valid_until = (
        payload.valid_until
        if payload.valid_until is not None
        else referral.valid_until
    )

    ensure_valid_dates(
        valid_from,
        valid_until,
    )

    if payload.description is not None:
        referral.description = (
            payload.description.strip()
            or None
        )

    referral.discount_type = (
        discount_type
    )

    referral.discount_value = (
        discount_value
    )

    if payload.max_uses is not None:
        if (
            payload.max_uses
            < referral.used_count
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Maximum uses cannot be "
                    "less than current usage."
                ),
            )

        referral.max_uses = (
            payload.max_uses
        )

    referral.valid_from = valid_from
    referral.valid_until = valid_until

    if payload.is_active is not None:
        referral.is_active = (
            payload.is_active
        )

    db.commit()
    db.refresh(referral)

    return referral


# ============================================================
# VALIDATE
# ============================================================


@router.get(
    "/validate",
    response_model=ReferralValidationResponse,
)
def validate_referral_code(
    code: str = Query(
        min_length=1,
        max_length=50,
    ),
    subscription_plan_id: int = Query(
        gt=0,
    ),
    city_tier_id: int = Query(
        gt=0,
    ),
    turnover_band_id: int = Query(
        gt=0,
    ),
    billing_cycle: str = Query(
        min_length=1,
        max_length=20,
    ),
    db: Session = Depends(get_db),
    _: PlatformUser = Depends(
        require_platform_admin
    ),
):
    from models import (
        SubscriptionPlan,
        SubscriptionPlanPrice,
        CityTier,
        TurnoverBand,
    )

    normalized_code = normalize_code(code)

    # --------------------------------------------------------
    # FIND REFERRAL CODE
    # --------------------------------------------------------

    referral = (
        db.query(ReferralCode)
        .filter(
            ReferralCode.code
            == normalized_code
        )
        .first()
    )

    if referral is None:
        raise HTTPException(
            status_code=404,
            detail="Invalid referral code.",
        )

    ensure_code_usable(referral)

    # --------------------------------------------------------
    # VALIDATE PLAN
    # --------------------------------------------------------

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id
            == subscription_plan_id,
            SubscriptionPlan.is_active.is_(True),
        )
        .first()
    )

    if plan is None:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found.",
        )

    # --------------------------------------------------------
    # VALIDATE CITY TIER
    # --------------------------------------------------------

    city_tier = (
        db.query(CityTier)
        .filter(
            CityTier.id == city_tier_id,
            CityTier.is_active.is_(True),
        )
        .first()
    )

    if city_tier is None:
        raise HTTPException(
            status_code=404,
            detail="City tier not found.",
        )

    # --------------------------------------------------------
    # VALIDATE TURNOVER BAND
    # --------------------------------------------------------

    turnover_band = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.id
            == turnover_band_id,
            TurnoverBand.is_active.is_(True),
        )
        .first()
    )

    if turnover_band is None:
        raise HTTPException(
            status_code=404,
            detail="Turnover band not found.",
        )

    # --------------------------------------------------------
    # FIND EXACT PRICING MATRIX ENTRY
    #
    # Plan + City Tier + Turnover Band
    # --------------------------------------------------------

    price = (
        db.query(SubscriptionPlanPrice)
        .filter(
            SubscriptionPlanPrice.subscription_plan_id
            == subscription_plan_id,
            SubscriptionPlanPrice.city_tier_id
            == city_tier_id,
            SubscriptionPlanPrice.turnover_band_id
            == turnover_band_id,
        )
        .first()
    )

    if price is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No pricing configuration exists "
                "for this plan, city tier and "
                "turnover band."
            ),
        )

    # --------------------------------------------------------
    # BILLING CYCLE
    # --------------------------------------------------------

    cycle = (
        billing_cycle.strip().lower()
    )

    if cycle == "monthly":
        base_price = price.monthly_price

    elif cycle == "annual":
        base_price = price.annual_price

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "billing_cycle must be "
                "monthly or annual."
            ),
        )

    # --------------------------------------------------------
    # CALCULATE DISCOUNT
    # --------------------------------------------------------

    discount_amount = calculate_discount(
        discount_type=referral.discount_type,
        discount_value=referral.discount_value,
        base_price=base_price,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "valid": True,
        "code": referral.code,
        "discount_type": referral.discount_type,
        "discount_value": referral.discount_value,
        "discount_amount": discount_amount,
        "message": (
            f"Referral code applied. "
            f"Discount: ₹{discount_amount:,.2f}"
        ),
    }