import os
import resend

from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pydantic import BaseModel, EmailStr

from typing import Any

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Request,
    Body,
)
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from routers.platform_auth import router as platform_auth_router
from routers.subscriptions import router as subscriptions_router
from routers.referrals import router as referrals_router
from routers.payments import router as payments_router
from routers.billing import router as billing_router
from routers.communications import (
    router as communications_router,
)
from routers.client_lifecycle import (
    router as client_lifecycle_router,
)

from database import SessionLocal

from models import (
    Client,
    PlatformUser,
    SubscriptionPlan,
    ClientSubscription,
    ClientSubscriptionModule,
    Invoice,
    InvoiceLineItem,
    ReferralCode,
    ReferralCodeRedemption,
)

from schemas import (
    ClientCreate,
    ClientUpdate,
    FirebaseConnectionRequest,
)

from services.crm_tenant import (
    resolve_crm_client,
    generate_unique_crm_slug,
    require_crm_access,
)

from services.firebase_crm_auth import (
    authorize_crm_firebase_user,
    _get_firebase_admin_app,
    _get_tenant_firestore,
)

from services.employee_email import (
    send_employee_welcome_email,
)
from services.investment_communication import (
    send_investment_welcome_email,
)
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
    _configure_project_access,
)


app = FastAPI(title="Abhinava API")


app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["ABHINAVA_AUTH_TRANSACTION_SECRET"],
    https_only=True,
    same_site="none",
)


