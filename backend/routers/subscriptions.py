from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Client,
    SubscriptionPlan,
    SubscriptionPlanModule,
    ClientSubscription,
    ClientSubscriptionModule,
    Invoice,
    InvoiceLineItem,
    PlatformAuditEvent,
)

from services.platform_dependencies import (
    get_current_platform_user,
)

from models import PlatformUser

from schemas import (
    SubscriptionModuleCreate,
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
    SubscriptionModuleResponse,
    ClientSubscriptionCreate,
    ClientSubscriptionResponse,
    ClientSubscriptionChangeRequest,
)



router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"],
)


# ============================================================
# CONSTANTS
# ============================================================

BASIC_PLAN = "BASIC"
PRO_PLAN = "PRO"

VALID_BILLING_CYCLES = {
    "monthly",
    "annual",
}

DEFAULT_TAX_RATE = Decimal("18.00")


# ============================================================
# HELPERS
# ============================================================

def normalize_main_plan(value: str) -> str:

    value = value.strip().upper()

    if value not in {
        BASIC_PLAN,
        PRO_PLAN,
    }:
        raise HTTPException(
            status_code=400,
            detail="main_plan must be BASIC or PRO",
        )

    return value


def normalize_currency(value: str) -> str:

    value = value.strip().upper()

    if len(value) != 3:
        raise HTTPException(
            status_code=400,
            detail="currency must be a 3-letter currency code",
        )

    return value


def normalize_billing_cycle(value: str) -> str:

    value = value.strip().lower()

    if value not in VALID_BILLING_CYCLES:
        raise HTTPException(
            status_code=400,
            detail="billing_cycle must be monthly or annual",
        )

    return value


def normalize_modules(
    modules: list[SubscriptionModuleCreate],
    main_plan: str,
) -> list[SubscriptionModuleCreate]:

    main_plan = normalize_main_plan(main_plan)

    module_map: dict[
        str,
        SubscriptionModuleCreate
    ] = {}

    for module in modules:

        key = module.module_key.strip().lower()

        if not key:
            continue

        if key in module_map:
            continue

        module_map[key] = SubscriptionModuleCreate(
            module_key=key,
            module_name=module.module_name.strip(),
        )

    # --------------------------------------------------------
    # BASIC cannot use ML Analytics
    # --------------------------------------------------------

    if (
        main_plan == BASIC_PLAN
        and "ml_analytics" in module_map
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "ML Analytics is available only "
                "for the PRO plan"
            ),
        )

    parent_modules = {
        "stock",
        "investments",
        "kareegar",
    }

    # --------------------------------------------------------
    # STOCK
    # --------------------------------------------------------

    if "stock" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = (
                SubscriptionModuleCreate(
                    module_key="customers",
                    module_name="Customer Directory",
                )
            )

        if "invoicing" not in module_map:
            module_map["invoicing"] = (
                SubscriptionModuleCreate(
                    module_key="invoicing",
                    module_name="Invoicing",
                )
            )

    # --------------------------------------------------------
    # INVESTMENTS
    # --------------------------------------------------------

    if "investments" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = (
                SubscriptionModuleCreate(
                    module_key="customers",
                    module_name="Customer Directory",
                )
            )

    # --------------------------------------------------------
    # KAREEGAR
    # --------------------------------------------------------

    if "kareegar" in module_map:

        if "customers" not in module_map:
            module_map["customers"] = (
                SubscriptionModuleCreate(
                    module_key="customers",
                    module_name="Customer Directory",
                )
            )

    # --------------------------------------------------------
    # INVOICING REQUIRES STOCK
    # --------------------------------------------------------

    if (
        "invoicing" in module_map
        and "stock" not in module_map
    ):
        raise HTTPException(
            status_code=400,
            detail="Invoicing requires Stock / Inventory",
        )

    # --------------------------------------------------------
    # WHATSAPP
    # --------------------------------------------------------

    if "whatsapp" in module_map:

        if not any(
            key in module_map
            for key in {
                "stock",
                "investments",
                "kareegar",
            }
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "WhatsApp requires Stock, "
                    "Investments, or Kareegar"
                ),
            )

    # --------------------------------------------------------
    # CUSTOMERS CANNOT BE STANDALONE
    # --------------------------------------------------------

    if "customers" in module_map:

        if not any(
            parent in module_map
            for parent in parent_modules
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Customer Directory cannot be "
                    "selected as a standalone module"
                ),
            )

    return sorted(
        module_map.values(),
        key=lambda module: module.module_key,
    )


