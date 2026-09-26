from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    UniqueConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    Numeric,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ============================================================
# CLIENT
# ============================================================


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    tenant_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        default=lambda: str(uuid4()),
    )

    firebase_project_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )


    firebase_web_app_id: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )
    
    firebase_web_app_config: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    firebase_provisioning_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
    )

    firebase_provisioning_error: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    firebase_provisioned_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    business_name: Mapped[str] = mapped_column(
    String(200)
    )

    crm_slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    welcome_message: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    legal_business_name: Mapped[str] = mapped_column(
        String(250)
    )

    business_type: Mapped[str] = mapped_column(
        String(50)
    )

    country: Mapped[str] = mapped_column(
        String(100)
    )

    business_email: Mapped[str] = mapped_column(
        String(255)
    )

    business_phone: Mapped[str] = mapped_column(
        String(30)
    )

    owner_name: Mapped[str] = mapped_column(
        String(200)
    )

    owner_email: Mapped[str] = mapped_column(
        String(255)
    )

    owner_phone: Mapped[str] = mapped_column(
        String(30)
    )

    owner_role: Mapped[str] = mapped_column(
        String(50)
    )

    pan: Mapped[str] = mapped_column(
        String(10)
    )

    gstin: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True,
    )

    plan: Mapped[str] = mapped_column(
        String(50)
    )

    billing_cycle: Mapped[str] = mapped_column(
        String(30)
    )

    subscription_status: Mapped[str] = mapped_column(
        String(30)
    )

    account_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
    )

    disabled_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    disabled_by: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    disabled_reason: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    start_date: Mapped[str] = mapped_column(
        String(20)
    )

    domain: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    crm_domain: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    modules: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# ============================================================
# PLATFORM USER
# ============================================================


class PlatformUser(Base):
    __tablename__ = "platform_users"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    identity_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    external_subject: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    display_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    role: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="EMPLOYEE",
        server_default="EMPLOYEE",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="INVITED",
        server_default="INVITED",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "identity_provider IN ('google')",
            name="ck_platform_users_identity_provider",
        ),
        CheckConstraint(
            "role IN ('OWNER', 'ADMIN', 'EMPLOYEE')",
            name="ck_platform_users_role",
        ),
        CheckConstraint(
            "status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED')",
            name="ck_platform_users_status",
        ),
        CheckConstraint(
            "status = 'INVITED' OR external_subject IS NOT NULL",
            name="ck_platform_users_external_subject_lifecycle",
        ),
        Index(
            "ix_platform_users_email",
            "email",
        ),
        Index(
            "ix_platform_users_status",
            "status",
        ),
        Index(
            "uq_platform_users_active_owner",
            "role",
            unique=True,
            postgresql_where=text(
                "role = 'OWNER' AND status <> 'DISABLED'"
            ),
        ),
    )


# ============================================================
# PLATFORM SESSION
# ============================================================


class PlatformSession(Base):
    __tablename__ = "platform_sessions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    platform_user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "platform_users.id",
            name="fk_platform_sessions_user",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    session_token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        INET,
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    last_request_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "length(session_token_hash) = 64",
            name="ck_platform_sessions_token_hash_length",
        ),
        Index(
            "uq_platform_sessions_token_hash",
            "session_token_hash",
            unique=True,
        ),
        Index(
            "ix_platform_sessions_user",
            "platform_user_id",
        ),
        Index(
            "ix_platform_sessions_expires_at",
            "expires_at",
        ),
        Index(
            "ix_platform_sessions_revoked_at",
            "revoked_at",
        ),
        Index(
            "ix_platform_sessions_last_seen_at",
            "last_seen_at",
        ),
    )


# ============================================================
# PLATFORM AUDIT EVENT
# ============================================================


