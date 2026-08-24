from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


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

    business_name: Mapped[str] = mapped_column(String(200))
    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    legal_business_name: Mapped[str] = mapped_column(String(250))
    business_type: Mapped[str] = mapped_column(String(50))
    country: Mapped[str] = mapped_column(String(100))

    business_email: Mapped[str] = mapped_column(String(255))
    business_phone: Mapped[str] = mapped_column(String(30))

    owner_name: Mapped[str] = mapped_column(String(200))
    owner_email: Mapped[str] = mapped_column(String(255))
    owner_phone: Mapped[str] = mapped_column(String(30))
    owner_role: Mapped[str] = mapped_column(String(50))

    pan: Mapped[str] = mapped_column(String(10))
    gstin: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True,
    )

    plan: Mapped[str] = mapped_column(String(50))
    billing_cycle: Mapped[str] = mapped_column(String(30))
    subscription_status: Mapped[str] = mapped_column(String(30))
    start_date: Mapped[str] = mapped_column(String(20))

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
        Index("ix_platform_users_email", "email"),
        Index("ix_platform_users_status", "status"),
        Index(
            "uq_platform_users_active_owner",
            "role",
            unique=True,
            postgresql_where=text(
                "role = 'OWNER' AND status <> 'DISABLED'"
            ),
        ),
    )


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