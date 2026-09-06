from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import (
    CityTier,
    TurnoverBand,
    SubscriptionPlan,
    SubscriptionPlanModule,
    SubscriptionPlanPrice,
    PlatformUser,
)
from schemas import (
    CityTierCreate,
    CityTierUpdate,
    CityTierResponse,
    TurnoverBandCreate,
    TurnoverBandUpdate,
    TurnoverBandResponse,
    SubscriptionModuleCreate,
    SubscriptionPlanPriceCreate,
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionModuleResponse,
    SubscriptionPlanPriceResponse,
    SubscriptionPlanResponse,
    ClientSubscriptionCreate,
    ClientSubscriptionResponse,
)


router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"],
)


# ============================================================
# Helpers
# ============================================================

BASIC_PLAN = "BASIC"
PRO_PLAN = "PRO"

VALID_BILLING_CYCLES = {"monthly", "annual"}


def normalize_main_plan(value: str) -> str:
    value = value.strip().upper()

    if value not in {BASIC_PLAN, PRO_PLAN}:
        raise HTTPException(
            status_code=400,
            detail="main_plan must be BASIC or PRO",
        )

    return value


def normalize_modules(
    modules: list[SubscriptionModuleCreate],
    main_plan: str,
) -> list[SubscriptionModuleCreate]:

    main_plan = normalize_main_plan(main_plan)

    module_map: dict[str, SubscriptionModuleCreate] = {}

    for module in modules:
        key = module.module_key.strip().lower()

        if key in module_map:
            continue

        module_map[key] = SubscriptionModuleCreate(
            module_key=key,
            module_name=module.module_name.strip(),
        )

    # --------------------------------------------------------
    # BASIC cannot use ML Analytics
    # --------------------------------------------------------

    if main_plan == BASIC_PLAN and "ml_analytics" in module_map:
        raise HTTPException(
            status_code=400,
            detail="ML Analytics is available only for the PRO plan",
        )

    # --------------------------------------------------------
    # Customers cannot exist independently
    # --------------------------------------------------------

    parent_modules = {
        "stock",
        "investments",
        "kareegar",
    }

    # --------------------------------------------------------
    # Stock automatically includes Customers + Invoicing
    # --------------------------------------------------------

    if "stock" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = SubscriptionModuleCreate(
                module_key="customers",
                module_name="Customer Directory",
            )

        if "invoicing" not in module_map:
            module_map["invoicing"] = SubscriptionModuleCreate(
                module_key="invoicing",
                module_name="Invoicing",
            )

    # --------------------------------------------------------
    # Investments automatically includes Customers
    # --------------------------------------------------------

    if "investments" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = SubscriptionModuleCreate(
                module_key="customers",
                module_name="Customer Directory",
            )

    # --------------------------------------------------------
    # Kareegar automatically includes Customers
    # --------------------------------------------------------

    if "kareegar" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = SubscriptionModuleCreate(
                module_key="customers",
                module_name="Customer Directory",
            )

    # --------------------------------------------------------
    # Invoicing requires Stock
    # --------------------------------------------------------

    if "invoicing" in module_map and "stock" not in module_map:
        raise HTTPException(
            status_code=400,
            detail="Invoicing requires Stock / Inventory",
        )

    # --------------------------------------------------------
    # WhatsApp requires a business module
    # --------------------------------------------------------

    if "whatsapp" in module_map:

        allowed_parents = {
            "stock",
            "investments",
            "kareegar",
        }

        if not any(key in module_map for key in allowed_parents):
            raise HTTPException(
                status_code=400,
                detail=(
                    "WhatsApp requires Stock, Investments, "
                    "or Kareegar"
                ),
            )

    # --------------------------------------------------------
    # Remove standalone Customers
    # --------------------------------------------------------

    if "customers" in module_map:

        if not any(
            parent in module_map
            for parent in parent_modules
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Customer Directory cannot be selected "
                    "as a standalone module"
                ),
            )

    return list(module_map.values())