class PlatformAuditEvent(Base):
    __tablename__ = "platform_audit_events"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    outcome: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    actor_platform_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "platform_users.id",
            name="fk_platform_audit_actor",
        ),
        nullable=True,
    )

    actor_identity: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
    )

    target_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    target_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    client_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_platform_audit_client",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    tenant_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
    )

    request_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        INET,
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    event_metadata: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "outcome IN ('SUCCESS', 'FAILURE', 'DENIED')",
            name="ck_platform_audit_events_outcome",
        ),
        Index(
            "ix_platform_audit_events_occurred_at",
            "occurred_at",
        ),
        Index(
            "ix_platform_audit_events_event_type",
            "event_type",
        ),
        Index(
            "ix_platform_audit_events_actor",
            "actor_platform_user_id",
        ),
        Index(
            "ix_platform_audit_events_client",
            "client_id",
        ),
        Index(
            "ix_platform_audit_events_tenant",
            "tenant_id",
        ),
        Index(
            "ix_platform_audit_events_request",
            "request_id",
        ),
    )


# ============================================================
# PLATFORM AUTH TRANSACTION
# ============================================================


class PlatformAuthTransaction(Base):
    __tablename__ = "platform_auth_transactions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    state_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    nonce_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        INET,
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "length(state_hash) = 64",
            name="ck_platform_auth_transactions_state_hash_length",
        ),
        CheckConstraint(
            "length(nonce_hash) = 64",
            name="ck_platform_auth_transactions_nonce_hash_length",
        ),
        Index(
            "uq_platform_auth_transactions_state_hash",
            "state_hash",
            unique=True,
        ),
        Index(
            "ix_platform_auth_transactions_expires_at",
            "expires_at",
        ),
        Index(
            "ix_platform_auth_transactions_consumed_at",
            "consumed_at",
        ),
    )


# ============================================================
# SUBSCRIPTION / PRICING
# ============================================================


# ============================================================
# SUBSCRIPTION / PRICING
# ============================================================

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    main_plan: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    monthly_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )

    annual_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    # --------------------------------------------------------
    # PLAN MODULES
    # --------------------------------------------------------

    modules: Mapped[list["SubscriptionPlanModule"]] = relationship(
        "SubscriptionPlanModule",
        back_populates="subscription_plan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            "main_plan IN ('BASIC', 'PRO')",
            name="ck_subscription_plans_main_plan",
        ),
        CheckConstraint(
            "monthly_price >= 0",
            name="ck_subscription_plans_monthly_price_nonnegative",
        ),
        CheckConstraint(
            "annual_price >= 0",
            name="ck_subscription_plans_annual_price_nonnegative",
        ),
        Index(
            "ix_subscription_plans_main_plan",
            "main_plan",
        ),
        Index(
            "ix_subscription_plans_active",
            "is_active",
        ),
    )