app.include_router(platform_auth_router)
app.include_router(subscriptions_router)
app.include_router(payments_router)
app.include_router(billing_router)
app.include_router(referrals_router)
app.include_router(
    communications_router
)
app.include_router(
    client_lifecycle_router
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Codespace
        "https://sturdy-train-77rj957xr4pp2x675-5173.app.github.dev",
        "https://sturdy-train-77rj957xr4pp2x675-5174.app.github.dev",
        "https://abhinava-origin-7e606.web.app",
        "https://crm.abhinava.site",

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

class InvestmentReceiptEmailRequest(BaseModel):
    receiptId: str
    recipientEmail: EmailStr

    language: str = "EN"

    receiptNumber: str

    investorName: str = ""
    accountNumber: str = ""
    schemeName: str = ""

    transactionDate: str = ""

    transactionType: str = ""
    transactionCategory: str = ""

    transactionAmount: float = 0

# ============================================================
# CRM TENANT CONFIGURATION
# ============================================================



@app.get("/crm/{crm_slug}/tenant")
def get_crm_tenant(
    crm_slug: str,
    db: Session = Depends(get_db),
):
    client = resolve_crm_client(
        crm_slug=crm_slug,
        db=db,
    )

    entitlement = require_crm_access(
        db=db,
        client=client,
    )

    return {
        "client_id": client.id,
        "tenant_id": client.tenant_id,
        "crm_slug": client.crm_slug,

        "business_name": client.business_name,
        "logo_url": client.logo_url,

        "welcome_message": (
            client.welcome_message
            or f"Welcome to {client.business_name}"
        ),

        "firebase_project_id": (
            client.firebase_project_id
        ),

        "firebase_web_app_id": (
            client.firebase_web_app_id
        ),

        "subscription": {
            "id": entitlement.subscription_id,
            "status": entitlement.subscription_status,
            "start_date": (
                entitlement.subscription_start_date
            ),
            "end_date": (
                entitlement.subscription_end_date
            ),
        },

        "billing": {
            "status": entitlement.billing_status,
        },

        "modules": list(
            entitlement.modules
        ),
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


def build_investment_receipt_email_html(
    *,
    language: str,
    receipt_number: str,
    investor_name: str,
    account_number: str,
    scheme_name: str,
    transaction_date: str,
    transaction_type: str,
    transaction_category: str,
    transaction_amount: float,
) -> str:

    language = (
        str(language or "EN")
        .strip()
        .upper()
    )

    if language not in {"EN", "KN"}:
        language = "EN"

    safe_receipt = str(
        receipt_number or ""
    )

    safe_name = str(
        investor_name or ""
    )

    safe_account = str(
        account_number or ""
    )

    safe_scheme = str(
        scheme_name or ""
    )

    safe_date = str(
        transaction_date or ""
    )

    safe_type = str(
        transaction_type or ""
    )

    safe_category = str(
        transaction_category or ""
    )

    amount = float(
        transaction_amount or 0
    )

    formatted_amount = (
        f"₹{amount:,.2f}"
    )

    if language == "KN":

        subject_title = "ಹೂಡಿಕೆ ರಸೀದಿ"

        greeting = (
            f"ನಮಸ್ಕಾರ {safe_name},"
            if safe_name
            else "ನಮಸ್ಕಾರ,"
        )

        intro = (
            "ನಿಮ್ಮ ಹೂಡಿಕೆ ವ್ಯವಹಾರದ ರಸೀದಿ "
            "ವಿವರಗಳನ್ನು ಕೆಳಗೆ ನೀಡಲಾಗಿದೆ."
        )

        receipt_label = "ರಸೀದಿ ಸಂಖ್ಯೆ"
        account_label = "ಖಾತೆ ಸಂಖ್ಯೆ"
        scheme_label = "ಯೋಜನೆ"
        date_label = "ದಿನಾಂಕ"
        type_label = "ವ್ಯವಹಾರ ಪ್ರಕಾರ"
        category_label = "ವರ್ಗ"
        amount_label = "ಮೊತ್ತ"

        footer = (
            "ಈ ಇಮೇಲ್ ಹೂಡಿಕೆ ವ್ಯವಹಾರದ "
            "ದಾಖಲೆಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ."
        )

    else:

        subject_title = "Investment Receipt"

        greeting = (
            f"Hello {safe_name},"
            if safe_name
            else "Hello,"
        )

        intro = (
            "Please find below the receipt "
            "details for your investment transaction."
        )

        receipt_label = "Receipt Number"
        account_label = "Account Number"
        scheme_label = "Scheme"
        date_label = "Date"
        type_label = "Transaction Type"
        category_label = "Category"
        amount_label = "Amount"

        footer = (
            "This email has been sent as a record "
            "of your investment transaction."
        )

    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject_title}</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:640px;
    margin:40px auto;
    background:#ffffff;
    border:1px solid #e5e7eb;
">

    <div style="
        padding:28px 32px;
        border-bottom:1px solid #e5e7eb;
    ">

        <div style="
            font-size:20px;
            font-weight:700;
            color:#111827;
        ">
            Abhinava
        </div>

        <div style="
            margin-top:6px;
            font-size:12px;
            color:#6b7280;
        ">
            {subject_title}
        </div>

    </div>

    <div style="padding:32px;">

        <p style="
            margin:0 0 16px;
            font-size:15px;
            color:#111827;
        ">
            {greeting}
        </p>

        <p style="
            margin:0 0 24px;
            font-size:14px;
            line-height:1.7;
            color:#4b5563;
        ">
            {intro}
        </p>

        <table style="
            width:100%;
            border-collapse:collapse;
            font-size:13px;
        ">

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {receipt_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    font-weight:700;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_receipt}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {account_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_account}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {scheme_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_scheme}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {date_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_date}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {type_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_type}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:10px 0;
                    color:#6b7280;
                    border-bottom:1px solid #eeeeee;
                ">
                    {category_label}
                </td>

                <td style="
                    padding:10px 0;
                    text-align:right;
                    color:#111827;
                    border-bottom:1px solid #eeeeee;
                ">
                    {safe_category}
                </td>
            </tr>

            <tr>
                <td style="
                    padding:14px 0;
                    font-weight:700;
                    color:#111827;
                ">
                    {amount_label}
                </td>

                <td style="
                    padding:14px 0;
                    text-align:right;
                    font-size:18px;
                    font-weight:700;
                    color:#111827;
                ">
                    {formatted_amount}
                </td>
            </tr>

        </table>

        <div style="
            margin-top:28px;
            padding-top:20px;
            border-top:1px solid #e5e7eb;
            font-size:12px;
            line-height:1.6;
            color:#9ca3af;
        ">
            {footer}
        </div>

    </div>

</div>

</body>
</html>
"""

# ============================================================
# INVESTMENT ACCOUNT NUMBER CHANGE REQUEST EMAIL
# ============================================================

def send_account_number_change_request_email(
    *,
    client,
    request_data: dict,
    request_id: str,
):
    """
    Send an investment account-number format change request
    to the Abhinava administrator through Resend.

    Firestore remains the source of truth.

    Email failure must NOT delete or roll back the request.
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

    recipient = "abhinavasoftwares@gmail.com"

    if not api_key:
        return {
            "status": "NOT_CONFIGURED",
            "message": (
                "RESEND_API_KEY is not configured."
            ),
            "email_id": None,
        }

    # --------------------------------------------------------
    # REQUEST DATA
    # --------------------------------------------------------

    scheme_name = (
        request_data.get("schemeName")
        or "Investment Scheme"
    )

    scheme_id = (
        request_data.get("schemeId")
        or ""
    )

    reason = (
        request_data.get("reason")
        or "No reason provided."
    )

    requested_by = (
        request_data.get("requestedBy")
        or "Unknown"
    )

    requested_by_email = (
        request_data.get("requestedByEmail")
        or "Not available"
    )

    current_theme = (
        request_data.get("currentTheme")
        or {}
    )

    requested_theme = (
        request_data.get("requestedTheme")
        or {}
    )

    current_prefix = (
        current_theme.get("prefix")
        or ""
    )

    current_padding = (
        current_theme.get("padding")
        or ""
    )

    requested_prefix = (
        requested_theme.get("prefix")
        or ""
    )

    requested_padding = (
        requested_theme.get("padding")
        or ""
    )

    # --------------------------------------------------------
    # REQUESTED THEME
    # --------------------------------------------------------

    if requested_theme:
        requested_theme_text = f"""
            <p style="margin:6px 0;">
                <strong>Requested Prefix:</strong>
                {requested_prefix or "None"}
            </p>

            <p style="margin:6px 0;">
                <strong>Requested Padding:</strong>
                {requested_padding}
            </p>
        """
    else:
        requested_theme_text = """
            <p style="margin:6px 0;color:#6b7280;">
                No new account-number format was specified.
            </p>
        """

    # --------------------------------------------------------
    # EMAIL HTML
    # --------------------------------------------------------

    html = f"""
<!DOCTYPE html>

<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>
        Investment Account Number Change Request
    </title>
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
            padding:30px;
            background:#111111;
            color:#ffffff;
        ">

            <div style="
                font-size:24px;
                font-weight:700;
            ">
                Abhinava
            </div>

            <div style="
                margin-top:7px;
                color:#d1d5db;
                font-size:13px;
            ">
                Investment Account Number Change Request
            </div>

        </div>


        <!-- CONTENT -->

        <div style="
            padding:36px;
        ">

            <div style="
                padding:16px 18px;
                background:#fff7ed;
                border-left:4px solid #ea580c;
                border-radius:8px;
            ">

                <p style="
                    margin:0;
                    color:#9a3412;
                    font-size:15px;
                    font-weight:700;
                ">
                    Action Required
                </p>

                <p style="
                    margin:7px 0 0;
                    color:#7c2d12;
                    font-size:13px;
                    line-height:1.6;
                ">
                    An investment scheme account-number format
                    change request has been submitted and requires
                    administrator review.
                </p>

            </div>


            <!-- SCHEME -->

            <div style="
                margin-top:25px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:17px;
                    color:#111827;
                ">
                    Scheme
                </h2>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Scheme Name:</strong>
                    {scheme_name}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Scheme ID:</strong>
                    {scheme_id}
                </p>

                <p style="
                    margin:8px 0;
                    color:#4b5563;
                ">
                    <strong>Request ID:</strong>
                    {request_id}
                </p>

            </div>


            <!-- CURRENT FORMAT -->

            <div style="
                margin-top:18px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:17px;
                    color:#111827;
                ">
                    Current Account Number Format
                </h2>

                <p style="
                    margin:6px 0;
                    color:#4b5563;
                ">
                    <strong>Prefix:</strong>
                    {current_prefix or "None"}
                </p>

                <p style="
                    margin:6px 0;
                    color:#4b5563;
                ">
                    <strong>Padding:</strong>
                    {current_padding}
                </p>

            </div>


            <!-- REQUESTED FORMAT -->

            <div style="
                margin-top:18px;
                padding:22px;
                background:#ecfdf5;
                border-radius:12px;
                border:1px solid #a7f3d0;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:17px;
                    color:#065f46;
                ">
                    Requested Account Number Format
                </h2>

                {requested_theme_text}

            </div>


            <!-- REASON -->

            <div style="
                margin-top:18px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:17px;
                    color:#111827;
                ">
                    Reason for Change
                </h2>

                <p style="
                    margin:0;
                    color:#4b5563;
                    line-height:1.7;
                    white-space:pre-wrap;
                ">
                    {reason}
                </p>

            </div>


            <!-- REQUESTER -->

            <div style="
                margin-top:18px;
                padding:22px;
                background:#f9fafb;
                border-radius:12px;
            ">

                <h2 style="
                    margin-top:0;
                    font-size:17px;
                    color:#111827;
                ">
                    Requested By
                </h2>

                <p style="
                    margin:6px 0;
                    color:#4b5563;
                ">
                    <strong>UID:</strong>
                    {requested_by}
                </p>

                <p style="
                    margin:6px 0;
                    color:#4b5563;
                ">
                    <strong>Email:</strong>
                    {requested_by_email}
                </p>

            </div>


            <div style="
                margin-top:30px;
                padding-top:20px;
                border-top:1px solid #e5e7eb;
            ">

                <p style="
                    margin:0;
                    color:#6b7280;
                    font-size:12px;
                    line-height:1.6;
                ">
                    This email was automatically generated by
                    the Abhinava Investment Management Platform.
                    Please review the request from the CRM before
                    applying any account-number format change.
                </p>

            </div>

        </div>


        <!-- FOOTER -->

        <div style="
            padding:22px 36px;
            background:#f9fafb;
            border-top:1px solid #e5e7eb;
        ">

            <p style="
                margin:0;
                color:#6b7280;
                font-size:12px;
                text-align:center;
            ">
                © {datetime.utcnow().year}
                Abhinava Softwares.
                All rights reserved.
            </p>

        </div>

    </div>

</body>
</html>
"""

    # --------------------------------------------------------
    # SEND THROUGH RESEND
    # --------------------------------------------------------

    try:
        resend.api_key = api_key

        params = {
            "from": (
                f"{from_name} "
                f"<{from_email}>"
            ),

            "to": [
                recipient
            ],

            "subject": (
                "Abhinava — Investment Account "
                f"Number Change Request — {scheme_name}"
            ),

            "html": html,
        }

        result = resend.Emails.send(params)

        return {
            "status": "SENT",
            "message": (
                "Account number change request "
                "email sent successfully."
            ),
            "email_id": (
                result.get("id")
                if isinstance(result, dict)
                else None
            ),
        }

    except Exception as exc:
        print(
            "Resend account-number change email failed:",
            repr(exc),
        )

        return {
            "status": "FAILED",
            "message": (
                "Request was saved, but the "
                "notification email could not be sent."
            ),
            "email_id": None,
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

    project_id = client.firebase_project_id.strip()

    if not project_id:
        raise HTTPException(
            status_code=400,
            detail="Firebase project ID is required.",
        )

    billing_cycle = client.billing_cycle.strip().lower()

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
        start_date = date.fromisoformat(client.start_date)
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
        verification = verify_existing_firebase_project(
            project_id
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

    main_plan = (plan.main_plan or "").strip().upper()

    if main_plan not in {
        "BASIC",
        "PRO",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid main plan configuration.",
        )

    # ========================================================
    # STEP 3 — RESOLVE DIRECT PLAN PRICE
    #
    # Pricing is now stored directly on SubscriptionPlan.
    # City Tier, Turnover Band and the old pricing matrix
    # are no longer used.
    # ========================================================

    if billing_cycle == "monthly":
        base_price = money(plan.monthly_price)
    else:
        base_price = money(plan.annual_price)

    if base_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Subscription price cannot be negative.",
        )

    currency = (plan.currency or "INR").strip().upper()

    if not currency:
        currency = "INR"

    if len(currency) != 3:
        raise HTTPException(
            status_code=400,
            detail="Subscription plan currency must be a 3-letter code.",
        )

    # ========================================================
    # STEP 4 — AUTHORITATIVE MODULES
    # ========================================================

    modules = normalize_subscription_modules(plan)

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
            detail="Invoicing requires the Stock module.",
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
            detail="Stock requires Customers.",
        )

    if (
        "stock" in module_keys
        and "invoicing" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail="Stock requires Invoicing.",
        )

    if (
        "investments" in module_keys
        and "customers" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail="Investments requires Customers.",
        )

    if (
        "kareegar" in module_keys
        and "customers" not in module_keys
    ):
        raise HTTPException(
            status_code=400,
            detail="Kareegar requires Customers.",
        )

    # ========================================================
    # STEP 5 — REFERRAL
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
                ReferralCode.code == referral_code,
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
                detail=(
                    "Referral code usage limit "
                    "has been reached."
                ),
            )

        discount_amount = calculate_referral_discount(
            referral,
            base_price,
        )

    # ========================================================
    # STEP 6 — FINAL PRICE
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
    # STEP 7 — SUBSCRIPTION DATES
    # ========================================================

    end_date = calculate_subscription_dates(
        start_date,
        billing_cycle,
    )

    # ========================================================
    # STEP 8 — CREATE CLIENT
    # ========================================================

    crm_slug = generate_unique_crm_slug(
    db=db,
    business_name=client.business_name,
)

    new_client = Client(
        business_name=client.business_name,
        crm_slug=crm_slug,
        logo_url=client.logo_url,
        welcome_message=(
            client.welcome_message
            or f"Welcome to {client.business_name}"
        ),
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

        # Keep these synchronized with the subscription.
        plan=main_plan,
        billing_cycle=billing_cycle,
        subscription_status=client.subscription_status,
        start_date=client.start_date,

        domain=client.domain,

        modules={
            module["module_key"]: True
            for module in modules
        },

        # Firebase
        firebase_project_id=project["project_id"],
        firebase_web_app_id=web_app["app_id"],
        firebase_provisioning_status="READY",
        firebase_provisioning_error=None,
        firebase_provisioned_at=datetime.utcnow(),
    )

    db.add(new_client)
    db.flush()

    # ========================================================
    # STEP 9 — CREATE SUBSCRIPTION
    # ========================================================

    subscription = ClientSubscription(
        client_id=new_client.id,
        subscription_plan_id=plan.id,

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

        currency=currency,

        # Store the final taxable subscription value.
        price_before_tax=taxable_amount,

        tax_rate=GST_RATE,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )

    db.add(subscription)
    db.flush()

    # ========================================================
    # STEP 10 — CREATE SUBSCRIPTION MODULES
    # ========================================================

    for module in modules:
        subscription_module = ClientSubscriptionModule(
            client_subscription_id=subscription.id,
            module_key=module["module_key"],
            module_name=module["module_name"],
        )

        db.add(subscription_module)

    # ========================================================
    # STEP 11 — CREATE INVOICE
    # ========================================================

    invoice_number = generate_invoice_number()

    invoice = Invoice(
        client_id=new_client.id,
        client_subscription_id=subscription.id,
        invoice_number=invoice_number,
        invoice_date=date.today(),
        due_date=subscription.start_date,
        period_start=subscription.start_date,
        period_end=subscription.end_date,
        invoice_type="SUBSCRIPTION",
        status="ISSUED",
        currency=subscription.currency,
        subtotal=taxable_amount,
        discount_amount=discount_amount,
        tax_rate=GST_RATE,
        tax_amount=tax_amount,
        total_amount=total_amount,
        notes=None,
        pdf_path=None,
    )

    db.add(invoice)
    db.flush()

    # --------------------------------------------------------
    # Invoice line item
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
    # STEP 12 — REFERRAL REDEMPTION
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
    # STEP 13 — COMMIT EVERYTHING
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
    # STEP 14 — REFRESH
    # ========================================================

    db.refresh(new_client)
    db.refresh(subscription)
    db.refresh(invoice)

    # ========================================================
    # STEP 15 — WELCOME EMAIL
    #
    # Email failure does NOT roll back onboarding.
    # ========================================================

    welcome_email = send_welcome_email(
        client=new_client,
        subscription=subscription,
        invoice=invoice,
        modules=modules,
    )

    # ========================================================
    # STEP 16 — RESPONSE
    # ========================================================

    return {
        "message": (
            "Client onboarding completed successfully."
        ),

        "client": {
            "id": new_client.id,
            "tenant_id": new_client.tenant_id,
            "business_name": new_client.business_name,
            "crm_slug": new_client.crm_slug,
            "crm_url": (
                f"/{new_client.crm_slug}"
            ),
            "owner_email": new_client.owner_email,
            "plan": main_plan,
            "billing_cycle": billing_cycle,
            "status": new_client.subscription_status,
        },

        "firebase": {
            "project_id": new_client.firebase_project_id,
            "web_app_id": new_client.firebase_web_app_id,
            "status": new_client.firebase_provisioning_status,
            "verification": verification,
        },

        "subscription": {
            "id": subscription.id,
            "plan_id": plan.id,
            "plan_name": plan.name,
            "main_plan": main_plan,
            "billing_cycle": billing_cycle,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "status": subscription.status,
            "currency": subscription.currency,
            "price_before_tax": subscription.price_before_tax,
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

    # Cache the public Firebase Web App configuration
    # in PostgreSQL for CRM startup.
    client.firebase_web_app_config = (
        web_app["config"]
    )
    client.firebase_web_app_config = (
        web_app.get("config")
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

    # ---------------------------------------------------------
    # FIND CLIENT
    # ---------------------------------------------------------

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
                "Client does not have a Firebase "
                "project configured."
            ),
        )

    # ---------------------------------------------------------
    # EXISTING READY CLIENT
    #
    # Re-apply IAM configuration.
    #
    # This is intentionally done even when the project is
    # already READY because IAM configuration is idempotent.
    # ---------------------------------------------------------

    if (
        client.firebase_provisioning_status
        == "READY"
    ):

        try:

            session = _get_connection_session()

            _configure_project_access(
                session=session,
                project_id=(
                    client.firebase_project_id
                ),
                client=client,
            )

            return {
                "message": (
                    "Client Firebase access "
                    "configuration repaired successfully."
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
            }

        except Exception as exc:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Unable to configure Firebase "
                    "project access: "
                    f"{str(exc)}"
                ),
            ) from exc

    # ---------------------------------------------------------
    # NORMAL PROVISIONING
    # ---------------------------------------------------------

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
        "message": (
            "Client provisioned successfully."
        ),
        "client_id": (
            provisioned_client.id
        ),
        "tenant_id": (
            provisioned_client.tenant_id
        ),
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


