import os
import resend

from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP

from typing import Any

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Request,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from routers.platform_auth import router as platform_auth_router
from routers.subscriptions import router as subscriptions_router
from routers.referrals import router as referrals_router

from database import SessionLocal

from models import (
    Client,
    PlatformUser,
    SubscriptionPlan,
    SubscriptionPlanModule,
    SubscriptionPlanPrice,
    CityTier,
    TurnoverBand,
    ClientSubscription,
    ClientSubscriptionModule,
    Invoice,
    InvoiceLineItem,
    ReferralCode,
    ReferralCodeRedemption,
)

from schemas import (
    ClientCreate,
    FirebaseConnectionRequest,
)

from services.crm_tenant import resolve_crm_client

from services.tenant_connection import (
    verify_existing_firebase_project,
    _get_connection_session,
)

from services.platform_dependencies import (
    get_current_platform_user,
)

from services.tenant_provisioning import (
    provision_tenant,
    _get_google_session,
    _get_firebase_web_app_config,
)


app = FastAPI(title="Abhinava API")


app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["ABHINAVA_AUTH_TRANSACTION_SECRET"],
    https_only=True,
    same_site="lax",
)


app.include_router(platform_auth_router)
app.include_router(subscriptions_router)
app.include_router(referrals_router)



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Codespace
        "https://sturdy-train-77rj957xr4pp2x675-5173.app.github.dev",
        "https://sturdy-train-77rj957xr4pp2x675-5174.app.github.dev",

        # Windows local development
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# CRM TENANT CONFIGURATION
# ============================================================


