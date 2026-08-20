"""add firebase web app id

Revision ID: dcdac1c1f2e3
Revises: 1b21c9f7d3d9
Create Date: 2026-08-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "dcdac1c1f2e3"
down_revision: Union[str, Sequence[str], None] = "1b21c9f7d3d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column(
            "firebase_web_app_id",
            sa.String(length=150),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "clients",
        "firebase_web_app_id",
    )