# main.py — replace GET /clients with this

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

                "logo_url": client.logo_url,

                "welcome_message": (
                    client.welcome_message
                    or f"Welcome to {client.business_name}"
                ),

                "crm_slug": client.crm_slug,

                "account_status": client.account_status,
                "disabled_at": client.disabled_at,
                "disabled_by": client.disabled_by,
                "disabled_reason": client.disabled_reason,

                "plan": client.plan,
                "billing_cycle": client.billing_cycle,
                "subscription_status": client.subscription_status,
                "start_date": client.start_date,

                "domain": client.domain,

                "modules": client.modules or [],

                "firebase_project_id": (
                    client.firebase_project_id
                ),

                "firebase_web_app_id": (
                    client.firebase_web_app_id
                ),

                "firebase_provisioning_status": (
                    client.firebase_provisioning_status
                ),

                "created_at": client.created_at,
                "updated_at": client.updated_at,
            }
            for client in clients
        ]
    }

# main.py — replace GET /clients/{client_id} with this

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
            detail="Client not found.",
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

            "logo_url": client.logo_url,

            "welcome_message": (
                client.welcome_message
                or f"Welcome to {client.business_name}"
            ),

            "domain": client.domain,
            "crm_domain": client.crm_domain,
            "crm_slug": client.crm_slug,

            "account_status": client.account_status,
            "disabled_at": client.disabled_at,
            "disabled_by": client.disabled_by,
            "disabled_reason": client.disabled_reason,

            "plan": client.plan,
            "billing_cycle": client.billing_cycle,
            "subscription_status": client.subscription_status,
            "start_date": client.start_date,

            "modules": client.modules or [],

            "firebase_project_id": (
                client.firebase_project_id
            ),

            "firebase_web_app_id": (
                client.firebase_web_app_id
            ),

            "firebase_provisioning_status": (
                client.firebase_provisioning_status
            ),

            "firebase_provisioning_error": (
                client.firebase_provisioning_error
            ),

            "firebase_provisioned_at": (
                client.firebase_provisioned_at
            ),

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
        "crm_slug": client.crm_slug,
        "welcome_message": (
            client.welcome_message
            or f"Welcome to {client.business_name}"
        ),
        "account_status": client.account_status,
        "disabled_at": client.disabled_at,
        "disabled_by": client.disabled_by,
        "disabled_reason": client.disabled_reason,
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