def serialize_plan(plan: SubscriptionPlan) -> dict:

    modules = sorted(
        plan.modules,
        key=lambda module: module.module_key,
    )

    prices = sorted(
        plan.prices,
        key=lambda price: (
            price.city_tier_id,
            price.turnover_band_id,
        ),
    )

    return {
        "id": plan.id,
        "name": plan.name,
        "main_plan": plan.main_plan,
        "description": plan.description,
        "is_active": plan.is_active,

        "modules": [
            {
                "id": module.id,
                "module_key": module.module_key,
                "module_name": module.module_name,
            }
            for module in modules
        ],

        "prices": [
            {
                "id": price.id,
                "city_tier_id": price.city_tier_id,
                "turnover_band_id": price.turnover_band_id,
                "monthly_price": price.monthly_price,
                "annual_price": price.annual_price,
                "currency": price.currency,
            }
            for price in prices
        ],
    }


# ============================================================
# CITY TIERS
# ============================================================

@router.post(
    "/city-tiers",
    response_model=CityTierResponse,
)
def create_city_tier(
    payload: CityTierCreate,
    db: Session = Depends(get_db),
):

    existing = (
        db.query(CityTier)
        .filter(CityTier.name.ilike(payload.name.strip()))
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="City tier already exists",
        )

    tier = CityTier(
        name=payload.name.strip(),
        description=payload.description,
        is_active=True,
    )

    db.add(tier)
    db.commit()
    db.refresh(tier)

    return tier


@router.get(
    "/city-tiers",
    response_model=list[CityTierResponse],
)
def list_city_tiers(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):

    query = db.query(CityTier)

    if not include_inactive:
        query = query.filter(
            CityTier.is_active.is_(True)
        )

    return query.order_by(CityTier.id).all()


@router.patch(
    "/city-tiers/{city_tier_id}",
    response_model=CityTierResponse,
)
def update_city_tier(
    city_tier_id: int,
    payload: CityTierUpdate,
    db: Session = Depends(get_db),
):

    tier = (
        db.query(CityTier)
        .filter(CityTier.id == city_tier_id)
        .first()
    )

    if not tier:
        raise HTTPException(
            status_code=404,
            detail="City tier not found",
        )

    if payload.name is not None:

        duplicate = (
            db.query(CityTier)
            .filter(
                CityTier.name.ilike(payload.name.strip()),
                CityTier.id != city_tier_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Another city tier already has this name",
            )

        tier.name = payload.name.strip()

    if payload.description is not None:
        tier.description = payload.description

    if payload.is_active is not None:
        tier.is_active = payload.is_active

    db.commit()
    db.refresh(tier)

    return tier


# ============================================================
# TURNOVER BANDS
# ============================================================

@router.post(
    "/turnover-bands",
    response_model=TurnoverBandResponse,
)
def create_turnover_band(
    payload: TurnoverBandCreate,
    db: Session = Depends(get_db),
):

    if payload.min_turnover < 0:
        raise HTTPException(
            status_code=400,
            detail="Minimum turnover cannot be negative",
        )

    if (
        payload.max_turnover is not None
        and payload.max_turnover <= payload.min_turnover
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Maximum turnover must be greater "
                "than minimum turnover"
            ),
        )

    existing = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.name.ilike(
                payload.name.strip()
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Turnover band already exists",
        )

    band = TurnoverBand(
        name=payload.name.strip(),
        min_turnover=payload.min_turnover,
        max_turnover=payload.max_turnover,
        description=payload.description,
        is_active=True,
    )

    db.add(band)
    db.commit()
    db.refresh(band)

    return band


@router.get(
    "/turnover-bands",
    response_model=list[TurnoverBandResponse],
)
def list_turnover_bands(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):

    query = db.query(TurnoverBand)

    if not include_inactive:
        query = query.filter(
            TurnoverBand.is_active.is_(True)
        )

    return (
        query
        .order_by(TurnoverBand.min_turnover)
        .all()
    )