def serialize_plan(
    plan: SubscriptionPlan,
) -> dict:

    modules = (
        plan.modules
        if hasattr(plan, "modules")
        else []
    )

    return {
        "id": plan.id,
        "name": plan.name,
        "main_plan": plan.main_plan,
        "description": plan.description,
        "monthly_price": plan.monthly_price,
        "annual_price": plan.annual_price,
        "currency": plan.currency,
        "is_active": plan.is_active,
        "modules": [
            {
                "id": module.id,
                "module_key": module.module_key,
                "module_name": module.module_name,
            }
            for module in modules
        ],
    }


def get_plan_modules(
    db: Session,
    plan_id: int,
) -> list[SubscriptionPlanModule]:

    return (
        db.query(SubscriptionPlanModule)
        .filter(
            SubscriptionPlanModule.subscription_plan_id
            == plan_id
        )
        .order_by(
            SubscriptionPlanModule.id.asc()
        )
        .all()
    )

def require_subscription_admin(
    platform_user: PlatformUser,
) -> None:
    """
    Subscription administration is restricted to
    Abhinava OWNER and ADMIN platform users.
    """

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to manage subscriptions."
            ),
        )
# ============================================================
# CREATE PLAN
# ============================================================

@router.post(
    "/plans",
    response_model=SubscriptionPlanResponse,
)
def create_subscription_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)
    main_plan = normalize_main_plan(
        payload.main_plan
    )

    currency = normalize_currency(
        payload.currency
    )

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

    plan = SubscriptionPlan(
        name=payload.name.strip(),
        main_plan=main_plan,
        description=payload.description,
        monthly_price=payload.monthly_price,
        annual_price=payload.annual_price,
        currency=currency,
        is_active=True,
    )

    db.add(plan)
    db.flush()

    for module in modules:

        db.add(
            SubscriptionPlanModule(
                subscription_plan_id=plan.id,
                module_key=module.module_key,
                module_name=module.module_name,
            )
        )

    db.commit()
    db.refresh(plan)

    modules = get_plan_modules(
        db,
        plan.id,
    )

    return {
        "id": plan.id,
        "name": plan.name,
        "main_plan": plan.main_plan,
        "description": plan.description,
        "monthly_price": plan.monthly_price,
        "annual_price": plan.annual_price,
        "currency": plan.currency,
        "is_active": plan.is_active,
        "modules": modules,
    }


# ============================================================
# LIST PLANS
# ============================================================

@router.get(
    "/plans",
    response_model=list[SubscriptionPlanResponse],
)
def list_subscription_plans(
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

    plans = (
        db.query(SubscriptionPlan)
        .order_by(
            SubscriptionPlan.id.asc()
        )
        .all()
    )

    result = []

    for plan in plans:

        modules = get_plan_modules(
            db,
            plan.id,
        )

        result.append(
            {
                "id": plan.id,
                "name": plan.name,
                "main_plan": plan.main_plan,
                "description": plan.description,
                "monthly_price": plan.monthly_price,
                "annual_price": plan.annual_price,
                "currency": plan.currency,
                "is_active": plan.is_active,
                "modules": modules,
            }
        )

    return result


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
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)
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

    modules = get_plan_modules(
        db,
        plan.id,
    )

    return {
        "id": plan.id,
        "name": plan.name,
        "main_plan": plan.main_plan,
        "description": plan.description,
        "monthly_price": plan.monthly_price,
        "annual_price": plan.annual_price,
        "currency": plan.currency,
        "is_active": plan.is_active,
        "modules": modules,
    }


# ============================================================
# UPDATE PLAN
# ============================================================