@app.patch("/clients/{client_id}")
def update_client(
    client_id: int,
    payload: ClientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    # ========================================================
    # AUTHORIZATION
    # ========================================================

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to update clients."
            ),
        )

    # ========================================================
    # LOAD CLIENT
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
    # CAPTURE CHANGES
    # ========================================================

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No client fields were provided for update.",
        )

    changes = {}

    for field, new_value in update_data.items():

        if field == "welcome_message":
            new_value = (
                new_value.strip()
                if new_value is not None
                else None
            )

            if new_value == "":
                new_value = None

        elif isinstance(new_value, str):
            new_value = new_value.strip()

        old_value = getattr(
            client,
            field,
        )

        if old_value != new_value:

            changes[field] = {
                "old": old_value,
                "new": new_value,
            }

            setattr(
                client,
                field,
                new_value,
            )

    # ========================================================
    # NOTHING ACTUALLY CHANGED
    # ========================================================

    if not changes:
        return {
            "message": "No changes were made.",
            "client_id": client.id,
        }

    # ========================================================
    # AUDIT
    # ========================================================

    audit_event = PlatformAuditEvent(
        event_type="CLIENT_PROFILE_UPDATED",

        outcome="SUCCESS",

        actor_platform_user_id=platform_user.id,

        actor_identity=platform_user.email,

        target_type="CLIENT",

        target_id=str(client.id),

        client_id=client.id,

        tenant_id=client.tenant_id,

        ip_address=(
            request.client.host
            if request.client
            else None
        ),

        user_agent=(
            request.headers.get("user-agent")
        ),

        event_metadata={
            "changed_fields": list(
                changes.keys()
            ),
        },
    )

    db.add(audit_event)

    # ========================================================
    # COMMIT
    # ========================================================

    try:
        db.commit()
        db.refresh(client)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Client update failed."
            ),
        ) from exc

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "message": "Client updated successfully.",

        "client": {
            "id": client.id,
            "tenant_id": client.tenant_id,

            "business_name": (
                client.business_name
            ),

            "legal_business_name": (
                client.legal_business_name
            ),

            "business_type": (
                client.business_type
            ),

            "country": client.country,

            "business_email": (
                client.business_email
            ),

            "business_phone": (
                client.business_phone
            ),

            "owner_name": client.owner_name,

            "owner_email": (
                client.owner_email
            ),

            "owner_phone": (
                client.owner_phone
            ),

            "owner_role": (
                client.owner_role
            ),

            "pan": client.pan,
            "gstin": client.gstin,

            "logo_url": client.logo_url,

            "welcome_message": (
                client.welcome_message
                or f"Welcome to {client.business_name}"
            ),

            "domain": client.domain,

            "crm_slug": client.crm_slug,

            "account_status": (
                client.account_status
            ),

            "firebase_provisioning_status": (
                client.firebase_provisioning_status
            ),

            "created_at": client.created_at,
            "updated_at": client.updated_at,
        },

        "audit": {
            "event_type": (
                "CLIENT_PROFILE_UPDATED"
            ),
            "changed_fields": list(
                changes.keys()
            ),
            "actor": platform_user.email,
        },
    }
