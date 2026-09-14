from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


# ============================================================
# CLIENT
# ============================================================


class ClientCreate(BaseModel):
    business_name: str
    legal_business_name: str
    business_type: str
    country: str
    business_email: EmailStr
    business_phone: str

    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    owner_role: str

    pan: str
    gstin: str | None = None

    # ---------------------------------------------------------
    # SUBSCRIPTION
    # ---------------------------------------------------------

    plan: str
    billing_cycle: str
    subscription_status: str
    start_date: str

    subscription_plan_id: int
    city_tier_id: int
    turnover_band_id: int

    # ---------------------------------------------------------
    # REFERRAL
    # ---------------------------------------------------------

    referral_code: str | None = None

    # ---------------------------------------------------------
    # DOMAIN / MODULES
    # ---------------------------------------------------------

    domain: str | None = None

    # Backend derives the authoritative module set
    # from the selected subscription plan.
    modules: dict = {}

    # ---------------------------------------------------------
    # CLIENT-OWNED FIREBASE PROJECT
    # ---------------------------------------------------------

    firebase_project_id: str

class FirebaseConnectionRequest(BaseModel):
    firebase_project_id: str


# ============================================================
# CITY TIERS
# ============================================================


class CityTierCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=50,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )


class CityTierUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    is_active: bool | None = None


class CityTierResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool

    class Config:
        from_attributes = True


# Turnover

# ============================================================
# TURNOVER BANDS
# ============================================================

class TurnoverBandCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    min_turnover: Decimal = Field(
        ge=0,
    )

    max_turnover: Decimal | None = Field(
        default=None,
        gt=0,
    )


class TurnoverBandUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    min_turnover: Decimal | None = Field(
        default=None,
        ge=0,
    )

    max_turnover: Decimal | None = Field(
        default=None,
        gt=0,
    )

    is_active: bool | None = None


class TurnoverBandResponse(BaseModel):
    id: int
    name: str
    min_turnover: Decimal
    max_turnover: Decimal | None
    is_active: bool

    class Config:
        from_attributes = True

# ============================================================
# SUBSCRIPTION PLAN MODULES
# ============================================================


class SubscriptionModuleCreate(BaseModel):
    module_key: str = Field(
        min_length=1,
        max_length=100,
    )

    module_name: str = Field(
        min_length=1,
        max_length=150,
    )


# ============================================================
# SUBSCRIPTION PLAN PRICING
# ============================================================


class SubscriptionPlanPriceCreate(BaseModel):
    city_tier_id: int

    turnover_band_id: int

    monthly_price: Decimal = Field(
        ge=0,
    )

    annual_price: Decimal = Field(
        ge=0,
    )

    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )


# ============================================================
# SUBSCRIPTION PLANS
# ============================================================


class SubscriptionPlanCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150,
    )

    main_plan: str

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    modules: list[SubscriptionModuleCreate] = []

    prices: list[SubscriptionPlanPriceCreate] = []


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    main_plan: str | None = None

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    is_active: bool | None = None


# ============================================================
# SUBSCRIPTION PLAN RESPONSE
# ============================================================


class SubscriptionModuleResponse(BaseModel):
    id: int
    module_key: str
    module_name: str

    class Config:
        from_attributes = True


class SubscriptionPlanPriceResponse(BaseModel):
    id: int
    city_tier_id: int
    turnover_band_id: int
    monthly_price: Decimal
    annual_price: Decimal
    currency: str

    class Config:
        from_attributes = True


class SubscriptionPlanResponse(BaseModel):
    id: int
    name: str
    main_plan: str
    description: str | None
    is_active: bool

    modules: list[SubscriptionModuleResponse] = []
    prices: list[SubscriptionPlanPriceResponse] = []

    class Config:
        from_attributes = True


# ============================================================
# CLIENT SUBSCRIPTION
# ============================================================


class ClientSubscriptionCreate(BaseModel):
    client_id: int
    subscription_plan_id: int
    city_tier_id: int
    turnover_band_id: int
    billing_cycle: str
    start_date: date


class ClientSubscriptionResponse(BaseModel):
    id: int
    client_id: int
    subscription_plan_id: int
    city_tier_id: int
    turnover_band_id: int
    main_plan: str
    subscription_name: str
    billing_cycle: str
    start_date: date
    end_date: date
    status: str
    currency: str
    price_before_tax: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True


# ============================================================
# INVOICE
# ============================================================


class InvoiceLineItemResponse(BaseModel):
    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int
    client_id: int
    client_subscription_id: int

    invoice_number: str
    invoice_date: date

    status: str
    currency: str

    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    pdf_path: str | None

    line_items: list[InvoiceLineItemResponse] = []

    class Config:
        from_attributes = True

# ============================================================
# REFERRAL CODES
# ============================================================


class ReferralCodeCreate(BaseModel):
    code: str = Field(
        min_length=1,
        max_length=50,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    discount_type: str

    discount_value: Decimal = Field(
        gt=0,
    )

    max_uses: int | None = Field(
        default=None,
        gt=0,
    )

    valid_from: date | None = None

    valid_until: date | None = None


class ReferralCodeUpdate(BaseModel):
    description: str | None = Field(
        default=None,
        max_length=255,
    )

    discount_type: str | None = None

    discount_value: Decimal | None = Field(
        default=None,
        gt=0,
    )

    max_uses: int | None = Field(
        default=None,
        gt=0,
    )

    valid_from: date | None = None

    valid_until: date | None = None

    is_active: bool | None = None


class ReferralCodeResponse(BaseModel):
    id: int
    code: str
    description: str | None
    discount_type: str
    discount_value: Decimal
    max_uses: int | None
    used_count: int
    valid_from: date | None
    valid_until: date | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReferralValidationResponse(BaseModel):
    valid: bool
    code: str
    discount_type: str
    discount_value: Decimal
    discount_amount: Decimal
    message: str