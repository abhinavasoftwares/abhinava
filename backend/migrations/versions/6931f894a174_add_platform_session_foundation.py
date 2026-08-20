"""add platform session foundation

Revision ID: 6931f894a174
Revises: f4fcafb363a9
Create Date: 2026-08-20 14:31:10.380792

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6931f894a174"
down_revision: Union[str, Sequence[str], None] = "f4fcafb363a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================
    # PLATFORM SESSIONS
    # =========================================================
    #
    # The browser will receive an opaque random session token.
    # Only a SHA-256 hash of that token is stored here.
    #
    # A database compromise therefore does not directly expose
    # reusable session credentials.
    #
    op.create_table(
        "platform_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "platform_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "session_token_hash",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
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
            "last_request_id",
            sa.String(length=100),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["platform_user_id"],
            ["platform_users.id"],
            name="fk_platform_sessions_user",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "length(session_token_hash) = 64",
            name="ck_platform_sessions_token_hash_length",
        ),
    )

    # A session token hash must identify only one session.
    op.create_unique_constraint(
        "uq_platform_sessions_token_hash",
        "platform_sessions",
        ["session_token_hash"],
    )

    op.create_index(
        "ix_platform_sessions_user",
        "platform_sessions",
        ["platform_user_id"],
    )

    op.create_index(
        "ix_platform_sessions_expires_at",
        "platform_sessions",
        ["expires_at"],
    )

    op.create_index(
        "ix_platform_sessions_revoked_at",
        "platform_sessions",
        ["revoked_at"],
    )

    op.create_index(
        "ix_platform_sessions_last_seen_at",
        "platform_sessions",
        ["last_seen_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_platform_sessions_last_seen_at",
        table_name="platform_sessions",
    )

    op.drop_index(
        "ix_platform_sessions_revoked_at",
        table_name="platform_sessions",
    )

    op.drop_index(
        "ix_platform_sessions_expires_at",
        table_name="platform_sessions",
    )

    op.drop_index(
        "ix_platform_sessions_user",
        table_name="platform_sessions",
    )

    op.drop_constraint(
        "uq_platform_sessions_token_hash",
        "platform_sessions",
        type_="unique",
    )

    op.drop_table("platform_sessions")