# ============================================================
# CLIENT FIREBASE WEB APP CONFIGURATION
# ============================================================


@app.post("/clients/{client_id}/firebase-config")
def save_client_firebase_config(
    client_id: int,
    firebase_config: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    platform_user: PlatformUser = Depends(
        get_current_platform_user
    ),
):
    """
    Save the public Firebase Web App configuration
    for a client.

    This is an ADMIN/OWNER operation performed once
    during client onboarding or Firebase connection.

    IMPORTANT:
    This configuration contains public Firebase
    client-side configuration only.

    No service-account credentials or private keys
    must ever be submitted here.
    """

    # --------------------------------------------------------
    # PLATFORM AUTHORIZATION
    # --------------------------------------------------------

    if platform_user.role not in {
        "OWNER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to configure client Firebase."
            ),
        )

    # --------------------------------------------------------
    # LOAD CLIENT
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # REQUIRED FIREBASE CONFIG FIELDS
    # --------------------------------------------------------

    required_fields = {
        "apiKey",
        "authDomain",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId",
    }

    missing_fields = [
        field
        for field in required_fields
        if not firebase_config.get(field)
    ]

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase configuration is missing "
                "required fields: "
                + ", ".join(missing_fields)
            ),
        )

    # --------------------------------------------------------
    # PROJECT ID VALIDATION
    # --------------------------------------------------------

    config_project_id = str(
        firebase_config.get("projectId")
    ).strip()

    if (
        client.firebase_project_id
        and config_project_id
        != client.firebase_project_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase configuration projectId "
                "does not match the client's connected "
                "Firebase project."
            ),
        )

    # --------------------------------------------------------
    # APP ID VALIDATION
    # --------------------------------------------------------

    config_app_id = str(
        firebase_config.get("appId")
    ).strip()

    if (
        client.firebase_web_app_id
        and config_app_id
        != client.firebase_web_app_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase configuration appId "
                "does not match the client's connected "
                "Firebase Web App."
            ),
        )

    # --------------------------------------------------------
    # NORMALIZE CONFIG
    #
    # Store only the Firebase Web App client configuration.
    # --------------------------------------------------------

    normalized_config = {
        "apiKey": str(
            firebase_config["apiKey"]
        ).strip(),

        "authDomain": str(
            firebase_config["authDomain"]
        ).strip(),

        "projectId": config_project_id,

        "storageBucket": str(
            firebase_config["storageBucket"]
        ).strip(),

        "messagingSenderId": str(
            firebase_config["messagingSenderId"]
        ).strip(),

        "appId": config_app_id,
    }

    # Optional Firebase configuration fields
    # are preserved if provided.

    optional_fields = {
        "measurementId",
    }

    for field in optional_fields:
        value = firebase_config.get(field)

        if value:
            normalized_config[field] = str(
                value
            ).strip()

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    client.firebase_web_app_config = (
        normalized_config
    )

    client.firebase_provisioning_error = None

    if client.firebase_provisioning_status != "READY":
        client.firebase_provisioning_status = "READY"

    client.firebase_provisioned_at = (
        client.firebase_provisioned_at
        or datetime.utcnow()
    )

    try:
        db.commit()
        db.refresh(client)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save Firebase "
                "configuration."
            ),
        ) from exc

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "message": (
            "Firebase Web App configuration "
            "saved successfully."
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

        "configured": True,
    }


# ============================================================
# CRM FIREBASE CONFIGURATION
# ============================================================

@app.get("/crm/{crm_slug}/firebase-config")
def get_crm_firebase_config(
    crm_slug: str,
    db: Session = Depends(get_db),
):
    """
    Return the tenant Firebase Web App configuration.

    CRM startup reads the cached public Firebase configuration
    from PostgreSQL.

    No Firebase Management API call is made here.
    """

    client = resolve_crm_client(
        crm_slug=crm_slug,
        db=db,
    )

    entitlement = require_crm_access(
        db=db,
        client=client,
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
                "CRM tenant Firebase web app "
                "is not configured."
            ),
        )

    config = client.firebase_web_app_config

    if not config:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase web configuration "
                "is not stored."
            ),
        )

    # --------------------------------------------------------
    # Validate that the cached configuration belongs to
    # this exact Firebase project and Web App.
    # --------------------------------------------------------

    if config.get("projectId") != client.firebase_project_id:
        raise HTTPException(
            status_code=500,
            detail=(
                "Stored Firebase configuration does not "
                "match the tenant Firebase project."
            ),
        )

    if config.get("appId") != client.firebase_web_app_id:
        raise HTTPException(
            status_code=500,
            detail=(
                "Stored Firebase configuration does not "
                "match the tenant Firebase Web App."
            ),
        )

    return {
        "tenantId": client.tenant_id,
        "clientId": client.id,
        "crmSlug": client.crm_slug,
        "businessName": client.business_name,

        "modules": list(
            entitlement.modules
        ),

        "firebase": config,
    }

# ============================================================
# CRM ADMIN ACTION AUTHORIZATION
# ============================================================

def authorize_crm_admin_action(
    *,
    id_token: str,
    project_id: str,
    tenant_id: str,
    crm_slug: str,
):
    """
    Authorize an authenticated CRM administrator for an
    admin-only CRM action.

    This is intentionally separate from normal employee
    CRM authorization because the employee receiving the
    onboarding email does NOT have a Firebase UID yet.
    """

    # ========================================================
    # 1. REQUIRE FIREBASE ID TOKEN
    # ========================================================

    if not id_token:
        raise PermissionError(
            "Firebase authentication is required."
        )

    # ========================================================
    # 2. VERIFY FIREBASE TOKEN
    # ========================================================

    app = _get_firebase_admin_app(project_id)

    try:
        decoded_token = firebase_auth.verify_id_token(
            id_token,
            app=app,
            check_revoked=True,
        )
    except Exception as exc:
        raise PermissionError(
            "Invalid or expired Firebase authentication."
        ) from exc

    uid = decoded_token.get("uid")

    if not uid:
        raise PermissionError(
            "Authenticated Firebase UID was not found."
        )

    # ========================================================
    # 3. LOAD THE ADMIN USER DOCUMENT
    # ========================================================


    db = _get_tenant_firestore(project_id)

    user_ref = db.collection("users").document(uid)
    user_snapshot = user_ref.get()

    if not user_snapshot.exists:
        raise PermissionError(
            "CRM administrator authorization was not found."
        )

    user = user_snapshot.to_dict() or {}

    # ========================================================
    # 4. VERIFY ADMIN STATUS
    # ========================================================

    status = str(
        user.get("status") or ""
    ).strip().upper()

    if status != "ACTIVE":
        raise PermissionError(
            "CRM administrator account is inactive."
        )

    # ========================================================
    # 5. VERIFY ADMIN ROLE
    # ========================================================

    role = str(
        user.get("role") or ""
    ).strip().upper()

    if role != "ADMIN_OWNER":
        raise PermissionError(
            "Only the CRM administrator can send employee onboarding emails."
        )

    # ========================================================
    # 6. VERIFY TENANT WHEN PRESENT
    # ========================================================
    #
    # Your current manually-created owner record has:
    #
    #     tenantId = None
    #     crmSlug  = None
    #
    # Therefore these are optional for this legacy owner.
    #
    # If they are present in the future, they MUST match.
    #
    # ========================================================

    stored_tenant_id = user.get("tenantId")

    if stored_tenant_id is not None:
        if str(stored_tenant_id) != str(tenant_id):
            raise PermissionError(
                "CRM administrator tenant mismatch."
            )

    # ========================================================
    # 7. VERIFY CRM SLUG WHEN PRESENT
    # ========================================================

    stored_crm_slug = user.get("crmSlug")

    if stored_crm_slug is not None:
        if (
            str(stored_crm_slug).strip().lower()
            != str(crm_slug).strip().lower()
        ):
            raise PermissionError(
                "CRM administrator CRM mismatch."
            )

    # ========================================================
    # 8. DEBUG
    # ========================================================

    print(
        "CRM ADMIN ACTION AUTHORIZED:",
        {
            "uid": uid,
            "role": role,
            "status": status,
            "tenantId": stored_tenant_id,
            "crmSlug": stored_crm_slug,
            "requestTenantId": tenant_id,
            "requestCrmSlug": crm_slug,
        },
    )

    # ========================================================
    # 9. SUCCESS
    # ========================================================

    return {
        "uid": uid,
        "user": user,
    }
