"""add platform auth transactions

Revision ID: cfbd3d37fda6
Revises: 54e845a38929
Create Date: 2026-08-20 15:32:04.745062

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cfbd3d37fda6"
down_revision: Union[str, Sequence[str], None] = "54e845a38929"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # Short-lived server-side OAuth transaction state.
    #
    # Raw state/nonce values are never persisted.
    # The application stores SHA-256 hashes.
    # ---------------------------------------------------------
    op.create_table(
        "platform_auth_transactions",

        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),

        sa.Column(
            "state_hash",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "nonce_hash",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "consumed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "ip_address",
            sa.dialects.postgresql.INET(),
            nullable=True,
        ),

        sa.Column(
            "user_agent",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "state_hash",
            name="uq_platform_auth_transactions_state_hash",
        ),

        sa.CheckConstraint(
            "length(state_hash) = 64",
            name="ck_platform_auth_transactions_state_hash_length",
        ),

        sa.CheckConstraint(
            "length(nonce_hash) = 64",
            name="ck_platform_auth_transactions_nonce_hash_length",
        ),
    )

    # ---------------------------------------------------------
    # Lookup by state is the primary callback operation.
    # ---------------------------------------------------------
    op.create_index(
        "ix_platform_auth_transactions_expires_at",
        "platform_auth_transactions",
        ["expires_at"],
    )

    op.create_index(
        "ix_platform_auth_transactions_consumed_at",
        "platform_auth_transactions",
        ["consumed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_auth_transactions_consumed_at",
        table_name="platform_auth_transactions",
    )

    op.drop_index(
        "ix_platform_auth_transactions_expires_at",
        table_name="platform_auth_transactions",
    )

    op.drop_table("platform_auth_transactions")