class SubscriptionPlanModule(Base):
    __tablename__ = "subscription_plan_modules"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    subscription_plan_id: Mapped[int] = mapped_column(
        ForeignKey(
            "subscription_plans.id",
            name="fk_subscription_plan_modules_plan",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    module_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    module_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    # --------------------------------------------------------
    # PLAN RELATIONSHIP
    # --------------------------------------------------------

    subscription_plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan",
        back_populates="modules",
    )

    __table_args__ = (
        Index(
            "ix_subscription_plan_modules_module_key",
            "module_key",
        ),
        Index(
            "ix_subscription_plan_modules_plan",
            "subscription_plan_id",
        ),
        Index(
            "uq_subscription_plan_modules_plan_module",
            "subscription_plan_id",
            "module_key",
            unique=True,
        ),
    )

# ============================================================
# CLIENT SUBSCRIPTIONS
# ============================================================


class ClientSubscription(Base):
    __tablename__ = "client_subscriptions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_client_subscriptions_client",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    subscription_plan_id: Mapped[int] = mapped_column(
        ForeignKey(
            "subscription_plans.id",
            name="fk_client_subscriptions_plan",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    # Snapshot fields.
    # These preserve what the client subscribed to at that time.
    main_plan: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    subscription_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    billing_cycle: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
        server_default="ACTIVE",
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    # Price captured when the subscription is created.
    # Future plan price changes will not affect this subscription.
    price_before_tax: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=18,
        server_default="18",
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "main_plan IN ('BASIC', 'PRO')",
            name="ck_client_subscriptions_main_plan",
        ),
        CheckConstraint(
            "billing_cycle IN ('monthly', 'annual')",
            name="ck_client_subscriptions_billing_cycle",
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING')",
            name="ck_client_subscriptions_status",
        ),
        CheckConstraint(
            "end_date > start_date",
            name="ck_client_subscriptions_date_order",
        ),
        CheckConstraint(
            "price_before_tax >= 0",
            name="ck_client_subscriptions_price_nonnegative",
        ),
        CheckConstraint(
            "tax_rate >= 0",
            name="ck_client_subscriptions_tax_rate_nonnegative",
        ),
        CheckConstraint(
            "tax_amount >= 0",
            name="ck_client_subscriptions_tax_nonnegative",
        ),
        CheckConstraint(
            "total_amount >= 0",
            name="ck_client_subscriptions_total_nonnegative",
        ),
        Index(
            "ix_client_subscriptions_client",
            "client_id",
        ),
        Index(
            "ix_client_subscriptions_plan",
            "subscription_plan_id",
        ),
        Index(
            "ix_client_subscriptions_status",
            "status",
        ),
        Index(
            "ix_client_subscriptions_end_date",
            "end_date",
        ),
    )


# ============================================================
# CLIENT SUBSCRIPTION MODULE SNAPSHOT
# ============================================================


class ClientSubscriptionModule(Base):
    __tablename__ = "client_subscription_modules"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    client_subscription_id: Mapped[int] = mapped_column(
        ForeignKey(
            "client_subscriptions.id",
            name="fk_client_subscription_modules_subscription",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    module_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    module_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        Index(
            "ix_client_subscription_modules_subscription",
            "client_subscription_id",
        ),
        Index(
            "uq_client_subscription_modules_subscription_module",
            "client_subscription_id",
            "module_key",
            unique=True,
        ),
    )


# ============================================================
# INVOICING
# ============================================================


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_invoices_client",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    client_subscription_id: Mapped[int] = mapped_column(
        ForeignKey(
            "client_subscriptions.id",
            name="fk_invoices_client_subscription",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    invoice_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    invoice_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    due_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )

    notes: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    period_start: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    period_end: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    invoice_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="SUBSCRIPTION",
        server_default="SUBSCRIPTION",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ISSUED",
        server_default="ISSUED",
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=18,
        server_default="18",
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    pdf_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE')",
            name="ck_invoices_status",
        ),

        CheckConstraint(
            "subtotal >= 0",
            name="ck_invoices_subtotal_nonnegative",
        ),

        CheckConstraint(
            "tax_rate >= 0",
            name="ck_invoices_tax_rate_nonnegative",
        ),

        CheckConstraint(
            "tax_amount >= 0",
            name="ck_invoices_tax_nonnegative",
        ),

        CheckConstraint(
            "total_amount >= 0",
            name="ck_invoices_total_nonnegative",
        ),

        CheckConstraint(
            "discount_amount >= 0",
            name="ck_invoices_discount_nonnegative",
        ),

        CheckConstraint(
            "invoice_type IN ('SUBSCRIPTION', 'UPGRADE', 'DOWNGRADE', 'RENEWAL', 'ADJUSTMENT')",
            name="ck_invoices_type",
        ),

        UniqueConstraint(
            "client_subscription_id",
            "period_start",
            "period_end",
            name="uq_invoice_subscription_period",
        ),

        Index(
            "ix_invoices_client",
            "client_id",
        ),

        Index(
            "ix_invoices_subscription",
            "client_subscription_id",
        ),

        Index(
            "ix_invoices_date",
            "invoice_date",
        ),
    )


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey(
            "invoices.id",
            name="fk_invoice_line_items_invoice",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(250),
        nullable=False,
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=1,
        server_default="1",
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_invoice_line_items_quantity_positive",
        ),
        CheckConstraint(
            "unit_price >= 0",
            name="ck_invoice_line_items_unit_price_nonnegative",
        ),
        CheckConstraint(
            "amount >= 0",
            name="ck_invoice_line_items_amount_nonnegative",
        ),
        Index(
            "ix_invoice_line_items_invoice",
            "invoice_id",
        ),
    )

