"""add turnover bands and turnover based pricing

Revision ID: add_turnover_bands
Revises: 0bf0dfb02adc
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_turnover_bands"
down_revision: Union[str, Sequence[str], None] = "0bf0dfb02adc"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ---------------------------------------------------------
    # TURNOVER BANDS
    # ---------------------------------------------------------

    op.create_table(
        "turnover_bands",

        sa.Column(
            "id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "min_turnover",
            sa.Numeric(18, 2),
            nullable=False,
        ),

        sa.Column(
            "max_turnover",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),

        sa.CheckConstraint(
            "min_turnover >= 0",
            name="ck_turnover_bands_min_nonnegative",
        ),

        sa.CheckConstraint(
            "max_turnover IS NULL OR max_turnover > min_turnover",
            name="ck_turnover_bands_max_gt_min",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "name",
            name="uq_turnover_bands_name",
        ),
    )

    op.create_index(
        "ix_turnover_bands_active",
        "turnover_bands",
        ["is_active"],
        unique=False,
    )

    # ---------------------------------------------------------
    # ADD TURNOVER TO EXISTING PRICING
    # ---------------------------------------------------------

    op.add_column(
        "subscription_plan_prices",
        sa.Column(
            "turnover_band_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    # ---------------------------------------------------------
    # CREATE DEFAULT BAND
    #
    # Existing pricing needs a valid turnover band.
    # We use one broad band initially so existing plans
    # continue working.
    # ---------------------------------------------------------

    op.execute(
        """
        INSERT INTO turnover_bands
            (name, min_turnover, max_turnover, is_active)
        VALUES
            ('All Turnover', 0, NULL, true)
        """
    )

    # ---------------------------------------------------------
    # ASSIGN EXISTING PRICES
    # ---------------------------------------------------------

    op.execute(
        """
        UPDATE subscription_plan_prices
        SET turnover_band_id = (
            SELECT id
            FROM turnover_bands
            WHERE name = 'All Turnover'
        )
        WHERE turnover_band_id IS NULL
        """
    )

    # ---------------------------------------------------------
    # MAKE REQUIRED
    # ---------------------------------------------------------

    op.alter_column(
        "subscription_plan_prices",
        "turnover_band_id",
        nullable=False,
    )

    # ---------------------------------------------------------
    # REPLACE UNIQUE INDEX
    # ---------------------------------------------------------

    op.drop_index(
        "uq_subscription_plan_prices_plan_tier",
        table_name="subscription_plan_prices",
    )

    op.create_index(
        "uq_subscription_plan_prices_plan_tier_turnover",
        "subscription_plan_prices",
        [
            "subscription_plan_id",
            "city_tier_id",
            "turnover_band_id",
        ],
        unique=True,
    )

    op.create_index(
        "ix_subscription_plan_prices_turnover_band",
        "subscription_plan_prices",
        ["turnover_band_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_subscription_plan_prices_turnover_band",
        "subscription_plan_prices",
        "turnover_bands",
        ["turnover_band_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:

    op.drop_constraint(
        "fk_subscription_plan_prices_turnover_band",
        "subscription_plan_prices",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_subscription_plan_prices_turnover_band",
        table_name="subscription_plan_prices",
    )

    op.drop_index(
        "uq_subscription_plan_prices_plan_tier_turnover",
        table_name="subscription_plan_prices",
    )

    op.create_index(
        "uq_subscription_plan_prices_plan_tier",
        "subscription_plan_prices",
        [
            "subscription_plan_id",
            "city_tier_id",
        ],
        unique=True,
    )

    op.drop_column(
        "subscription_plan_prices",
        "turnover_band_id",
    )

    op.drop_index(
        "ix_turnover_bands_active",
        table_name="turnover_bands",
    )

    op.drop_table("turnover_bands")