# ============================================================
# CRM FIREBASE AUTHORIZATION / EMPLOYEE BINDING
# ============================================================


@app.post("/crm/{crm_slug}/auth/authorize")
def authorize_crm_user(
    crm_slug: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Trusted Firebase authentication bridge.

    The backend verifies the Firebase identity and
    determines whether the identity belongs to an
    authorized CRM account.

    First login:
        - Firebase token is verified by the trusted backend.
        - Active employee is resolved.
        - Employee UID is securely bound.
        - users/{uid} is provisioned by the trusted backend.
        - Authorization is returned to the frontend.

    Existing login:
        - users/{uid} is validated.
        - Authorization is returned to the frontend.

    The browser never provisions authorization documents.
    """

    # --------------------------------------------------------
    # RESOLVE TENANT
    # --------------------------------------------------------

    client = resolve_crm_client(
        crm_slug=crm_slug,
        db=db,
    )

    entitlement = require_crm_access(
        db=db,
        client=client,
    )

    # Prevent unused-variable lint warnings while keeping
    # entitlement validation explicit.
    _ = entitlement

    # --------------------------------------------------------
    # FIREBASE PROJECT
    # --------------------------------------------------------

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not configured."
            ),
        )

    # --------------------------------------------------------
    # AUTHORIZATION HEADER
    # --------------------------------------------------------

    authorization_header = (
        request.headers.get(
            "Authorization"
        )
    )

    if not authorization_header:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    if not authorization_header.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Firebase authorization "
                "header."
            ),
        )

    id_token = (
        authorization_header[
            len("Bearer "):
        ]
        .strip()
    )

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    # --------------------------------------------------------
    # TRUSTED AUTHORIZATION
    # --------------------------------------------------------

    try:

        result = authorize_crm_firebase_user(
            id_token=id_token,
            project_id=client.firebase_project_id,
            tenant_id=client.tenant_id,
            crm_slug=client.crm_slug,
        )

        # ----------------------------------------------------
        # DEFENSIVE RESULT VALIDATION
        # ----------------------------------------------------
        if not isinstance(result, dict):
            raise RuntimeError(
                "CRM authorization service returned "
                "an invalid response."
            )

        authorization = result.get("authorization")

        if not isinstance(authorization, dict):
            raise PermissionError(
                "CRM authorization was not granted."
            )

        uid = result.get("uid")

        if not uid:
            raise RuntimeError(
                "CRM authorization response is missing uid."
            )

        role = result.get("role")

        if not role:
            raise RuntimeError(
                "CRM authorization response is missing role."
            )

        login_method = result.get("loginMethod")

        if not login_method:
            raise RuntimeError(
                "CRM authorization response is missing "
                "login method."
            )

        employee_id = result.get("employeeId")

        if role != "ADMIN_OWNER" and not employee_id:
            employee_id = authorization.get("employeeId")

        if role != "ADMIN_OWNER" and not employee_id:
            raise RuntimeError(
                "CRM employee authorization response "
                "is missing employeeId."
            )

        # ----------------------------------------------------
        # CANONICAL RESPONSE
        # ----------------------------------------------------

        response = {
            "status": "authorized",
            "firstLogin": bool(
                result.get(
                    "firstLogin",
                    False,
                )
            ),
            "authorized": True,
            "tenantId": client.tenant_id,
            "clientId": client.id,
            "crmSlug": client.crm_slug,
            "uid": uid,
            "role": role,
            "loginMethod": login_method,
            "authorization": authorization,
        }

        if employee_id:
            response["employeeId"] = employee_id

        return response

    except PermissionError as exc:

        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:

        import traceback

        print(
            "=== CRM FIREBASE AUTHORIZATION ERROR ==="
        )

        print(
            "CRM Slug:",
            crm_slug,
        )

        print(
            "Client ID:",
            getattr(
                client,
                "id",
                None,
            ),
        )

        print(
            "Tenant ID:",
            getattr(
                client,
                "tenant_id",
                None,
            ),
        )

        print(
            "Error:",
            repr(exc),
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=(
                f"CRM authorization failed: {str(exc)}"
            ),
        ) from exc
    

# ============================================================
# CRM EMPLOYEE ONBOARDING EMAIL
# ============================================================

@app.post(
    "/crm/{crm_slug}/employees/{employee_id}/welcome-email"
)
def send_crm_employee_welcome_email(
    crm_slug: str,
    employee_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Send or resend an employee onboarding email.

    IMPORTANT:
    - Only an authenticated ADMIN_OWNER can perform this action.
    - The target employee does NOT need a Firebase UID.
    - The employee UID is created only after the employee
      completes their first login.
    """

    # ========================================================
    # 1. RESOLVE CRM TENANT
    # ========================================================

    client = resolve_crm_client(
        crm_slug=crm_slug,
        db=db,
    )

    require_crm_access(
        db=db,
        client=client,
    )

    # ========================================================
    # 2. VERIFY FIREBASE PROJECT
    # ========================================================

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not configured."
            ),
        )

    # ========================================================
    # 3. READ AUTHORIZATION HEADER
    # ========================================================

    authorization_header = request.headers.get(
        "Authorization"
    )

    if not authorization_header:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    if not authorization_header.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Firebase authorization "
                "header."
            ),
        )

    id_token = (
        authorization_header[
            len("Bearer "):
        ]
        .strip()
    )

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    # ========================================================
    # 4. AUTHORIZE CURRENT ADMIN
    # ========================================================
    #
    # IMPORTANT:
    #
    # DO NOT call authorize_crm_firebase_user() here.
    #
    # That function is for normal employee CRM login and
    # expects the employee to be part of the employee
    # authorization flow.
    #
    # This endpoint is an ADMIN action.
    #
    # The target employee may have:
    #
    #     uid = null
    #
    # because they have not logged in yet.
    #
    # ========================================================

    try:

        authorize_crm_admin_action(
            id_token=id_token,
            project_id=client.firebase_project_id,
            tenant_id=client.tenant_id,
            crm_slug=client.crm_slug,
        )

    except PermissionError as exc:

        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        print(
            "CRM admin authorization error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to authorize the CRM administrator."
            ),
        ) from exc

    # ========================================================
    # 5. LOAD TARGET EMPLOYEE
    # ========================================================

    try:

        tenant_firestore = _get_tenant_firestore(
            client.firebase_project_id
        )

        employee_ref = (
            tenant_firestore
            .collection("employees")
            .document(employee_id)
        )

        employee_snapshot = employee_ref.get()

    except Exception as exc:

        print(
            "Employee lookup failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load the employee record."
            ),
        ) from exc

    # ========================================================
    # 6. VERIFY EMPLOYEE EXISTS
    # ========================================================

    if not employee_snapshot.exists:
        raise HTTPException(
            status_code=404,
            detail="Employee record was not found.",
        )

    employee = (
        employee_snapshot.to_dict()
        or {}
    )

    # ========================================================
    # 7. VERIFY EMPLOYEE STATUS
    # ========================================================

    employee_status = str(
        employee.get("status") or ""
    ).strip().upper()

    if employee_status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=(
                "Welcome email cannot be sent to "
                "a disabled employee."
            ),
        )

    # ========================================================
    # 8. VERIFY EMPLOYEE EMAIL
    # ========================================================

    employee_email = str(
        employee.get("email") or ""
    ).strip().lower()

    if not employee_email:
        raise HTTPException(
            status_code=400,
            detail=(
                "Employee does not have an email address."
            ),
        )

    # ========================================================
    # 9. SEND EMAIL
    # ========================================================

    try:

        from services.employee_email import (
            send_employee_welcome_email,
        )

        # --------------------------------------------------------
        # MAP EMPLOYEE LOGIN METHODS TO EMAIL TEMPLATE FORMAT
        # --------------------------------------------------------
        #
        # Firestore employee record:
        #
        # loginMethods:
        #   google: true/false
        #   otp: true/false
        #
        # Email service expects:
        #
        # auth:
        #   google: true/false
        #   phone: true/false
        #
        # --------------------------------------------------------

        login_methods = employee.get(
            "loginMethods"
        ) or {}

        email_employee = {
            **employee,

            "auth": {
                "google": bool(
                    login_methods.get("google")
                ),
                "phone": bool(
                    login_methods.get("otp")
                ),
            },

            "permissions": (
                employee.get("permissions")
                or {}
            ),

            "enforce24HourLogout": bool(
                employee.get(
                    "enforce24HourLogout"
                )
            ),
        }

        send_employee_welcome_email(
            employee=email_employee,
            business_name=client.business_name,
            crm_slug=client.crm_slug,
        )

    except Exception as exc:

        print(
            "Employee welcome email failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=502,
            detail=(
                f"Unable to send employee welcome email: "
                f"{str(exc)}"
            ),
        ) from exc

    # ========================================================
    # 10. SUCCESS
    # ========================================================

    return {
        "success": True,
        "status": "SENT",
        "employeeId": employee_id,
        "email": employee_email,
        "message": (
            f"Welcome email sent successfully to "
            f"{employee_email}."
        ),
    }

