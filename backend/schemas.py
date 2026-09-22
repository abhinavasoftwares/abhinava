from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from pydantic import BaseModel, ConfigDict, Field


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

    logo_url: str | None = None
    welcome_message: str | None = None

    # Legacy / client-level subscription information.
    # These can be synchronized from ClientSubscription.
    plan: str
    billing_cycle: str
    subscription_status: str
    start_date: str

    # New simplified subscription reference.
    subscription_plan_id: int

    referral_code: str | None = None
    domain: str | None = None

    modules: dict = Field(
        default_factory=dict
    )

    firebase_project_id: str


# ============================================================
# FIREBASE
# ============================================================

class FirebaseConnectionRequest(BaseModel):
    firebase_project_id: str


# ============================================================
# SUBSCRIPTION MODULES
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


class SubscriptionModuleResponse(BaseModel):
    id: int
    module_key: str
    module_name: str

    class Config:
        from_attributes = True


# ============================================================
# SUBSCRIPTION PLAN
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

    modules: list[SubscriptionModuleCreate] = Field(
        default_factory=list,
    )


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

    monthly_price: Decimal | None = Field(
        default=None,
        ge=0,
    )

    annual_price: Decimal | None = Field(
        default=None,
        ge=0,
    )

    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
    )

    is_active: bool | None = None

    modules: list[SubscriptionModuleCreate] | None = None


class SubscriptionPlanResponse(BaseModel):
    id: int
    name: str
    main_plan: str
    description: str | None

    monthly_price: Decimal
    annual_price: Decimal
    currency: str

    is_active: bool

    modules: list[SubscriptionModuleResponse] = Field(
        default_factory=list,
    )

    class Config:
        from_attributes = True


# ============================================================
# CLIENT SUBSCRIPTION
# ============================================================

class ClientSubscriptionCreate(BaseModel):
    client_id: int

    subscription_plan_id: int

    billing_cycle: str

    start_date: date

# ============================================================
# CLIENT SUBSCRIPTION CHANGE
# ============================================================

class ClientSubscriptionChangeRequest(BaseModel):
    subscription_plan_id: int

    billing_cycle: str

    effective_date: date | None = None

    reason: str | None = Field(
        default=None,
        max_length=500,
    )


class ClientSubscriptionResponse(BaseModel):
    id: int
    client_id: int
    subscription_plan_id: int

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
# CLIENT SUBSCRIPTION CHANGE
# ============================================================

class ClientSubscriptionChangeRequest(BaseModel):
    subscription_plan_id: int

    billing_cycle: str

    effective_date: date | None = None

    reason: str | None = Field(
        default=None,
        max_length=500,
    )


# ============================================================
# INVOICE
# ============================================================

class InvoiceLineItemResponse(BaseModel):
    id: int
    invoice_id: int

    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: int

    client_id: int
    client_subscription_id: int | None

    invoice_number: str

    invoice_date: date
    due_date: date | None

    period_start: date | None
    period_end: date | None

    invoice_type: str

    status: str

    currency: str

    subtotal: Decimal
    discount_amount: Decimal

    tax_rate: Decimal
    tax_amount: Decimal

    total_amount: Decimal

    notes: str | None

    line_items: list[InvoiceLineItemResponse] = Field(
        default_factory=list
    )

    class Config:
        from_attributes = True

# ============================================================
# PAYMENT
# ============================================================


class PaymentCreate(BaseModel):
    invoice_id: int

    amount: Decimal = Field(
        gt=0,
    )

    payment_method: str = Field(
        min_length=1,
        max_length=50,
    )

    payment_reference: str | None = Field(
        default=None,
        max_length=255,
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class PaymentResponse(BaseModel):
    id: int
    client_id: int
    invoice_id: int
    amount: Decimal
    currency: str
    payment_method: str
    payment_reference: str | None
    status: str
    paid_at: datetime | None
    notes: str | None
    created_by: UUID | None
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================
# CLIENT LIFECYCLE
# ============================================================

class ClientStatusChangeRequest(BaseModel):
    reason: str = Field(
        min_length=1,
        max_length=1000,
    )


class ClientLifecycleResponse(BaseModel):
    client_id: int
    account_status: str
    disabled_at: datetime | None
    disabled_by: str | None
    disabled_reason: str | None


# ============================================================
# COMMUNICATION
# ============================================================


class CommunicationSendRequest(BaseModel):
    channel: str

    recipient: str = Field(
        min_length=1,
        max_length=320,
    )

    subject: str | None = Field(
        default=None,
        max_length=500,
    )

    message: str = Field(
        min_length=1,
        max_length=10000,
    )

    communication_type: str = Field(
        default="CUSTOM",
        max_length=50,
    )

    template_name: str | None = Field(
        default=None,
        max_length=150,
    )


class CommunicationResponse(BaseModel):
    id: int
    client_id: int
    channel: str
    direction: str
    communication_type: str
    recipient: str
    sender: str | None
    subject: str | None
    message: str
    template_name: str | None
    status: str
    provider: str | None
    provider_message_id: str | None
    failure_reason: str | None
    sent_by: UUID | None
    sent_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================
# REFERRAL CODE
# ============================================================

class ReferralCodeCreate(BaseModel):
    code: str = Field(
        min_length=3,
        max_length=50,
    )

    description: str | None = Field(
        default=None,
        max_length=255,
    )

    discount_type: str

    discount_value: Decimal = Field(
        ge=0,
    )

    max_uses: int | None = Field(
        default=None,
        ge=1,
    )

    valid_from: date | None = None
    valid_until: date | None = None

    is_active: bool = True


class ReferralCodeUpdate(BaseModel):
    description: str | None = Field(
        default=None,
        max_length=255,
    )

    discount_type: str | None = None

    discount_value: Decimal | None = Field(
        default=None,
        ge=0,
    )

    max_uses: int | None = Field(
        default=None,
        ge=1,
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

    class Config:
        from_attributes = True


class ReferralValidationResponse(BaseModel):
    valid: bool
    code: str

    discount_type: str | None = None
    discount_value: Decimal | None = None

    message: str | None = None

# ============================================================
# EMAIL COMMUNICATION
# ============================================================

class EmailCommunicationCreate(BaseModel):
    client_id: int

    recipient: str = Field(
        min_length=3,
        max_length=320,
    )

    subject: str = Field(
        min_length=1,
        max_length=500,
    )

    message: str = Field(
        min_length=1,
        max_length=20000,
    )

    template_name: str | None = Field(
        default=None,
        max_length=100,
    )


class EmailCommunicationResponse(BaseModel):
    id: int
    client_id: int
    channel: str
    direction: str
    communication_type: str
    recipient: str | None
    sender: str | None
    subject: str | None
    message: str | None
    template_name: str | None
    status: str
    provider: str | None
    provider_message_id: str | None
    failure_reason: str | None
    sent_by: UUID | None
    sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )