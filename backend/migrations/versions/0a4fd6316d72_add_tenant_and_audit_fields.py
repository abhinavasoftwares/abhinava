"""add tenant and audit fields

Revision ID: 0a4fd6316d72
Revises: 20b71c73cf12
Create Date: 2026-08-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = "0a4fd6316d72"
down_revision: Union[str, Sequence[str], None] = "20b71c73cf12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. Add tenant_id temporarily as nullable
    # ---------------------------------------------------------
    op.add_column(
        "clients",
        sa.Column(
            "tenant_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    # ---------------------------------------------------------
    # 2. Generate tenant IDs for existing clients
    # ---------------------------------------------------------
    connection = op.get_bind()

    connection.execute(
        text(
            """
            UPDATE clients
            SET tenant_id = gen_random_uuid()::text
            WHERE tenant_id IS NULL
            """
        )
    )

    # ---------------------------------------------------------
    # 3. tenant_id is now safe to make NOT NULL
    # ---------------------------------------------------------
    op.alter_column(
        "clients",
        "tenant_id",
        existing_type=sa.String(length=36),
        nullable=False,
    )

    # ---------------------------------------------------------
    # 4. Ensure tenant_id is unique
    # ---------------------------------------------------------
    op.create_unique_constraint(
        "uq_clients_tenant_id",
        "clients",
        ["tenant_id"],
    )

    # ---------------------------------------------------------
    # 5. Add audit timestamps
    # ---------------------------------------------------------
    op.add_column(
        "clients",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
        ),
    )

    # ---------------------------------------------------------
    # 6. Populate timestamps for existing clients
    # ---------------------------------------------------------
    connection.execute(
        text(
            """
            UPDATE clients
            SET
                created_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE created_at IS NULL
               OR updated_at IS NULL
            """
        )
    )

    # ---------------------------------------------------------
    # 7. Make timestamps mandatory
    # ---------------------------------------------------------
    op.alter_column(
        "clients",
        "created_at",
        existing_type=sa.DateTime(),
        nullable=False,
    )

    op.alter_column(
        "clients",
        "updated_at",
        existing_type=sa.DateTime(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("clients", "updated_at")
    op.drop_column("clients", "created_at")

    op.drop_constraint(
        "uq_clients_tenant_id",
        "clients",
        type_="unique",
    )

    op.drop_column("clients", "tenant_id")