@app.get("/crm/tenant")
def get_crm_tenant(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Return the CRM tenant configuration.

    Tenant resolution is handled centrally by
    resolve_crm_client().
    """

    client = resolve_crm_client(
        request=request,
        db=db,
    )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not connected."
            ),
        )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail="CRM tenant is not ready.",
        )

    return {
        "client_id": client.id,
        "tenant_id": client.tenant_id,
        "business_name": client.business_name,
        "logo_url": client.logo_url,
        "firebase_project_id": client.firebase_project_id,
        "firebase_web_app_id": client.firebase_web_app_id,
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}

# ============================================================
# ADMIN DASHBOARD
# ============================================================

@app.get("/admin/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
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
            detail="You do not have permission to view the admin dashboard.",
        )

    # --------------------------------------------------------
    # DATABASE HEALTH
    # --------------------------------------------------------

    database_status = "OPERATIONAL"

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "ERROR"

    # --------------------------------------------------------
    # CLIENTS
    # --------------------------------------------------------

    clients = (
        db.query(Client)
        .order_by(Client.id.desc())
        .all()
    )

    total_clients = len(clients)

    # --------------------------------------------------------
    # SUBSCRIPTIONS
    # --------------------------------------------------------

    active_subscriptions = sum(
        1
        for client in clients
        if str(client.subscription_status or "").upper()
        in {
            "ACTIVE",
            "TRIAL",
        }
    )

    # --------------------------------------------------------
    # FIREBASE / TENANT PROVISIONING
    # --------------------------------------------------------

    ready_count = sum(
        1
        for client in clients
        if str(client.firebase_provisioning_status or "").upper()
        == "READY"
    )

    failed_count = sum(
        1
        for client in clients
        if str(client.firebase_provisioning_status or "").upper()
        in {
            "FAILED",
            "ERROR",
        }
    )

    pending_count = total_clients - ready_count - failed_count

    # --------------------------------------------------------
    # ACTIVE TENANTS
    #
    # For now, an active tenant means:
    # subscription is ACTIVE/TRIAL
    # AND Firebase provisioning is READY.
    # --------------------------------------------------------

    active_tenants = sum(
        1
        for client in clients
        if (
            str(client.subscription_status or "").upper()
            in {
                "ACTIVE",
                "TRIAL",
            }
            and
            str(client.firebase_provisioning_status or "").upper()
            == "READY"
        )
    )

    # --------------------------------------------------------
    # CLIENT RESPONSE
    # --------------------------------------------------------

    client_rows = []

    for client in clients:
        provisioning_status = (
            str(
                client.firebase_provisioning_status
                or "PENDING"
            )
            .upper()
        )

        if provisioning_status == "READY":
            display_status = "Ready"
        elif provisioning_status in {"FAILED", "ERROR"}:
            display_status = "Failed"
        else:
            display_status = "Provisioning"

        client_rows.append(
            {
                "id": client.id,
                "business_name": client.business_name,
                "tenant_id": client.tenant_id,
                "modules": client.modules or [],
                "plan": client.plan,
                "subscription_status": (
                    client.subscription_status
                ),
                "provisioning_status": provisioning_status,
                "display_status": display_status,
                "firebase_project_id": (
                    client.firebase_project_id
                ),
                "firebase_web_app_id": (
                    client.firebase_web_app_id
                ),
                "provisioning_error": (
                    client.firebase_provisioning_error
                ),
                "created_at": (
                    client.created_at.isoformat()
                    if client.created_at
                    else None
                ),
                "updated_at": (
                    client.updated_at.isoformat()
                    if client.updated_at
                    else None
                ),
            }
        )

    # --------------------------------------------------------
    # RETURN DASHBOARD SNAPSHOT
    # --------------------------------------------------------

    return {
        "status": "ok",

        "stats": {
            "total_clients": total_clients,
            "active_tenants": active_tenants,
            "provisioning_ready": ready_count,
            "provisioning_pending": pending_count,
            "provisioning_failed": failed_count,
            "active_subscriptions": active_subscriptions,
        },

        "health": {
            "api": "OPERATIONAL",
            "database": database_status,
            "authentication": "OPERATIONAL",
        },

        "clients": client_rows,
    }

# ============================================================
# CLIENT ONBOARDING HELPERS
# ============================================================


GST_RATE = Decimal("18.00")


def money(value: Any) -> Decimal:
    """
    Convert a value to INR-safe two-decimal Decimal.
    """
    return Decimal(str(value)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def calculate_referral_discount(
    referral: ReferralCode,
    base_price: Decimal,
) -> Decimal:
    """
    Calculate the referral discount without allowing
    the discount to exceed the subscription price.
    """

    base_price = money(base_price)

    if referral.discount_type == "PERCENTAGE":
        discount = (
            base_price
            * Decimal(referral.discount_value)
            / Decimal("100")
        )
    else:
        discount = Decimal(referral.discount_value)

    discount = money(discount)

    return min(
        max(discount, Decimal("0.00")),
        base_price,
    )


def calculate_subscription_dates(
    start_date: date,
    billing_cycle: str,
):
    """
    Calculate subscription end date safely.

    Monthly subscriptions handle month-end dates correctly.
    Example:
        31 January -> 28/29 February
    """

    cycle = billing_cycle.strip().lower()

    if cycle not in {
        "monthly",
        "annual",
    }:
        raise HTTPException(
            status_code=400,
            detail="billing_cycle must be monthly or annual.",
        )

    if cycle == "annual":
        try:
            end_date = start_date.replace(
                year=start_date.year + 1
            )
        except ValueError:
            # February 29 -> February 28
            end_date = start_date.replace(
                year=start_date.year + 1,
                day=28,
            )

        return end_date

    # Monthly
    if start_date.month == 12:
        next_year = start_date.year + 1
        next_month = 1
    else:
        next_year = start_date.year
        next_month = start_date.month + 1

    last_day = monthrange(
        next_year,
        next_month,
    )[1]

    return date(
        next_year,
        next_month,
        min(start_date.day, last_day),
    )


def normalize_subscription_modules(
    plan: SubscriptionPlan,
):
    """
    Read the modules configured on the selected plan.

    The subscription plan in PostgreSQL is authoritative.
    The frontend cannot grant itself modules.
    """

    modules = []

    seen = set()

    for module in plan.modules:
        key = module.module_key.strip().lower()

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)

        modules.append(
            {
                "module_key": key,
                "module_name": module.module_name,
            }
        )

    return modules


def generate_invoice_number() -> str:
    """
    Generate a unique human-readable invoice number.
    """

    timestamp = datetime.utcnow().strftime(
        "%Y%m%d%H%M%S%f"
    )

    return f"ABH-{timestamp}"


def send_welcome_email(
    *,
    client: Client,
    subscription: ClientSubscription,
    invoice: Invoice,
    modules: list[dict],
):
    """
    Send the client welcome email through Resend.

    Email failure does NOT roll back the completed
    client onboarding transaction.
    """

    api_key = os.getenv("RESEND_API_KEY")

    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "welcome@abhinava.site",
    )

    from_name = os.getenv(
        "RESEND_FROM_NAME",
        "Abhinava",
    )

    frontend_url = os.getenv(
        "ABHINAVA_FRONTEND_URL",
        "http://localhost:5173",
    )

    demo_video_url = os.getenv(
        "ABHINAVA_DEMO_VIDEO_URL",
        "",
    )

    # --------------------------------------------------------
    # Resend API key not configured
    # --------------------------------------------------------

    if not api_key:
        return {
            "status": "NOT_CONFIGURED",
            "message": (
                "RESEND_API_KEY is not configured. "
                "Client onboarding was completed."
            ),
        }

    # --------------------------------------------------------
    # Modules
    # --------------------------------------------------------

    module_items = "".join(
        f"""
        <li style="
            margin-bottom:8px;
            color:#374151;
        ">
            {module["module_name"]}
        </li>
        """
        for module in modules
    )

    # --------------------------------------------------------
    # Demo video
    # --------------------------------------------------------

    demo_section = ""

    if demo_video_url:
        demo_section = f"""
        <div style="
            margin-top:30px;
            padding:20px;
            background:#f8fafc;
            border-radius:12px;
        ">
            <h3 style="
                margin-top:0;
                color:#111827;
            ">
                Getting Started
            </h3>

            <p style="
                color:#4b5563;
                line-height:1.6;
            ">
                Watch our introduction and demo video
                to get familiar with Abhinava.
            </p>

            <a
                href="{demo_video_url}"
                style="
                    display:inline-block;
                    padding:12px 20px;
                    background:#111827;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:600;
                "
            >
                Watch Demo
            </a>
        </div>
        """

    # --------------------------------------------------------
    # HTML email
    # --------------------------------------------------------

    html = f"""
<!DOCTYPE html>

<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>Welcome to Abhinava</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Arial,
        sans-serif;
">

    <div style="
        max-width:680px;
        margin:40px auto;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        box-shadow:
            0 10px 30px rgba(0,0,0,0.08);
    ">

        <!-- HEADER -->

        <div style="
            padding:32px;
            background:#111111;
            color:#ffffff;
        ">

            <div style="
                font-size:28px;
                font-weight:700;
                letter-spacing:-0.5px;
            ">
                Abhinava
            </div>

            <div style="
                margin-top:8px;
                color:#d1d5db;
                font-size:14px;
            ">
                Jewelry Business Management Platform
            </div>

        </div>


        <!-- CONTENT -->

        <div style="
            padding:40px 36px;
        ">

            <h1 style="
                margin-top:0;
                color:#111827;
                font-size:28px;
            ">
                Welcome to Abhinava,
                {client.owner_name}!
            </h1>


            <p style="
                color:#4b5563;
                font-size:16px;
                line-height:1.7;
            ">
                Your business workspace has been
                successfully onboarded to Abhinava.
            </p>


            <!-- BUSINESS -->

            <div style="
                margin-top:28px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:18px;
                    color:#111827;
                ">
                    Business
                </h2>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Business Name:</strong>
                    {client.business_name}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Legal Name:</strong>
                    {client.legal_business_name}
                </p>

            </div>


            <!-- SUBSCRIPTION -->

            <div style="
                margin-top:20px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:18px;
                    color:#111827;
                ">
                    Subscription
                </h2>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Plan:</strong>
                    {subscription.main_plan}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Subscription:</strong>
                    {subscription.subscription_name}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Billing:</strong>
                    {subscription.billing_cycle.title()}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Start Date:</strong>
                    {subscription.start_date}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>End Date:</strong>
                    {subscription.end_date}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Status:</strong>
                    {subscription.status}
                </p>

            </div>


            <!-- MODULES -->

            <div style="
                margin-top:20px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:18px;
                    color:#111827;
                ">
                    Your Modules
                </h2>

                <ul style="
                    padding-left:20px;
                    margin-bottom:0;
                ">
                    {module_items}
                </ul>

            </div>


            <!-- BILLING -->

            <div style="
                margin-top:20px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:18px;
                    color:#111827;
                ">
                    Billing
                </h2>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Invoice:</strong>
                    {invoice.invoice_number}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Subtotal:</strong>
                    ₹{invoice.subtotal:,.2f}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>
                        GST ({invoice.tax_rate}%):
                    </strong>
                    ₹{invoice.tax_amount:,.2f}
                </p>

                <div style="
                    margin-top:15px;
                    padding-top:15px;
                    border-top:1px solid #e5e7eb;
                ">

                    <p style="
                        margin:0;
                        font-size:20px;
                        font-weight:700;
                        color:#111827;
                    ">
                        Total:
                        ₹{invoice.total_amount:,.2f}
                    </p>

                </div>

            </div>


            <!-- WORKSPACE -->

            <div style="
                margin-top:20px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:18px;
                    color:#111827;
                ">
                    Your Workspace
                </h2>

                <p style="
                    color:#4b5563;
                    line-height:1.6;
                ">
                    Your Firebase workspace has been
                    successfully verified and connected.
                </p>

                <p style="
                    color:#4b5563;
                    line-height:1.6;
                ">
                    Abhinava works across:
                </p>

                <ul style="
                    color:#374151;
                    line-height:1.8;
                ">
                    <li>Desktop</li>
                    <li>Laptop</li>
                    <li>Tablet</li>
                    <li>Modern Android devices</li>
                    <li>Modern iPhone and iPad devices</li>
                </ul>

            </div>


            <!-- LOGIN -->

            <div style="
                margin-top:30px;
                text-align:center;
            ">

                <a
                    href="{frontend_url}"
                    style="
                        display:inline-block;
                        padding:14px 28px;
                        background:#111111;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:10px;
                        font-weight:600;
                        font-size:16px;
                    "
                >
                    Open Abhinava
                </a>

            </div>


            {demo_section}


            <p style="
                margin-top:35px;
                color:#6b7280;
                font-size:13px;
                line-height:1.6;
            ">
                Please do not share your authentication
                credentials with anyone.
            </p>

        </div>


        <!-- FOOTER -->

        <div style="
            padding:25px 36px;
            background:#f9fafb;
            border-top:1px solid #e5e7eb;
        ">

            <p style="
                margin:0;
                color:#6b7280;
                font-size:13px;
                text-align:center;
            ">
                © {datetime.utcnow().year}
                Abhinava.
                All rights reserved.
            </p>

            <p style="
                margin:8px 0 0;
                color:#9ca3af;
                font-size:12px;
                text-align:center;
            ">
                Jewelry Business Management Platform
            </p>

        </div>

    </div>

</body>
</html>
"""

    # --------------------------------------------------------
    # Send using Resend
    # --------------------------------------------------------

    try:

        resend.api_key = api_key

        params = {
            "from": (
                f"{from_name} "
                f"<{from_email}>"
            ),
            "to": [
                client.owner_email
            ],
            "subject": (
                f"Welcome to Abhinava — "
                f"{client.business_name}"
            ),
            "html": html,
        }

        result = resend.Emails.send(params)

        return {
            "status": "SENT",
            "message": (
                "Welcome email sent successfully."
            ),
            "email_id": (
                result.get("id")
                if isinstance(result, dict)
                else None
            ),
        }

    except Exception as exc:

        print(
            "Resend welcome email failed:",
            repr(exc),
        )

        return {
            "status": "FAILED",
            "message": (
                "Client onboarding completed, "
                "but the welcome email could not "
                "be sent."
            ),
        }
# ============================================================
# PLATFORM CLIENT MANAGEMENT
# ============================================================


@app.post("/clients")
def create_client(
    client: ClientCreate,
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
                "to create clients."
            ),
        )

    # ========================================================
    # BASIC INPUT
    # ========================================================

    project_id = (
        client.firebase_project_id.strip()
    )

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Firebase project ID is required.",
        )

    billing_cycle = (
        client.billing_cycle.strip().lower()
    )

    if billing_cycle not in {
        "monthly",
        "annual",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "billing_cycle must be "
                "monthly or annual."
            ),
        )

    # ========================================================
    # START DATE
    # ========================================================

    try:
        start_date = date.fromisoformat(
            client.start_date
        )

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail=(
                "start_date must be a valid "
                "YYYY-MM-DD date."
            ),
        )

    # ========================================================
    # STEP 1 — VERIFY FIREBASE
    # ========================================================

    try:
        verification = (
            verify_existing_firebase_project(
                project_id
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase project verification failed: "
                f"{exc}"
            ),
        )

    project = verification["project"]
    web_app = verification["web_app"]

    # ========================================================
    # STEP 2 — LOAD SUBSCRIPTION PLAN
    # ========================================================

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id
            == client.subscription_plan_id,
            SubscriptionPlan.is_active.is_(True),
        )
        .first()
    )

    if plan is None:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found or inactive.",
        )

    main_plan = (
        plan.main_plan.strip().upper()
    )

    if main_plan not in {
        "BASIC",
        "PRO",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid main plan configuration."
            ),
        )

    # ========================================================
    # STEP 3 — CITY TIER
    # ========================================================

    city_tier = (
        db.query(CityTier)
        .filter(
            CityTier.id
            == client.city_tier_id,
            CityTier.is_active.is_(True),
        )
        .first()
    )

    if city_tier is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "City tier not found or inactive."
            ),
        )

    # ========================================================
    # STEP 4 — TURNOVER BAND
    # ========================================================

    turnover_band = (
        db.query(TurnoverBand)
        .filter(
            TurnoverBand.id
            == client.turnover_band_id,
            TurnoverBand.is_active.is_(True),
        )
        .first()
    )

    if turnover_band is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Turnover band not found or inactive."
            ),
        )

    # ========================================================
    # STEP 5 — RESOLVE PRICE
    # ========================================================

    price = (
        db.query(SubscriptionPlanPrice)
        .filter(
            SubscriptionPlanPrice.subscription_plan_id
            == plan.id,
            SubscriptionPlanPrice.city_tier_id
            == city_tier.id,
            SubscriptionPlanPrice.turnover_band_id
            == turnover_band.id,
        )
        .first()
    )

    if price is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No pricing configuration exists "
                "for the selected plan, city tier "
                "and turnover band."
            ),
        )

    if billing_cycle == "monthly":
        base_price = money(
            price.monthly_price
        )
    else:
        base_price = money(
            price.annual_price
        )

    if base_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Subscription price cannot be negative.",
        )

    # ========================================================
    # STEP 6 — AUTHORITATIVE MODULES
    # ========================================================

    modules = normalize_subscription_modules(
        plan
    )

    module_keys = {
        item["module_key"]
        for item in modules
    }

    # --------------------------------------------------------
    # Backend dependency validation
    # --------------------------------------------------------

    if "ml_analytics" in module_keys and main_plan != "PRO":
        raise HTTPException(
            status_code=400,
            detail=(
                "ML Analytics is available only "
                "on PRO plans."
            ),
        )

    if (
        "invoicing" in module_keys
        and "stock" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invoicing requires the Stock module."
            ),
        )

    if (
        "whatsapp" in module_keys
        and not (
            "stock" in module_keys
            or "investments" in module_keys
            or "kareegar" in module_keys
        )
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "WhatsApp requires Stock, "
                "Investments or Kareegar."
            ),
        )

    if (
        "stock" in module_keys
        and "customers" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Stock requires Customers."
            ),
        )

    if (
        "stock" in module_keys
        and "invoicing" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Stock requires Invoicing."
            ),
        )

    if (
        "investments" in module_keys
        and "customers" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Investments requires Customers."
            ),
        )

    if (
        "kareegar" in module_keys
        and "customers" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Kareegar requires Customers."
            ),
        )

    # ========================================================
    # STEP 7 — REFERRAL
    # ========================================================

    referral = None
    discount_amount = Decimal("0.00")

    referral_code = (
        client.referral_code.strip().upper()
        if client.referral_code
        else None
    )

    if referral_code:

        referral = (
            db.query(ReferralCode)
            .filter(
                ReferralCode.code
                == referral_code,
            )
            .with_for_update()
            .first()
        )

        if referral is None:
            raise HTTPException(
                status_code=404,
                detail="Invalid referral code.",
            )

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
                detail=(
                    "Referral code is not active yet."
                ),
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
            and referral.used_count
            >= referral.max_uses
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Referral code usage limit "
                    "has been reached."
                ),
            )

        discount_amount = (
            calculate_referral_discount(
                referral,
                base_price,
            )
        )

    # ========================================================
    # STEP 8 — FINAL PRICE
    # ========================================================

    taxable_amount = money(
        max(
            base_price - discount_amount,
            Decimal("0.00"),
        )
    )

    tax_amount = money(
        taxable_amount
        * GST_RATE
        / Decimal("100")
    )

    total_amount = money(
        taxable_amount + tax_amount
    )

    # ========================================================
    # STEP 9 — SUBSCRIPTION DATES
    # ========================================================

    end_date = calculate_subscription_dates(
        start_date,
        billing_cycle,
    )

    # ========================================================
    # STEP 10 — CREATE CLIENT
    # ========================================================

    new_client = Client(
        business_name=client.business_name,
        legal_business_name=client.legal_business_name,
        business_type=client.business_type,
        country=client.country,
        business_email=client.business_email,
        business_phone=client.business_phone,
        owner_name=client.owner_name,
        owner_email=client.owner_email,
        owner_phone=client.owner_phone,
        owner_role=client.owner_role,
        pan=client.pan,
        gstin=client.gstin,

        # ----------------------------------------------------
        # Keep these synchronized with the subscription.
        # ----------------------------------------------------

        plan=main_plan,
        billing_cycle=billing_cycle,
        subscription_status=client.subscription_status,
        start_date=client.start_date,

        domain=client.domain,

        modules={
            module["module_key"]: True
            for module in modules
        },

        # ----------------------------------------------------
        # Firebase
        # ----------------------------------------------------

        firebase_project_id=project["project_id"],
        firebase_web_app_id=web_app["app_id"],
        firebase_provisioning_status="READY",
        firebase_provisioning_error=None,
        firebase_provisioned_at=datetime.utcnow(),
    )

    db.add(new_client)
    db.flush()

    # ========================================================
    # STEP 11 — CREATE SUBSCRIPTION
    # ========================================================

    subscription = ClientSubscription(
        client_id=new_client.id,
        subscription_plan_id=plan.id,
        city_tier_id=city_tier.id,
        turnover_band_id=turnover_band.id,

        main_plan=main_plan,
        subscription_name=plan.name,
        billing_cycle=billing_cycle,

        start_date=start_date,
        end_date=end_date,

        status=(
            "ACTIVE"
            if client.subscription_status.strip().lower()
            == "active"
            else "PENDING"
        ),

        currency=price.currency,

        # IMPORTANT:
        # Store the final taxable subscription value.
        price_before_tax=taxable_amount,

        tax_rate=GST_RATE,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )

    db.add(subscription)
    db.flush()

    # ========================================================
    # STEP 12 — CREATE SUBSCRIPTION MODULES
    # ========================================================

    for module in modules:

        subscription_module = (
            ClientSubscriptionModule(
                client_subscription_id=subscription.id,
                module_key=module["module_key"],
                module_name=module["module_name"],
            )
        )

        db.add(subscription_module)

    # ========================================================
    # STEP 13 — CREATE INVOICE
    # ========================================================

    invoice_number = generate_invoice_number()

    invoice = Invoice(
        client_id=new_client.id,
        client_subscription_id=subscription.id,
        invoice_number=invoice_number,
        invoice_date=date.today(),

        status="ISSUED",
        currency=price.currency,

        subtotal=taxable_amount,
        tax_rate=GST_RATE,
        tax_amount=tax_amount,
        total_amount=total_amount,

        pdf_path=None,
    )

    db.add(invoice)
    db.flush()

    # --------------------------------------------------------
    # Invoice line item
    #
    # We intentionally keep the line item non-negative because
    # the database constraint requires amount >= 0.
    #
    # The referral discount is recorded separately through
    # ReferralCodeRedemption.
    # --------------------------------------------------------

    line_item = InvoiceLineItem(
        invoice_id=invoice.id,
        description=(
            f"{plan.name} — "
            f"{billing_cycle.title()} Subscription"
        ),
        quantity=Decimal("1.00"),
        unit_price=taxable_amount,
        amount=taxable_amount,
    )

    db.add(line_item)

    # ========================================================
    # STEP 14 — REFERRAL REDEMPTION
    # ========================================================

    if referral is not None:

        redemption = ReferralCodeRedemption(
            referral_code_id=referral.id,
            client_id=new_client.id,
            client_subscription_id=subscription.id,

            code_snapshot=referral.code,
            discount_type=referral.discount_type,
            discount_value=referral.discount_value,
            discount_amount=discount_amount,
        )

        db.add(redemption)

        referral.used_count += 1

    # ========================================================
    # STEP 15 — COMMIT EVERYTHING
    # ========================================================

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Client onboarding failed and "
                "all database changes were rolled back."
            ),
        ) from exc

    # ========================================================
    # STEP 16 — REFRESH
    # ========================================================

    db.refresh(new_client)
    db.refresh(subscription)
    db.refresh(invoice)

    # ========================================================
    # STEP 17 — WELCOME EMAIL
    #
    # IMPORTANT:
    # Email failure does NOT roll back onboarding.
    # ========================================================

    welcome_email = send_welcome_email(
        client=new_client,
        subscription=subscription,
        invoice=invoice,
        modules=modules,
    )

    # ========================================================
    # STEP 18 — RESPONSE
    # ========================================================

    return {
        "message": (
            "Client onboarding completed successfully."
        ),

        "client": {
            "id": new_client.id,
            "tenant_id": new_client.tenant_id,
            "business_name": new_client.business_name,
            "owner_email": new_client.owner_email,
            "plan": main_plan,
            "billing_cycle": billing_cycle,
            "status": (
                new_client.subscription_status
            ),
        },

        "firebase": {
            "project_id": (
                new_client.firebase_project_id
            ),
            "web_app_id": (
                new_client.firebase_web_app_id
            ),
            "status": (
                new_client.firebase_provisioning_status
            ),
            "verification": verification,
        },

        "subscription": {
            "id": subscription.id,
            "plan_id": plan.id,
            "plan_name": plan.name,
            "main_plan": main_plan,
            "city_tier_id": city_tier.id,
            "city_tier": city_tier.name,
            "turnover_band_id": turnover_band.id,
            "turnover_band": turnover_band.name,
            "billing_cycle": billing_cycle,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "status": subscription.status,
            "currency": subscription.currency,
            "price_before_tax": (
                subscription.price_before_tax
            ),
            "tax_rate": subscription.tax_rate,
            "tax_amount": subscription.tax_amount,
            "total_amount": subscription.total_amount,
        },

        "modules": modules,

        "referral": (
            {
                "code": referral.code,
                "discount_type": referral.discount_type,
                "discount_value": referral.discount_value,
                "discount_amount": discount_amount,
            }
            if referral
            else None
        ),

        "invoice": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date,
            "status": invoice.status,
            "currency": invoice.currency,
            "subtotal": invoice.subtotal,
            "tax_rate": invoice.tax_rate,
            "tax_amount": invoice.tax_amount,
            "total_amount": invoice.total_amount,
        },

        "welcome_email": welcome_email,
    }

@app.post("/clients/{client_id}/connect-firebase")
def connect_existing_firebase(
    client_id: int,
    connection: FirebaseConnectionRequest,
    db: Session = Depends(get_db),
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
                "to connect client Firebase."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    project_id = connection.firebase_project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Firebase project ID is required.",
        )

    try:
        verification = (
            verify_existing_firebase_project(
                project_id
            )
        )

    except Exception as exc:
        client.firebase_provisioning_status = (
            "FAILED"
        )

        client.firebase_provisioning_error = str(
            exc
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    project = verification["project"]
    web_app = verification["web_app"]

    client.firebase_project_id = (
        project["project_id"]
    )

    client.firebase_web_app_id = (
        web_app["app_id"]
    )

    client.firebase_provisioning_status = (
        "READY"
    )

    client.firebase_provisioning_error = None

    from datetime import datetime

    client.firebase_provisioned_at = (
        datetime.utcnow()
    )

    db.commit()
    db.refresh(client)

    return {
        "message": (
            "Firebase project connected successfully."
        ),
        "client_id": client.id,
        "tenant_id": client.tenant_id,
        "firebase_project_id": (
            client.firebase_project_id
        ),
        "firebase_web_app_id": (
            client.firebase_web_app_id
        ),
        "status": (
            client.firebase_provisioning_status
        ),
        "verification": verification,
    }

@app.post("/clients/{client_id}/provision")
def provision_existing_client(
    client_id: int,
    db: Session = Depends(get_db),
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
                "to provision clients."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    if client.firebase_provisioning_status == "READY":
        return {
            "message": "Client is already provisioned.",
            "client_id": client.id,
            "status": client.firebase_provisioning_status,
        }

    provisioned_client = provision_tenant(
        db=db,
        client=client,
    )

    if (
        provisioned_client.firebase_provisioning_status
        != "READY"
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                provisioned_client.firebase_provisioning_error
                or "Client provisioning failed."
            ),
        )

    return {
        "message": "Client provisioned successfully.",
        "client_id": provisioned_client.id,
        "tenant_id": provisioned_client.tenant_id,
        "firebase_project_id": (
            provisioned_client.firebase_project_id
        ),
        "firebase_web_app_id": (
            provisioned_client.firebase_web_app_id
        ),
        "status": (
            provisioned_client.firebase_provisioning_status
        ),
    }


@app.get("/clients")
def get_clients(
    db: Session = Depends(get_db),
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
            detail="You do not have permission to view clients.",
        )

    clients = (
        db.query(Client)
        .order_by(Client.id.desc())
        .all()
    )

    return {
        "clients": [
            {
                "id": client.id,
                "tenant_id": client.tenant_id,
                "business_name": client.business_name,
                "legal_business_name": client.legal_business_name,
                "business_type": client.business_type,
                "country": client.country,
                "business_email": client.business_email,
                "business_phone": client.business_phone,
                "owner_name": client.owner_name,
                "owner_email": client.owner_email,
                "owner_phone": client.owner_phone,
                "owner_role": client.owner_role,
                "pan": client.pan,
                "gstin": client.gstin,
                "plan": client.plan,
                "billing_cycle": client.billing_cycle,
                "subscription_status": client.subscription_status,
                "start_date": client.start_date,
                "domain": client.domain,
                "modules": client.modules,
                "created_at": client.created_at,
                "updated_at": client.updated_at,
            }
            for client in clients
        ]
    }


@app.get("/clients/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
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
            detail="You do not have permission to view this client.",
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    return {
        "client": {
            "id": client.id,
            "tenant_id": client.tenant_id,
            "business_name": client.business_name,
            "legal_business_name": client.legal_business_name,
            "business_type": client.business_type,
            "country": client.country,
            "business_email": client.business_email,
            "business_phone": client.business_phone,
            "owner_name": client.owner_name,
            "owner_email": client.owner_email,
            "owner_phone": client.owner_phone,
            "owner_role": client.owner_role,
            "pan": client.pan,
            "gstin": client.gstin,
            "plan": client.plan,
            "billing_cycle": client.billing_cycle,
            "subscription_status": client.subscription_status,
            "start_date": client.start_date,
            "domain": client.domain,
            "modules": client.modules,
            "created_at": client.created_at,
            "updated_at": client.updated_at,
        }
    }

@app.get("/clients/{client_id}/firebase-status")
def get_client_firebase_status(
    client_id: int,
    db: Session = Depends(get_db),
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
                "to view Firebase status."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found.",
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "No Firebase project is connected "
                "to this client."
            ),
        )

    try:
        verification = (
            verify_existing_firebase_project(
                client.firebase_project_id
            )
        )

    except Exception as exc:
        return {
            "client_id": client.id,
            "firebase_project_id": (
                client.firebase_project_id
            ),
            "status": "ERROR",
            "error": str(exc),
        }

    return {
        "client_id": client.id,
        "firebase_project_id": (
            client.firebase_project_id
        ),
        "firebase_web_app_id": (
            client.firebase_web_app_id
        ),
        "connection_status": (
            client.firebase_provisioning_status
        ),
        "connected_at": (
            client.firebase_provisioned_at
        ),
        "verification": verification,
    }


@app.get("/clients/{client_id}/firebase-config")
def get_client_firebase_config(
    client_id: int,
    db: Session = Depends(get_db),
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
                "You do not have permission to access "
                "client Firebase configuration."
            ),
        )

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if client is None:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail=(
                "Firebase provisioning is not ready. "
                f"Current status: "
                f"{client.firebase_provisioning_status}"
            ),
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=500,
            detail="Firebase project ID is missing",
        )

    if not client.firebase_web_app_id:
        raise HTTPException(
            status_code=500,
            detail="Firebase Web App ID is missing",
        )

    try:
        session = _get_google_session()

        web_app_name = (
            f"projects/{client.firebase_project_id}/"
            f"webApps/{client.firebase_web_app_id}"
        )

        config = _get_firebase_web_app_config(
            session=session,
            web_app_name=web_app_name,
        )

        return {
            "tenantId": client.tenant_id,
            "clientId": client.id,
            "businessName": client.business_name,
            "firebase": config,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

# ============================================================
# CRM FIREBASE CONFIGURATION
# ============================================================


@app.get("/crm/firebase-config")
def get_crm_firebase_config(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Return Firebase Web App configuration for
    the CRM tenant resolved from the request.
    """

    client = resolve_crm_client(
        request=request,
        db=db,
    )

    if client.firebase_provisioning_status != "READY":
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase connection "
                "is not ready."
            ),
        )

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not connected."
            ),
        )

    if not client.firebase_web_app_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase Web App "
                "is not configured."
            ),
        )

    try:
        session = _get_connection_session()

        web_app_name = (
            f"projects/{client.firebase_project_id}/"
            f"webApps/{client.firebase_web_app_id}"
        )

        config = _get_firebase_web_app_config(
            session=session,
            web_app_name=web_app_name,
        )

        return {
            "tenantId": client.tenant_id,
            "clientId": client.id,
            "businessName": client.business_name,
            "logoUrl": client.logo_url,
            "firebaseProjectId": (
                client.firebase_project_id
            ),
            "firebaseWebAppId": (
                client.firebase_web_app_id
            ),
            "firebase": config,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to load CRM Firebase "
                f"configuration: {exc}"
            ),
        )

