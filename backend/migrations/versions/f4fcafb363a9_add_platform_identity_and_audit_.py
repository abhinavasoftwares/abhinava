"""add platform identity and audit foundation

Revision ID: f4fcafb363a9
Revises: dcdac1c1f2e3
Create Date: 2026-08-20 14:14:25.149156

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f4fcafb363a9"
down_revision: Union[str, Sequence[str], None] = "dcdac1c1f2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================
    # PLATFORM USERS
    # =========================================================
    #
    # Represents people who work for Abhinava itself.
    #
    # This table is intentionally NOT a tenant-user table.
    # Tenant users belong to their respective tenant identity
    # boundary and will be designed separately.
    #
    op.create_table(
        "platform_users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "identity_provider",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "external_subject",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "email",
            sa.String(length=320),
            nullable=False,
        ),
        sa.Column(
            "display_name",
            sa.String(length=200),
            nullable=True,
        ),
        sa.Column(
            "role",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("'EMPLOYEE'"),
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default=sa.text("'INVITED'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.CheckConstraint(
            "identity_provider IN ('google')",
            name="ck_platform_users_identity_provider",
        ),
        sa.CheckConstraint(
            "role IN ('OWNER', 'ADMIN', 'EMPLOYEE')",
            name="ck_platform_users_role",
        ),
        sa.CheckConstraint(
            "status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED')",
            name="ck_platform_users_status",
        ),
    )

    # An external identity must map to only one platform user.
    op.create_unique_constraint(
        "uq_platform_users_identity",
        "platform_users",
        ["identity_provider", "external_subject"],
    )

    op.create_index(
        "ix_platform_users_email",
        "platform_users",
        ["email"],
    )

    op.create_index(
        "ix_platform_users_status",
        "platform_users",
        ["status"],
    )

    # Abhinava has one owner, not a partnership/multi-owner model.
    #
    # Disabled historical records do not count as the active owner.
    op.create_index(
        "uq_platform_users_active_owner",
        "platform_users",
        ["role"],
        unique=True,
        postgresql_where=sa.text(
            "role = 'OWNER' AND status <> 'DISABLED'"
        ),
    )

    # =========================================================
    # PLATFORM AUDIT EVENTS
    # =========================================================
    #
    # Security-sensitive platform events are recorded here.
    #
    # Audit records intentionally do not contain:
    # - passwords
    # - OAuth client secrets
    # - access tokens
    # - Firebase ID tokens
    # - arbitrary request bodies
    #
    op.create_table(
        "platform_audit_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "event_type",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "outcome",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "actor_platform_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "actor_identity",
            sa.String(length=320),
            nullable=True,
        ),
        sa.Column(
            "target_type",
            sa.String(length=50),
            nullable=True,
        ),
        sa.Column(
            "target_id",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "client_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "tenant_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "request_id",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "ip_address",
            postgresql.INET(),
            nullable=True,
        ),
        sa.Column(
            "user_agent",
            sa.String(length=1000),
            nullable=True,
        ),
        sa.Column(
            "metadata",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "outcome IN ('SUCCESS', 'FAILURE', 'DENIED')",
            name="ck_platform_audit_events_outcome",
        ),
        sa.ForeignKeyConstraint(
            ["actor_platform_user_id"],
            ["platform_users.id"],
            name="fk_platform_audit_actor",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name="fk_platform_audit_client",
            ondelete="SET NULL",
        ),
    )

    op.create_index(
        "ix_platform_audit_events_occurred_at",
        "platform_audit_events",
        ["occurred_at"],
    )

    op.create_index(
        "ix_platform_audit_events_event_type",
        "platform_audit_events",
        ["event_type"],
    )

    op.create_index(
        "ix_platform_audit_events_actor",
        "platform_audit_events",
        ["actor_platform_user_id"],
    )

    op.create_index(
        "ix_platform_audit_events_client",
        "platform_audit_events",
        ["client_id"],
    )

    op.create_index(
        "ix_platform_audit_events_tenant",
        "platform_audit_events",
        ["tenant_id"],
    )

    op.create_index(
        "ix_platform_audit_events_request",
        "platform_audit_events",
        ["request_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_audit_events_request",
        table_name="platform_audit_events",
    )

    op.drop_index(
        "ix_platform_audit_events_tenant",
        table_name="platform_audit_events",
    )

    op.drop_index(
        "ix_platform_audit_events_client",
        table_name="platform_audit_events",
    )

    op.drop_index(
        "ix_platform_audit_events_actor",
        table_name="platform_audit_events",
    )

    op.drop_index(
        "ix_platform_audit_events_event_type",
        table_name="platform_audit_events",
    )

    op.drop_index(
        "ix_platform_audit_events_occurred_at",
        table_name="platform_audit_events",
    )

    op.drop_table("platform_audit_events")

    op.drop_index(
        "uq_platform_users_active_owner",
        table_name="platform_users",
    )

    op.drop_index(
        "ix_platform_users_status",
        table_name="platform_users",
    )

    op.drop_index(
        "ix_platform_users_email",
        table_name="platform_users",
    )

    op.drop_constraint(
        "uq_platform_users_identity",
        "platform_users",
        type_="unique",
    )

    op.drop_table("platform_users")