@router.patch(
    "/plans/{plan_id}",
    response_model=SubscriptionPlanResponse,
)
def update_subscription_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

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

    # --------------------------------------------------------
    # Name
    # --------------------------------------------------------

    if payload.name is not None:

        new_name = payload.name.strip()

        duplicate = (
            db.query(SubscriptionPlan)
            .filter(
                SubscriptionPlan.name.ilike(
                    new_name
                ),
                SubscriptionPlan.id != plan_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Subscription plan already exists",
            )

        plan.name = new_name

    # --------------------------------------------------------
    # Main plan
    # --------------------------------------------------------

    if payload.main_plan is not None:

        plan.main_plan = normalize_main_plan(
            payload.main_plan
        )

    # --------------------------------------------------------
    # Validate modules against final plan type
    # --------------------------------------------------------

    existing_modules = get_plan_modules(
        db,
        plan.id,
    )

    requested_modules = payload.modules

    if requested_modules is not None:

        normalized_modules = normalize_modules(
            requested_modules,
            plan.main_plan,
        )

        db.query(
            SubscriptionPlanModule
        ).filter(
            SubscriptionPlanModule.subscription_plan_id
            == plan.id
        ).delete(
            synchronize_session=False
        )

        for module in normalized_modules:

            db.add(
                SubscriptionPlanModule(
                    subscription_plan_id=plan.id,
                    module_key=module.module_key,
                    module_name=module.module_name,
                )
            )

    else:

        # Revalidate current modules if main_plan changed.
        if payload.main_plan is not None:

            current_modules = [
                SubscriptionModuleCreate(
                    module_key=module.module_key,
                    module_name=module.module_name,
                )
                for module in existing_modules
            ]

            normalized_modules = normalize_modules(
                current_modules,
                plan.main_plan,
            )

            if {
                m.module_key
                for m in normalized_modules
            } != {
                m.module_key
                for m in current_modules
            }:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Changing the main plan would "
                        "make the existing module "
                        "configuration invalid. "
                        "Update the modules as well."
                    ),
                )

    # --------------------------------------------------------
    # Description
    # --------------------------------------------------------

    if payload.description is not None:
        plan.description = payload.description

    # --------------------------------------------------------
    # Prices
    # --------------------------------------------------------

    if payload.monthly_price is not None:
        plan.monthly_price = payload.monthly_price

    if payload.annual_price is not None:
        plan.annual_price = payload.annual_price

    if payload.currency is not None:
        plan.currency = normalize_currency(
            payload.currency
        )

    # --------------------------------------------------------
    # Active status
    # --------------------------------------------------------

    if payload.is_active is not None:
        plan.is_active = payload.is_active

    db.commit()
    db.refresh(plan)

    modules = get_plan_modules(
        db,
        plan.id,
    )

    return {
        "id": plan.id,
        "name": plan.name,
        "main_plan": plan.main_plan,
        "description": plan.description,
        "monthly_price": plan.monthly_price,
        "annual_price": plan.annual_price,
        "currency": plan.currency,
        "is_active": plan.is_active,
        "modules": modules,
    }


# ============================================================
# DELETE PLAN
# ============================================================

@router.delete(
    "/plans/{plan_id}"
)
def delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

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

    existing_subscription = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.subscription_plan_id
            == plan_id
        )
        .first()
    )

    if existing_subscription:
        raise HTTPException(
            status_code=400,
            detail=(
                "This subscription plan is already "
                "assigned to a client and cannot be deleted. "
                "Deactivate it instead."
            ),
        )

    db.query(
        SubscriptionPlanModule
    ).filter(
        SubscriptionPlanModule.subscription_plan_id
        == plan_id
    ).delete(
        synchronize_session=False
    )

    db.delete(plan)
    db.commit()

    return {
        "message": (
            "Subscription plan deleted successfully"
        ),
        "plan_id": plan_id,
    }


# ============================================================
# RESOLVE SUBSCRIPTION PRICE
# ============================================================

