from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0bf0dfb02adc"
down_revision: Union[str, Sequence[str], None] = "09df0499fbaa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "referral_codes",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "code",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "discount_type",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "discount_value",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),
        sa.Column(
            "max_uses",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "used_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "valid_from",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "valid_until",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_by_platform_user_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),
        sa.CheckConstraint(
            "discount_type IN ('PERCENTAGE', 'FIXED')",
            name="ck_referral_codes_discount_type",
        ),
        sa.CheckConstraint(
            "discount_value > 0",
            name="ck_referral_codes_discount_value_positive",
        ),
        sa.CheckConstraint(
            "(discount_type <> 'PERCENTAGE') OR discount_value <= 100",
            name="ck_referral_codes_percentage_max",
        ),
        sa.CheckConstraint(
            "max_uses IS NULL OR max_uses > 0",
            name="ck_referral_codes_max_uses_positive",
        ),
        sa.CheckConstraint(
            "used_count >= 0",
            name="ck_referral_codes_used_count_nonnegative",
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from",
            name="ck_referral_codes_date_order",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_platform_user_id"],
            ["platform_users.id"],
            name="fk_referral_codes_created_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "code",
            name="uq_referral_codes_code",
        ),
    )

    op.create_index(
        "ix_referral_codes_active",
        "referral_codes",
        ["is_active"],
        unique=False,
    )

    op.create_index(
        "ix_referral_codes_valid_dates",
        "referral_codes",
        ["valid_from", "valid_until"],
        unique=False,
    )

    op.create_table(
        "referral_code_redemptions",
        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "referral_code_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "client_subscription_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "code_snapshot",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "discount_type",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "discount_value",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),
        sa.Column(
            "discount_amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
        ),
        sa.Column(
            "redeemed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),
        sa.CheckConstraint(
            "discount_type IN ('PERCENTAGE', 'FIXED')",
            name="ck_referral_redemptions_discount_type",
        ),
        sa.CheckConstraint(
            "discount_value > 0",
            name="ck_referral_redemptions_discount_value_positive",
        ),
        sa.CheckConstraint(
            "discount_amount >= 0",
            name="ck_referral_redemptions_discount_amount_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["referral_code_id"],
            ["referral_codes.id"],
            name="fk_referral_redemptions_code",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name="fk_referral_redemptions_client",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["client_subscription_id"],
            ["client_subscriptions.id"],
            name="fk_referral_redemptions_subscription",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_referral_redemptions_code",
        "referral_code_redemptions",
        ["referral_code_id"],
        unique=False,
    )

    op.create_index(
        "ix_referral_redemptions_client",
        "referral_code_redemptions",
        ["client_id"],
        unique=False,
    )

    op.create_index(
        "ix_referral_redemptions_subscription",
        "referral_code_redemptions",
        ["client_subscription_id"],
        unique=False,
    )

    op.create_index(
        "ix_referral_redemptions_redeemed_at",
        "referral_code_redemptions",
        ["redeemed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_referral_redemptions_redeemed_at",
        table_name="referral_code_redemptions",
    )

    op.drop_index(
        "ix_referral_redemptions_subscription",
        table_name="referral_code_redemptions",
    )

    op.drop_index(
        "ix_referral_redemptions_client",
        table_name="referral_code_redemptions",
    )

    op.drop_index(
        "ix_referral_redemptions_code",
        table_name="referral_code_redemptions",
    )

    op.drop_table(
        "referral_code_redemptions"
    )

    op.drop_index(
        "ix_referral_codes_valid_dates",
        table_name="referral_codes",
    )

    op.drop_index(
        "ix_referral_codes_active",
        table_name="referral_codes",
    )

    op.drop_table(
        "referral_codes"
    )