@router.patch(
    "/turnover-bands/{turnover_band_id}",
    response_model=TurnoverBandResponse,
)
def update_turnover_band(
    turnover_band_id: int,
    payload: TurnoverBandUpdate,
    db: Session = Depends(get_db),
):

    band = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.id == turnover_band_id
        )
        .first()
    )

    if not band:
        raise HTTPException(
            status_code=404,
            detail="Turnover band not found",
        )

    new_min = (
        payload.min_turnover
        if payload.min_turnover is not None
        else band.min_turnover
    )

    new_max = (
        payload.max_turnover
        if payload.max_turnover is not None
        else band.max_turnover
    )

    if new_min < 0:
        raise HTTPException(
            status_code=400,
            detail="Minimum turnover cannot be negative",
        )

    if new_max is not None and new_max <= new_min:
        raise HTTPException(
            status_code=400,
            detail=(
                "Maximum turnover must be greater "
                "than minimum turnover"
            ),
        )

    if payload.name is not None:

        duplicate = (
            db.query(TurnoverBand)
            .filter(
                TurnoverBand.name.ilike(
                    payload.name.strip()
                ),
                TurnoverBand.id != turnover_band_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Another turnover band already has this name",
            )

        band.name = payload.name.strip()

    if payload.min_turnover is not None:
        band.min_turnover = payload.min_turnover

    if payload.max_turnover is not None:
        band.max_turnover = payload.max_turnover

    if payload.description is not None:
        band.description = payload.description

    if payload.is_active is not None:
        band.is_active = payload.is_active

    db.commit()
    db.refresh(band)

    return band


# ============================================================
# PLAN CREATION
# ============================================================

@router.post(
    "/plans",
    response_model=SubscriptionPlanResponse,
)
def create_subscription_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
):

    main_plan = normalize_main_plan(payload.main_plan)

    existing = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.name.ilike(
                payload.name.strip()
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Subscription plan already exists",
        )

    modules = normalize_modules(
        payload.modules,
        main_plan,
    )

    # --------------------------------------------------------
    # Validate prices
    # --------------------------------------------------------

    seen_price_combinations = set()

    for price in payload.prices:

        key = (
            price.city_tier_id,
            price.turnover_band_id,
        )

        if key in seen_price_combinations:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Duplicate pricing combination for "
                    "city tier and turnover band"
                ),
            )

        seen_price_combinations.add(key)

        city_tier = (
            db.query(CityTier)
            .filter(
                CityTier.id == price.city_tier_id,
                CityTier.is_active.is_(True),
            )
            .first()
        )

        if not city_tier:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"City tier {price.city_tier_id} "
                    "not found or inactive"
                ),
            )

        turnover_band = (
            db.query(TurnoverBand)
            .filter(
                TurnoverBand.id == price.turnover_band_id,
                TurnoverBand.is_active.is_(True),
            )
            .first()
        )

        if not turnover_band:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Turnover band "
                    f"{price.turnover_band_id} "
                    "not found or inactive"
                ),
            )

    # --------------------------------------------------------
    # Create plan
    # --------------------------------------------------------

    plan = SubscriptionPlan(
        name=payload.name.strip(),
        main_plan=main_plan,
        description=payload.description,
        is_active=True,
    )

    db.add(plan)
    db.flush()

    # --------------------------------------------------------
    # Modules
    # --------------------------------------------------------

    for module in modules:

        db.add(
            SubscriptionPlanModule(
                subscription_plan_id=plan.id,
                module_key=module.module_key,
                module_name=module.module_name,
            )
        )

    # --------------------------------------------------------
    # Pricing matrix
    #
    # PLAN + CITY TIER + TURNOVER BAND
    # --------------------------------------------------------

    for price in payload.prices:

        db.add(
            SubscriptionPlanPrice(
                subscription_plan_id=plan.id,
                city_tier_id=price.city_tier_id,
                turnover_band_id=price.turnover_band_id,
                monthly_price=price.monthly_price,
                annual_price=price.annual_price,
                currency=price.currency.upper(),
            )
        )

    db.commit()

    plan = (
        db.query(SubscriptionPlan)
        .options(
            selectinload(
                SubscriptionPlan.modules
            ),
            selectinload(
                SubscriptionPlan.prices
            ),
        )
        .filter(SubscriptionPlan.id == plan.id)
        .first()
    )

    return serialize_plan(plan)


# ============================================================
# PLAN LIST
# ============================================================