@router.get(
    "/resolve"
)
def resolve_subscription(
    subscription_plan_id: int,
    billing_cycle: str,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

    billing_cycle = normalize_billing_cycle(
        billing_cycle
    )

    plan = (
        db.query(SubscriptionPlan)
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
            detail=(
                "Subscription plan not found "
                "or inactive"
            ),
        )

    if billing_cycle == "monthly":
        selected_price = plan.monthly_price
    else:
        selected_price = plan.annual_price

    modules = get_plan_modules(
        db,
        plan.id,
    )

    return {
        "subscription_plan": {
            "id": plan.id,
            "name": plan.name,
            "main_plan": plan.main_plan,
        },

        "billing_cycle": billing_cycle,

        "currency": plan.currency,

        "price_before_tax": selected_price,

        "tax_rate": DEFAULT_TAX_RATE,

        "modules": [
            {
                "key": module.module_key,
                "name": module.module_name,
            }
            for module in modules
        ],
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
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

    billing_cycle = normalize_billing_cycle(
        payload.billing_cycle
    )

    # --------------------------------------------------------
    # Client
    # --------------------------------------------------------

    client = (
        db.query(Client)
        .filter(
            Client.id == payload.client_id
        )
        .first()
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    # --------------------------------------------------------
    # Plan
    # --------------------------------------------------------

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
            detail=(
                "Subscription plan not found "
                "or inactive"
            ),
        )

    # --------------------------------------------------------
    # Prevent duplicate active subscriptions
    # --------------------------------------------------------

    existing_active = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.client_id
            == payload.client_id,
            ClientSubscription.status
            == "ACTIVE",
        )
        .first()
    )

    if existing_active:
        raise HTTPException(
            status_code=400,
            detail=(
                "Client already has an active subscription. "
                "Use the upgrade/change-plan flow instead."
            ),
        )

    # --------------------------------------------------------
    # Select price
    # --------------------------------------------------------

    if billing_cycle == "monthly":

        price_before_tax = Decimal(
            str(plan.monthly_price)
        )

        if payload.start_date.month == 12:

            end_date = date(
                payload.start_date.year + 1,
                1,
                payload.start_date.day,
            )

        else:

            # Handle month-end dates safely.
            next_month = (
                payload.start_date.month + 1
            )

            try:

                end_date = date(
                    payload.start_date.year,
                    next_month,
                    payload.start_date.day,
                )

            except ValueError:

                # Example:
                # Jan 31 -> Feb 28/29
                if next_month == 2:

                    if (
                        payload.start_date.year % 4 == 0
                        and (
                            payload.start_date.year % 100 != 0
                            or payload.start_date.year % 400 == 0
                        )
                    ):
                        last_day = 29
                    else:
                        last_day = 28

                    end_date = date(
                        payload.start_date.year,
                        2,
                        last_day,
                    )

                else:

                    end_date = date(
                        payload.start_date.year,
                        next_month,
                        30,
                    )

    else:

        price_before_tax = Decimal(
            str(plan.annual_price)
        )

        try:

            end_date = date(
                payload.start_date.year + 1,
                payload.start_date.month,
                payload.start_date.day,
            )

        except ValueError:

            # Feb 29 -> Feb 28
            end_date = date(
                payload.start_date.year + 1,
                2,
                28,
            )

    # --------------------------------------------------------
    # Tax
    # --------------------------------------------------------

    tax_rate = DEFAULT_TAX_RATE

    tax_amount = (
        price_before_tax
        * tax_rate
        / Decimal("100")
    ).quantize(
        Decimal("0.01")
    )

    total_amount = (
        price_before_tax
        + tax_amount
    ).quantize(
        Decimal("0.01")
    )

    # --------------------------------------------------------
    # Create subscription
    # --------------------------------------------------------

    subscription = ClientSubscription(
        client_id=client.id,

        subscription_plan_id=plan.id,

        main_plan=plan.main_plan,

        subscription_name=plan.name,

        billing_cycle=billing_cycle,

        start_date=payload.start_date,

        end_date=end_date,

        status="ACTIVE",

        currency=plan.currency,

        price_before_tax=price_before_tax,

        tax_rate=tax_rate,

        tax_amount=tax_amount,

        total_amount=total_amount,
    )

    db.add(subscription)
    db.flush()

    # --------------------------------------------------------
    # Snapshot modules
    # --------------------------------------------------------

    plan_modules = get_plan_modules(
        db,
        plan.id,
    )

    for module in plan_modules:

        db.add(
            ClientSubscriptionModule(
                client_subscription_id=subscription.id,
                module_key=module.module_key,
                module_name=module.module_name,
            )
        )

    db.commit()
    db.refresh(subscription)

    # --------------------------------------------------------
    # Update legacy Client fields
    # --------------------------------------------------------

    client.plan = plan.main_plan
    client.billing_cycle = billing_cycle
    client.subscription_status = "ACTIVE"
    client.start_date = str(
        payload.start_date
    )

    client.modules = {
        module.module_key: True
        for module in plan_modules
    }

    db.commit()

    return subscription