# ============================================================
# PAYMENTS
# ============================================================


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_payments_client",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey(
            "invoices.id",
            name="fk_payments_invoice",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    payment_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    payment_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "platform_users.id",
            name="fk_payments_created_by",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_payments_amount_positive",
        ),

        CheckConstraint(
            "status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED')",
            name="ck_payments_status",
        ),

        Index(
            "ix_payments_client",
            "client_id",
        ),

        Index(
            "ix_payments_invoice",
            "invoice_id",
        ),

        Index(
            "ix_payments_status",
            "status",
        ),

        Index(
            "ix_payments_paid_at",
            "paid_at",
        ),
    )
# ============================================================
# CLIENT COMMUNICATIONS
# ============================================================


class ClientCommunication(Base):
    __tablename__ = "client_communications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_client_communications_client",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    channel: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    direction: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    communication_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    recipient: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
    )

    sender: Mapped[str | None] = mapped_column(
        String(320),
        nullable=True,
    )

    subject: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    message: Mapped[str] = mapped_column(
        String(10000),
        nullable=False,
    )

    template_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    provider: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    provider_message_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    provider_response: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    failure_reason: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    sent_by: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "platform_users.id",
            name="fk_client_communications_sent_by",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "channel IN ('EMAIL', 'WHATSAPP')",
            name="ck_client_communications_channel",
        ),

        CheckConstraint(
            "direction IN ('OUTBOUND', 'INBOUND')",
            name="ck_client_communications_direction",
        ),

        CheckConstraint(
            "status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED')",
            name="ck_client_communications_status",
        ),

        Index(
            "ix_client_communications_client",
            "client_id",
        ),

        Index(
            "ix_client_communications_channel",
            "channel",
        ),

        Index(
            "ix_client_communications_created_at",
            "created_at",
        ),

        Index(
            "ix_client_communications_provider_message",
            "provider_message_id",
        ),
    )
 # ============================================================
# REFERRAL CODES
# ============================================================


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    discount_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    max_uses: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    used_count: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        server_default="0",
    )

    valid_from: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    valid_until: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_by_platform_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "platform_users.id",
            name="fk_referral_codes_created_by",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('PERCENTAGE', 'FIXED')",
            name="ck_referral_codes_discount_type",
        ),
        CheckConstraint(
            "discount_value > 0",
            name="ck_referral_codes_discount_value_positive",
        ),
        CheckConstraint(
            "(discount_type <> 'PERCENTAGE') OR discount_value <= 100",
            name="ck_referral_codes_percentage_max",
        ),
        CheckConstraint(
            "max_uses IS NULL OR max_uses > 0",
            name="ck_referral_codes_max_uses_positive",
        ),
        CheckConstraint(
            "used_count >= 0",
            name="ck_referral_codes_used_count_nonnegative",
        ),
        CheckConstraint(
            "valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from",
            name="ck_referral_codes_date_order",
        ),
        Index(
            "ix_referral_codes_code",
            "code",
            unique=True,
        ),
        Index(
            "ix_referral_codes_active",
            "is_active",
        ),
        Index(
            "ix_referral_codes_valid_dates",
            "valid_from",
            "valid_until",
        ),
    )


# ============================================================
# REFERRAL CODE REDEMPTIONS
# ============================================================


class ReferralCodeRedemption(Base):
    __tablename__ = "referral_code_redemptions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    referral_code_id: Mapped[int] = mapped_column(
        ForeignKey(
            "referral_codes.id",
            name="fk_referral_redemptions_code",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    client_id: Mapped[int] = mapped_column(
        ForeignKey(
            "clients.id",
            name="fk_referral_redemptions_client",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    client_subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "client_subscriptions.id",
            name="fk_referral_redemptions_subscription",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    code_snapshot: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    discount_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('PERCENTAGE', 'FIXED')",
            name="ck_referral_redemptions_discount_type",
        ),
        CheckConstraint(
            "discount_value > 0",
            name="ck_referral_redemptions_discount_value_positive",
        ),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_referral_redemptions_discount_amount_nonnegative",
        ),
        Index(
            "ix_referral_redemptions_code",
            "referral_code_id",
        ),
        Index(
            "ix_referral_redemptions_client",
            "client_id",
        ),
        Index(
            "ix_referral_redemptions_subscription",
            "client_subscription_id",
        ),
        Index(
            "ix_referral_redemptions_redeemed_at",
            "redeemed_at",
        ),
    )