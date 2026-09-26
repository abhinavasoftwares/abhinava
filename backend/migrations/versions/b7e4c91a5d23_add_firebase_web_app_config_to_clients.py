from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "b7e4c91a5d23"
down_revision = "9d2f6a7b31c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column(
            "firebase_web_app_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "clients",
        "firebase_web_app_config",
    )