# ============================================================
# CHANGE CLIENT SUBSCRIPTION / PLAN
# ============================================================

@router.post(
    "/client-subscriptions/{client_id}/change-plan",
)
def change_client_subscription_plan(
    client_id: int,
    payload: ClientSubscriptionChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    # ========================================================
    # PLATFORM AUTHORIZATION
    # ========================================================

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to change client subscriptions."
            ),
        )

    # ========================================================
    # CLIENT
    # ========================================================

    client = (
        db.query(Client)
        .filter(
            Client.id == client_id
        )
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    # ========================================================
    # CURRENT ACTIVE SUBSCRIPTION
    # ========================================================

    current_subscription = (
        db.query(ClientSubscription)
        .filter(
            ClientSubscription.client_id == client_id,
            ClientSubscription.status == "ACTIVE",
        )
        .order_by(
            ClientSubscription.id.desc()
        )
        .first()
    )

    if current_subscription is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Client does not have an active subscription. "
                "Create the initial subscription first."
            ),
        )

    # ========================================================
    # NEW PLAN
    # ========================================================

    new_plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id
            == payload.subscription_plan_id,
            SubscriptionPlan.is_active.is_(True),
        )
        .first()
    )

    if new_plan is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Subscription plan not found "
                "or inactive."
            ),
        )

    # ========================================================
    # BILLING CYCLE
    # ========================================================

    billing_cycle = normalize_billing_cycle(
        payload.billing_cycle
    )

    # ========================================================
    # PREVENT NO-OP CHANGE
    # ========================================================

    if (
        current_subscription.subscription_plan_id
        == new_plan.id
        and current_subscription.billing_cycle
        == billing_cycle
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "The client is already subscribed "
                "to this plan and billing cycle."
            ),
        )

    # ========================================================
    # EFFECTIVE DATE
    # ========================================================

    effective_date = (
        payload.effective_date
        or date.today()
    )

    today = date.today()

    if effective_date != today:
        raise HTTPException(
            status_code=400,
            detail=(
                "Plan changes must be effective today. "
                "Scheduled future plan changes are not supported yet."
            ),
        )

    # ========================================================
    # PRICE
    # ========================================================

    if billing_cycle == "monthly":
        price_before_tax = Decimal(
            str(new_plan.monthly_price)
        )
    else:
        price_before_tax = Decimal(
            str(new_plan.annual_price)
        )

    price_before_tax = money(
        price_before_tax
    )

    # ========================================================
    # CURRENCY
    # ========================================================

    currency = (
        new_plan.currency
        or "INR"
    ).strip().upper()

    if len(currency) != 3:
        raise HTTPException(
            status_code=400,
            detail=(
                "Subscription plan currency "
                "must be a 3-letter code."
            ),
        )

    # ========================================================
    # MODULES
    # ========================================================

    modules = normalize_modules(
        [
            SubscriptionModuleCreate(
                module_key=module.module_key,
                module_name=module.module_name,
            )
            for module in get_plan_modules(
                db,
                new_plan.id,
            )
        ],
        new_plan.main_plan,
    )

    module_snapshot = [
        {
            "module_key": module.module_key,
            "module_name": module.module_name,
        }
        for module in modules
    ]

    # ========================================================
    # TAX
    # ========================================================

    tax_rate = DEFAULT_TAX_RATE

    tax_amount = money(
        price_before_tax
        * tax_rate
        / Decimal("100")
    )

    total_amount = money(
        price_before_tax
        + tax_amount
    )

    # ========================================================
    # NEW SUBSCRIPTION PERIOD
    # ========================================================

    end_date = calculate_subscription_dates(
        effective_date,
        billing_cycle,
    )

    # ========================================================
    # CAPTURE OLD STATE BEFORE CHANGING IT
    # ========================================================

    old_modules = (
        db.query(ClientSubscriptionModule)
        .filter(
            ClientSubscriptionModule.client_subscription_id
            == current_subscription.id
        )
        .order_by(
            ClientSubscriptionModule.id.asc()
        )
        .all()
    )

    old_module_snapshot = [
        {
            "module_key": module.module_key,
            "module_name": module.module_name,
        }
        for module in old_modules
    ]

    old_plan_id = (
        current_subscription.subscription_plan_id
    )

    old_plan_name = (
        current_subscription.subscription_name
    )

    old_main_plan = (
        current_subscription.main_plan
    )

    old_billing_cycle = (
        current_subscription.billing_cycle
    )

    old_subscription_id = (
        current_subscription.id
    )

    # ========================================================
    # CREATE NEW SUBSCRIPTION VERSION
    # ========================================================

    new_subscription = ClientSubscription(
        client_id=client.id,

        subscription_plan_id=new_plan.id,

        main_plan=new_plan.main_plan,

        subscription_name=new_plan.name,

        billing_cycle=billing_cycle,

        start_date=effective_date,

        end_date=end_date,

        status="ACTIVE",

        currency=currency,

        price_before_tax=price_before_tax,

        tax_rate=tax_rate,

        tax_amount=tax_amount,

        total_amount=total_amount,
    )

    db.add(new_subscription)
    db.flush()

    # ========================================================
    # CREATE NEW MODULE SNAPSHOT
    # ========================================================

    for module in modules:

        db.add(
            ClientSubscriptionModule(
                client_subscription_id=(
                    new_subscription.id
                ),
                module_key=module.module_key,
                module_name=module.module_name,
            )
        )

    # ========================================================
    # CREATE NEW INVOICE
    # ========================================================

    invoice_number = generate_invoice_number()

    # Determine the invoice type from the price change.
    old_total_amount = money(
        current_subscription.total_amount
    )

    if total_amount > old_total_amount:
        invoice_type = "UPGRADE"
    elif total_amount < old_total_amount:
        invoice_type = "DOWNGRADE"
    else:
        invoice_type = "ADJUSTMENT"

    new_invoice = Invoice(
        client_id=client.id,
        client_subscription_id=new_subscription.id,

        invoice_number=invoice_number,

        invoice_date=date.today(),
        due_date=effective_date,

        period_start=new_subscription.start_date,
        period_end=new_subscription.end_date,

        invoice_type=invoice_type,
        status="ISSUED",

        currency=currency,

        subtotal=price_before_tax,
        discount_amount=Decimal("0.00"),

        tax_rate=tax_rate,
        tax_amount=tax_amount,

        total_amount=total_amount,

        notes=(
            f"Subscription plan change from "
            f"{old_plan_name} to {new_plan.name}."
        ),

        pdf_path=None,
    )

    db.add(new_invoice)
    db.flush()


    # ========================================================
    # INVOICE LINE ITEM
    # ========================================================

    db.add(
        InvoiceLineItem(
            invoice_id=new_invoice.id,

            description=(
                f"{new_plan.name} — "
                f"{billing_cycle.title()} "
                f"Subscription"
            ),

            quantity=Decimal("1.00"),

            unit_price=price_before_tax,

            amount=price_before_tax,
        )
    )

    # ========================================================
    # CLOSE OLD SUBSCRIPTION
    # ========================================================

    current_subscription.status = "CANCELLED"

    # ========================================================
    # UPDATE LEGACY CLIENT SNAPSHOT
    # ========================================================

    client.plan = new_plan.main_plan

    client.billing_cycle = billing_cycle

    client.subscription_status = "ACTIVE"

    client.start_date = str(
        effective_date
    )

    client.modules = {
        module["module_key"]: True
        for module in module_snapshot
    }

    # ========================================================
    # AUDIT EVENT
    # ========================================================

    audit_event = PlatformAuditEvent(
        event_type="CLIENT_SUBSCRIPTION_CHANGED",

        outcome="SUCCESS",

        actor_platform_user_id=platform_user.id,

        actor_identity=platform_user.email,

        target_type="CLIENT_SUBSCRIPTION",

        target_id=str(
            new_subscription.id
        ),

        client_id=client.id,

        tenant_id=client.tenant_id,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=(
            request.headers.get(
                "user-agent"
            )
        ),

        event_metadata={
            "change_type": "PLAN_CHANGE",

            "reason": payload.reason,

            "effective_date": str(
                effective_date
            ),

            "old": {
                "subscription_id": old_subscription_id,
                "plan_id": old_plan_id,
                "plan_name": old_plan_name,
                "main_plan": old_main_plan,
                "billing_cycle": old_billing_cycle,
                "modules": old_module_snapshot,
            },

            "new": {
                "subscription_id": new_subscription.id,
                "plan_id": new_plan.id,
                "plan_name": new_plan.name,
                "main_plan": new_plan.main_plan,
                "billing_cycle": billing_cycle,
                "modules": module_snapshot,
                "price_before_tax": str(
                    price_before_tax
                ),
                "tax_rate": str(
                    tax_rate
                ),
                "tax_amount": str(
                    tax_amount
                ),
                "total_amount": str(
                    total_amount
                ),
            },

            "invoice": {
                "id": new_invoice.id,
                "invoice_number": (
                    new_invoice.invoice_number
                ),
                "invoice_date": str(
                    new_invoice.invoice_date
                ),
                "status": new_invoice.status,
                "currency": new_invoice.currency,
                "subtotal": str(
                    new_invoice.subtotal
                ),
                "tax_amount": str(
                    new_invoice.tax_amount
                ),
                "total_amount": str(
                    new_invoice.total_amount
                ),
            },
        },
    )

    db.add(audit_event)

    # ========================================================
    # COMMIT AS ONE TRANSACTION
    # ========================================================

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Subscription change failed. "
                "No subscription, invoice, module, "
                "client, or audit changes were saved."
            ),
        ) from exc

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "message": (
            "Client subscription changed successfully."
        ),

        "client": {
            "id": client.id,
            "business_name": client.business_name,
            "plan": client.plan,
            "billing_cycle": client.billing_cycle,
            "subscription_status": (
                client.subscription_status
            ),
        },

        "previous_subscription": {
            "id": old_subscription_id,
            "plan_id": old_plan_id,
            "plan_name": old_plan_name,
            "main_plan": old_main_plan,
            "billing_cycle": old_billing_cycle,
            "status": "CANCELLED",
        },

        "subscription": {
            "id": new_subscription.id,
            "plan_id": new_plan.id,
            "plan_name": new_plan.name,
            "main_plan": new_plan.main_plan,
            "billing_cycle": billing_cycle,
            "start_date": new_subscription.start_date,
            "end_date": new_subscription.end_date,
            "status": new_subscription.status,
            "currency": new_subscription.currency,
            "price_before_tax": (
                new_subscription.price_before_tax
            ),
            "tax_rate": new_subscription.tax_rate,
            "tax_amount": new_subscription.tax_amount,
            "total_amount": new_subscription.total_amount,
        },

        "modules": module_snapshot,

        "invoice": {
            "id": new_invoice.id,
            "invoice_number": (
                new_invoice.invoice_number
            ),
            "invoice_date": new_invoice.invoice_date,
            "status": new_invoice.status,
            "currency": new_invoice.currency,
            "subtotal": new_invoice.subtotal,
            "tax_rate": new_invoice.tax_rate,
            "tax_amount": new_invoice.tax_amount,
            "total_amount": new_invoice.total_amount,
        },

        "audit": {
            "event_type": (
                "CLIENT_SUBSCRIPTION_CHANGED"
            ),
            "actor": platform_user.email,
        },
    }
# ============================================================
# LIST CLIENT SUBSCRIPTIONS
# ============================================================

@router.get(
    "/client-subscriptions/{client_id}",
    response_model=list[ClientSubscriptionResponse],
)
def list_client_subscriptions(
    client_id: int,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    require_subscription_admin(platform_user)

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