"""allow invited platform identities

Revision ID: 54e845a38929
Revises: 6931f894a174
Create Date: 2026-08-20 14:49:33.273661

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "54e845a38929"
down_revision: Union[str, Sequence[str], None] = "6931f894a174"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. Allow an invited identity to exist before its
    #    external identity-provider subject is bound.
    # ---------------------------------------------------------
    op.alter_column(
        "platform_users",
        "external_subject",
        existing_type=sa.String(length=255),
        nullable=True,
    )

    # ---------------------------------------------------------
    # 2. Enforce the identity lifecycle at the database level.
    #
    #    INVITED:
    #        external_subject may be NULL.
    #
    #    ACTIVE / SUSPENDED / DISABLED:
    #        external_subject must be present.
    #
    #    This prevents an application bug from creating an
    #    authenticated platform identity without a verified
    #    external identity binding.
    # ---------------------------------------------------------
    op.create_check_constraint(
        "ck_platform_users_external_subject_lifecycle",
        "platform_users",
        """
        (
            status = 'INVITED'
            OR external_subject IS NOT NULL
        )
        """,
    )


def downgrade() -> None:
    # ---------------------------------------------------------
    # We must not silently delete or fabricate identity
    # bindings during downgrade.
    #
    # If invited identities still have NULL external_subject,
    # restoring NOT NULL would be unsafe.
    # ---------------------------------------------------------
    connection = op.get_bind()

    result = connection.execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM platform_users
            WHERE external_subject IS NULL
            """
        )
    )

    null_identity_count = result.scalar_one()

    if null_identity_count:
        raise RuntimeError(
            "Cannot downgrade: platform_users contains "
            f"{null_identity_count} identity/identities with "
            "NULL external_subject."
        )

    # ---------------------------------------------------------
    # 1. Remove lifecycle constraint.
    # ---------------------------------------------------------
    op.drop_constraint(
        "ck_platform_users_external_subject_lifecycle",
        "platform_users",
        type_="check",
    )

    # ---------------------------------------------------------
    # 2. Restore original NOT NULL requirement.
    # ---------------------------------------------------------
    op.alter_column(
        "platform_users",
        "external_subject",
        existing_type=sa.String(length=255),
        nullable=False,
    )