"""add turnover band to client subscriptions

Revision ID: b4050cbd809d
Revises: add_turnover_bands
Create Date: 2026-09-13 19:20:39.931136

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b4050cbd809d"
down_revision: Union[str, Sequence[str], None] = "add_turnover_bands"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ---------------------------------------------------------
    # 1. Add turnover_band_id as nullable first.
    #
    # Existing client subscriptions already exist in the DB,
    # so adding a NOT NULL column directly would fail.
    # ---------------------------------------------------------
    op.add_column(
        "client_subscriptions",
        sa.Column(
            "turnover_band_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    # ---------------------------------------------------------
    # 2. Populate existing subscriptions.
    #
    # Existing subscriptions do not have a turnover band yet.
    # We assign the first active turnover band ordered by
    # minimum turnover.
    #
    # This is only a migration fallback for existing records.
    # New subscriptions will explicitly select their
    # turnover_band_id.
    # ---------------------------------------------------------
    op.execute(
        """
        UPDATE client_subscriptions
        SET turnover_band_id = (
            SELECT id
            FROM turnover_bands
            WHERE is_active = TRUE
            ORDER BY min_turnover ASC
            LIMIT 1
        )
        WHERE turnover_band_id IS NULL
        """
    )

    # ---------------------------------------------------------
    # 3. Create foreign key.
    # ---------------------------------------------------------
    op.create_foreign_key(
        "fk_client_subscriptions_turnover_band",
        "client_subscriptions",
        "turnover_bands",
        ["turnover_band_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ---------------------------------------------------------
    # 4. Create index.
    # ---------------------------------------------------------
    op.create_index(
        "ix_client_subscriptions_turnover_band",
        "client_subscriptions",
        ["turnover_band_id"],
        unique=False,
    )

    # ---------------------------------------------------------
    # 5. Make the column mandatory.
    #
    # At this point all existing subscriptions should have
    # received a turnover band.
    # ---------------------------------------------------------
    op.alter_column(
        "client_subscriptions",
        "turnover_band_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Remove foreign key
    op.drop_constraint(
        "fk_client_subscriptions_turnover_band",
        "client_subscriptions",
        type_="foreignkey",
    )

    # Remove index
    op.drop_index(
        "ix_client_subscriptions_turnover_band",
        table_name="client_subscriptions",
    )

    # Remove column
    op.drop_column(
        "client_subscriptions",
        "turnover_band_id",
    )