@router.get(
    "/plans",
    response_model=list[SubscriptionPlanResponse],
)
def list_subscription_plans(
    include_inactive: bool = False,
    main_plan: str | None = None,
    db: Session = Depends(get_db),
):

    query = (
        db.query(SubscriptionPlan)
        .options(
            selectinload(
                SubscriptionPlan.modules
            ),
            selectinload(
                SubscriptionPlan.prices
            ),
        )
    )

    if not include_inactive:
        query = query.filter(
            SubscriptionPlan.is_active.is_(True)
        )

    if main_plan:
        query = query.filter(
            SubscriptionPlan.main_plan
            == normalize_main_plan(main_plan)
        )

    plans = (
        query
        .order_by(SubscriptionPlan.id)
        .all()
    )

    return [
        serialize_plan(plan)
        for plan in plans
    ]


# ============================================================
# GET SINGLE PLAN
# ============================================================

@router.get(
    "/plans/{plan_id}",
    response_model=SubscriptionPlanResponse,
)
def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):

    plan = (
        db.query(SubscriptionPlan)
        .options(
            selectinload(
                SubscriptionPlan.modules
            ),
            selectinload(
                SubscriptionPlan.prices
            ),
        )
        .filter(
            SubscriptionPlan.id == plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found",
        )

    return serialize_plan(plan)


# ============================================================
# PLAN UPDATE
# ============================================================

@router.patch(
    "/plans/{plan_id}",
    response_model=SubscriptionPlanResponse,
)
def update_subscription_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
):

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found",
        )

    if payload.name is not None:

        duplicate = (
            db.query(SubscriptionPlan)
            .filter(
                SubscriptionPlan.name.ilike(
                    payload.name.strip()
                ),
                SubscriptionPlan.id != plan_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Another subscription plan already has this name",
            )

        plan.name = payload.name.strip()

    if payload.main_plan is not None:
        plan.main_plan = normalize_main_plan(
            payload.main_plan
        )

    if payload.description is not None:
        plan.description = payload.description

    if payload.is_active is not None:
        plan.is_active = payload.is_active

    db.commit()

    plan = (
        db.query(SubscriptionPlan)
        .options(
            selectinload(
                SubscriptionPlan.modules
            ),
            selectinload(
                SubscriptionPlan.prices
            ),
        )
        .filter(
            SubscriptionPlan.id == plan_id
        )
        .first()
    )

    return serialize_plan(plan)


# ============================================================
# RESOLVE PRICING
# ============================================================

@router.get("/resolve")
def resolve_subscription(
    subscription_plan_id: int,
    city_tier_id: int,
    turnover_band_id: int,
    billing_cycle: str,
    db: Session = Depends(get_db),
):

    billing_cycle = billing_cycle.strip().lower()

    if billing_cycle not in VALID_BILLING_CYCLES:
        raise HTTPException(
            status_code=400,
            detail="billing_cycle must be monthly or annual",
        )

    # --------------------------------------------------------
    # Plan
    # --------------------------------------------------------

    plan = (
        db.query(SubscriptionPlan)
        .options(
            selectinload(
                SubscriptionPlan.modules
            )
        )
        .filter(
            SubscriptionPlan.id
            == subscription_plan_id,
            SubscriptionPlan.is_active.is_(True),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found or inactive",
        )

    # --------------------------------------------------------
    # City tier
    # --------------------------------------------------------

    tier = (
        db.query(CityTier)
        .filter(
            CityTier.id == city_tier_id,
            CityTier.is_active.is_(True),
        )
        .first()
    )

    if not tier:
        raise HTTPException(
            status_code=404,
            detail="City tier not found or inactive",
        )

    # --------------------------------------------------------
    # Turnover band
    # --------------------------------------------------------

    turnover_band = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.id == turnover_band_id,
            TurnoverBand.is_active.is_(True),
        )
        .first()
    )

    if not turnover_band:
        raise HTTPException(
            status_code=404,
            detail="Turnover band not found or inactive",
        )

    # --------------------------------------------------------
    # Pricing matrix lookup
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

    if not price:
        raise HTTPException(
            status_code=404,
            detail=(
                "No pricing configured for this "
                "plan, city tier and turnover band"
            ),
        )

    if billing_cycle == "monthly":
        selected_price = price.monthly_price
    else:
        selected_price = price.annual_price

    modules = [
        {
            "key": module.module_key,
            "name": module.module_name,
        }
        for module in plan.modules
    ]

    return {
        "subscription_plan": {
            "id": plan.id,
            "name": plan.name,
            "main_plan": plan.main_plan,
        },

        "city_tier": {
            "id": tier.id,
            "name": tier.name,
        },

        "turnover_band": {
            "id": turnover_band.id,
            "name": turnover_band.name,
            "min_turnover": turnover_band.min_turnover,
            "max_turnover": turnover_band.max_turnover,
        },

        "billing_cycle": billing_cycle,

        "currency": price.currency,

        "price_before_tax": selected_price,

        "tax_rate": Decimal("18"),

        "modules": modules,
    }