# ============================================================
# TEMPORARY RESEND TEST
# ============================================================

@app.post("/test-email")
def test_email(
    test_email: str,
):
    """
    Temporary endpoint to verify Resend configuration.
    Remove this endpoint after testing.
    """

    api_key = os.getenv("RESEND_API_KEY")

    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "welcome@abhinava.site",
    )

    from_name = os.getenv(
        "RESEND_FROM_NAME",
        "Abhinava",
    )

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="RESEND_API_KEY is not configured.",
        )

    try:
        resend.api_key = api_key

        result = resend.Emails.send(
            {
                "from": (
                    f"{from_name} "
                    f"<{from_email}>"
                ),
                "to": [test_email],
                "subject": "Abhinava — Email Test",
                "html": """
                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:600px;
                        margin:auto;
                        padding:30px;
                    ">
                        <h1>Welcome to Abhinava</h1>

                        <p>
                            This is a test email from
                            the Abhinava platform.
                        </p>

                        <p>
                            Your Resend integration is
                            working successfully.
                        </p>

                        <hr>

                        <p style="color:#666;">
                            Abhinava<br>
                            Jewelry Business Management Platform
                        </p>
                    </div>
                """,
            }
        )

        return {
            "success": True,
            "message": "Test email sent successfully.",
            "email_id": (
                result.get("id")
                if isinstance(result, dict)
                else None
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Resend email failed: {str(exc)}",
        )