"""add client domain and modules

Revision ID: 47e1160a1812
Revises: 463e00e45ae0
Create Date: 2026-08-16 09:23:09.272001

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47e1160a1812'
down_revision: Union[str, Sequence[str], None] = '463e00e45ae0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