# ============================================================
# CREATE CLIENT SUBSCRIPTION
# ============================================================

@router.post(
    "/client-subscriptions",
    response_model=ClientSubscriptionResponse,
)
def create_client_subscription(
    payload: ClientSubscriptionCreate,
    db: Session = Depends(get_db),
):

    if payload.billing_cycle.lower() not in VALID_BILLING_CYCLES:
        raise HTTPException(
            status_code=400,
            detail="billing_cycle must be monthly or annual",
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id
            == payload.subscription_plan_id,
            SubscriptionPlan.is_active.is_(True),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found or inactive",
        )

    tier = (
        db.query(CityTier)
        .filter(
            CityTier.id == payload.city_tier_id,
            CityTier.is_active.is_(True),
        )
        .first()
    )

    if not tier:
        raise HTTPException(
            status_code=404,
            detail="City tier not found or inactive",
        )

    turnover_band = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.id == payload.turnover_band_id,
            TurnoverBand.is_active.is_(True),
        )
        .first()
    )

    if not turnover_band:
        raise HTTPException(
            status_code=404,
            detail="Turnover band not found or inactive",
        )

    price = (
        db.query(SubscriptionPlanPrice)
        .filter(
            SubscriptionPlanPrice.subscription_plan_id
            == payload.subscription_plan_id,
            SubscriptionPlanPrice.city_tier_id
            == payload.city_tier_id,
            SubscriptionPlanPrice.turnover_band_id
            == payload.turnover_band_id,
        )
        .first()
    )

    if not price:
        raise HTTPException(
            status_code=404,
            detail=(
                "No pricing configured for this "
                "plan, city tier and turnover band"
            ),
        )

    billing_cycle = payload.billing_cycle.lower()

    if billing_cycle == "monthly":
        price_before_tax = Decimal(price.monthly_price)
        end_date = date(
            payload.start_date.year
            + (
                1
                if payload.start_date.month == 12
                else 0
            ),
            (
                1
                if payload.start_date.month == 12
                else payload.start_date.month + 1
            ),
            payload.start_date.day,
        )
    else:
        price_before_tax = Decimal(price.annual_price)

        try:
            end_date = date(
                payload.start_date.year + 1,
                payload.start_date.month,
                payload.start_date.day,
            )
        except ValueError:
            # Feb 29 subscription
            end_date = date(
                payload.start_date.year + 1,
                2,
                28,
            )

    tax_rate = Decimal("18")
    tax_amount = (
        price_before_tax * tax_rate / Decimal("100")
    ).quantize(Decimal("0.01"))

    total_amount = (
        price_before_tax + tax_amount
    ).quantize(Decimal("0.01"))

    subscription = ClientSubscription(
        client_id=payload.client_id,
        subscription_plan_id=payload.subscription_plan_id,
        city_tier_id=payload.city_tier_id,
        turnover_band_id=payload.turnover_band_id,
        billing_cycle=billing_cycle,
        start_date=payload.start_date,
        end_date=end_date,
        status="active",
        currency=price.currency,
        price_before_tax=price_before_tax,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return subscription


# ============================================================
# LIST CLIENT SUBSCRIPTIONS
# ============================================================

@router.get(
    "/client-subscriptions/{client_id}",
)
def list_client_subscriptions(
    client_id: int,
    db: Session = Depends(get_db),
):

    subscriptions = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.client_id
            == client_id
        )
        .order_by(
            ClientSubscription.start_date.desc()
        )
        .all()
    )

    return subscriptions