# ============================================================
# CRM INVESTMENT ACCOUNT NUMBER CHANGE REQUEST
# ============================================================

@app.post(
    "/crm/{crm_slug}/investment/"
    "account-number-change-requests/{request_id}/notify"
)
def notify_account_number_change_request(
    crm_slug: str,
    request_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Notify Abhinava administrators about an investment
    account-number format change request.

    Security:
        - CRM tenant is resolved from crm_slug.
        - Firebase ID token is required.
        - Only ADMIN_OWNER can perform this action.
        - Request is read from the tenant's Firebase project.
        - Email is sent only by the backend through Resend.
        - Resend credentials never reach the browser.
    """

    # ========================================================
    # 1. RESOLVE TENANT
    # ========================================================

    client = resolve_crm_client(
        crm_slug=crm_slug,
        db=db,
    )

    require_crm_access(
        db=db,
        client=client,
    )

    # ========================================================
    # 2. FIREBASE PROJECT
    # ========================================================

    if not client.firebase_project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "CRM tenant Firebase project "
                "is not configured."
            ),
        )

    # ========================================================
    # 3. READ FIREBASE AUTH TOKEN
    # ========================================================

    authorization_header = (
        request.headers.get("Authorization")
    )

    if not authorization_header:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    if not authorization_header.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid Firebase authorization header."
            ),
        )

    id_token = (
        authorization_header[
            len("Bearer "):
        ]
        .strip()
    )

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail=(
                "Firebase authentication token "
                "is required."
            ),
        )

    # ========================================================
    # 4. AUTHORIZE ADMIN
    # ========================================================

    try:
        authorize_crm_admin_action(
            id_token=id_token,
            project_id=client.firebase_project_id,
            tenant_id=client.tenant_id,
            crm_slug=client.crm_slug,
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "Investment request admin authorization failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to authorize the CRM administrator."
            ),
        ) from exc

    # ========================================================
    # 5. LOAD TENANT FIRESTORE
    # ========================================================

    try:
        tenant_firestore = _get_tenant_firestore(
            client.firebase_project_id
        )

        request_ref = (
            tenant_firestore
            .collection(
                "investmentAccountNumberChangeRequests"
            )
            .document(request_id)
        )

        request_snapshot = request_ref.get()

    except Exception as exc:
        print(
            "Investment account-number request lookup failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load the account-number "
                "change request."
            ),
        ) from exc

    # ========================================================
    # 6. REQUEST EXISTS
    # ========================================================

    if not request_snapshot.exists:
        raise HTTPException(
            status_code=404,
            detail=(
                "Account-number change request "
                "was not found."
            ),
        )

    request_data = (
        request_snapshot.to_dict()
        or {}
    )

    # ========================================================
    # 7. VERIFY REQUEST BELONGS TO THIS TENANT
    #
    # Firestore itself is tenant-specific because we opened
    # the Firebase project from the resolved CRM client.
    #
    # Still verify the expected request structure.
    # ========================================================

    request_scheme_id = str(
        request_data.get("schemeId") or ""
    ).strip()

    if not request_scheme_id:
        raise HTTPException(
            status_code=422,
            detail=(
                "Investment request does not contain "
                "a valid scheme ID."
            ),
        )

    # ========================================================
    # 8. PREVENT ACCIDENTAL DUPLICATE EMAIL
    # ========================================================

    existing_status = str(
        request_data.get(
            "emailNotificationStatus"
        )
        or ""
    ).upper()

    if existing_status == "SENT":
        return {
            "success": True,
            "status": "ALREADY_SENT",
            "requestId": request_id,
            "message": (
                "The notification email for this request "
                "has already been sent."
            ),
        }

    # ========================================================
    # 9. SEND EMAIL
    # ========================================================

    email_result = (
        send_account_number_change_request_email(
            client=client,
            request_data=request_data,
            request_id=request_id,
        )
    )

    # ========================================================
    # 10. UPDATE FIRESTORE EMAIL STATUS
    # ========================================================

    try:
        update_data = {
            "emailNotificationStatus": (
                email_result["status"]
            ),
            "emailNotificationMessage": (
                email_result.get("message")
            ),
        }

        if email_result.get("email_id"):
            update_data[
                "emailNotificationId"
            ] = email_result["email_id"]

        if email_result["status"] == "SENT":
            update_data[
                "emailNotificationSentAt"
            ] = datetime.utcnow()

        request_ref.update(
            update_data
        )

    except Exception as exc:
        # Email itself may already have succeeded.
        # Do not report email failure merely because the
        # Firestore status update failed.

        print(
            "Unable to update investment request "
            "email status:",
            repr(exc),
        )

    # ========================================================
    # 11. RESPONSE
    # ========================================================

    if email_result["status"] == "SENT":
        return {
            "success": True,
            "status": "SENT",
            "requestId": request_id,
            "email": "abhinavasoftwares@gmail.com",
            "emailId": (
                email_result.get("email_id")
            ),
            "message": (
                "Account-number change request "
                "notification sent successfully."
            ),
        }

    if email_result["status"] == "NOT_CONFIGURED":
        raise HTTPException(
            status_code=503,
            detail=(
                "Request was saved, but Resend is "
                "not configured on the backend."
            ),
        )

    raise HTTPException(
        status_code=502,
        detail=(
            email_result.get("message")
            or "Unable to send the notification email."
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

@app.post("/crm/{crm_slug}/investment/send-welcome-email")
async def send_investment_welcome_email_endpoint(
    crm_slug: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Send investor welcome email through Resend.

    This endpoint is notification-only.
    Business data remains in the tenant Firebase project.
    """

    try:
        # ----------------------------------------------------
        # 1. RESOLVE CRM TENANT
        # ----------------------------------------------------

        client = resolve_crm_client(
            crm_slug=crm_slug,
            db=db,
        )

        require_crm_access(
            db=db,
            client=client,
        )

        # ----------------------------------------------------
        # 2. VERIFY FIREBASE PROJECT
        # ----------------------------------------------------

        if not client.firebase_project_id:
            raise HTTPException(
                status_code=409,
                detail=(
                    "CRM tenant Firebase project "
                    "is not configured."
                ),
            )

        # ----------------------------------------------------
        # 3. FIREBASE AUTHENTICATION
        # ----------------------------------------------------

        authorization_header = request.headers.get(
            "Authorization"
        )

        if not authorization_header:
            raise HTTPException(
                status_code=401,
                detail="Authorization token is required.",
            )

        if not authorization_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header.",
            )

        id_token = authorization_header[
            len("Bearer "):
        ].strip()

        if not id_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid Firebase ID token.",
            )

        # ----------------------------------------------------
        # 4. AUTHORIZE CRM ADMIN
        # ----------------------------------------------------

        try:
            authorize_crm_admin_action(
                id_token=id_token,
                project_id=client.firebase_project_id,
                tenant_id=client.tenant_id,
                crm_slug=client.crm_slug,
            )

        except PermissionError as exc:
            raise HTTPException(
                status_code=403,
                detail=str(exc),
            ) from exc

        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        except Exception as exc:
            print(
                "CRM investment email authorization error:",
                repr(exc),
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Unable to authorize the CRM administrator."
                ),
            ) from exc

        # ----------------------------------------------------
        # 5. REQUEST BODY
        # ----------------------------------------------------

        payload = await request.json()

        recipient_email = (
            payload.get("recipientEmail")
            or payload.get("recipient_email")
            or ""
        ).strip()

        if not recipient_email:
            raise HTTPException(
                status_code=400,
                detail="Investor email address is required.",
            )

        # ----------------------------------------------------
        # 6. SEND THROUGH RESEND
        # ----------------------------------------------------

        result = send_investment_welcome_email(
            recipient_email=recipient_email,
            investor_name=payload.get(
                "investorName",
                "",
            ),
            account_number=payload.get(
                "accountNumber",
                "",
            ),
            scheme_name=payload.get(
                "schemeName",
                "",
            ),
            start_date=payload.get(
                "startDate",
                "",
            ),
            contribution_value=payload.get(
                "contributionValue",
                0,
            ),
            login_url=payload.get(
                "loginUrl",
                "",
            ),
            language=payload.get(
                "language",
                "EN",
            ),
            client_name=payload.get(
                "clientName",
                "",
            ),
            client_logo_url=payload.get(
                "clientLogoUrl",
                "",
            ),
            client_phone=payload.get(
                "clientPhone",
                "",
            ),
            client_email=payload.get(
                "clientEmail",
                "",
            ),
            client_website=payload.get(
                "clientWebsite",
                "",
            ),
            has_initial_transaction=bool(
                payload.get(
                    "hasInitialTransaction",
                    False,
                )
            ),
            transaction_amount=payload.get(
                "transactionAmount",
            ),
            receipt_number=payload.get(
                "receiptNumber",
                "",
            ),
            attachments=payload.get(
                "attachments",
                [],
            ),
        )

        # ----------------------------------------------------
        # 7. EMAIL RESULT
        # ----------------------------------------------------

        if result.get("status") == "FAILED":
            return {
                "success": False,
                **result,
            }

        if result.get("status") == "NOT_CONFIGURED":
            return {
                "success": False,
                **result,
            }

        return {
            "success": True,
            **result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print(
            "Investment welcome email error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to send investment welcome email.",
        ) from exc

@app.post("/crm/investments/receipts/email")
def send_investment_receipt_email(
    payload: InvestmentReceiptEmailRequest,
):
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
            status_code=503,
            detail="Investment email service is not configured.",
        )

    language = (
        str(payload.language or "EN")
        .strip()
        .upper()
    )

    if language not in {"EN", "KN"}:
        language = "EN"

    html = build_investment_receipt_email_html(
        language=language,
        receipt_number=payload.receiptNumber,
        investor_name=payload.investorName,
        account_number=payload.accountNumber,
        scheme_name=payload.schemeName,
        transaction_date=payload.transactionDate,
        transaction_type=payload.transactionType,
        transaction_category=payload.transactionCategory,
        transaction_amount=payload.transactionAmount,
    )

    if language == "KN":
        subject = (
            f"ಹೂಡಿಕೆ ರಸೀದಿ - "
            f"{payload.receiptNumber}"
        )
    else:
        subject = (
            f"Investment Receipt - "
            f"{payload.receiptNumber}"
        )

    try:
        resend.api_key = api_key

        result = resend.Emails.send(
            {
                "from": (
                    f"{from_name} "
                    f"<{from_email}>"
                ),
                "to": [
                    str(
                        payload.recipientEmail
                    )
                ],
                "subject": subject,
                "html": html,
            }
        )

        email_id = (
            result.get("id")
            if isinstance(result, dict)
            else None
        )

        return {
            "success": True,
            "receiptId": payload.receiptId,
            "emailId": email_id,
            "status": "SENT",
        }

    except Exception as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                "Investment receipt email failed: "
                f"{str(exc)}"
            ),
        )