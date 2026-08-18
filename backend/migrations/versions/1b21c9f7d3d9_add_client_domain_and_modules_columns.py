"""add client domain and modules columns

Revision ID: 1b21c9f7d3d9
Revises: 47e1160a1812
Create Date: 2026-08-16 09:41:55.947414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1b21c9f7d3d9"
down_revision: Union[str, Sequence[str], None] = "47e1160a1812"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "clients",
        sa.Column(
            "domain",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "modules",
            sa.JSON(),
            nullable=True,
        ),
    )

    op.execute(
        "UPDATE clients SET modules = '{}'::json WHERE modules IS NULL"
    )

    op.alter_column(
        "clients",
        "modules",
        existing_type=sa.JSON(),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column("clients", "modules")
    op.drop_column("clients", "domain")