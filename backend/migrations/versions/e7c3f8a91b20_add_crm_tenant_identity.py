"""add crm tenant identity and account lifecycle fields

Revision ID: e7c3f8a91b20
Revises: add_turnover_bands
Create Date: 2026-09-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7c3f8a91b20"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "b4050cbd809d"

branch_labels = None
depends_on = None


def upgrade() -> None:
    # ========================================================
    # ADD NEW CLIENT COLUMNS
    # ========================================================

    op.add_column(
        "clients",
        sa.Column(
            "crm_slug",
            sa.String(length=120),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "welcome_message",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "account_status",
            sa.String(length=30),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "disabled_at",
            sa.DateTime(),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "disabled_by",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "clients",
        sa.Column(
            "disabled_reason",
            sa.String(length=1000),
            nullable=True,
        ),
    )

    # ========================================================
    # BACKFILL CRM SLUGS
    #
    # Existing clients receive deterministic slugs derived
    # from business_name.
    #
    # Collisions are resolved with:
    #
    #   -2
    #   -3
    #   -4
    #   ...
    # ========================================================

    op.execute(
        """
        DO $$
        DECLARE
            client_record RECORD;
            base_slug TEXT;
            candidate_slug TEXT;
            suffix INTEGER;
        BEGIN
            FOR client_record IN
                SELECT id, business_name
                FROM clients
                ORDER BY id
            LOOP
                base_slug := regexp_replace(
                    lower(
                        trim(
                            client_record.business_name
                        )
                    ),
                    '[^a-z0-9]+',
                    '-',
                    'g'
                );

                base_slug := trim(
                    both '-'
                    from base_slug
                );

                IF base_slug IS NULL
                   OR base_slug = '' THEN
                    base_slug :=
                        'client-'
                        || client_record.id;
                END IF;

                candidate_slug := base_slug;
                suffix := 2;

                WHILE EXISTS (
                    SELECT 1
                    FROM clients
                    WHERE crm_slug = candidate_slug
                      AND id <> client_record.id
                )
                LOOP
                    candidate_slug :=
                        base_slug
                        || '-'
                        || suffix;

                    suffix := suffix + 1;
                END LOOP;

                UPDATE clients
                SET crm_slug = candidate_slug
                WHERE id = client_record.id;
            END LOOP;
        END
        $$;
        """
    )

    # ========================================================
    # BACKFILL ACCOUNT STATUS
    # ========================================================

    op.execute(
        """
        UPDATE clients
        SET account_status = 'ACTIVE'
        WHERE account_status IS NULL
        """
    )

    # ========================================================
    # ENFORCE REQUIRED CRM IDENTITY
    # ========================================================

    op.alter_column(
        "clients",
        "crm_slug",
        nullable=False,
    )

    op.alter_column(
        "clients",
        "account_status",
        nullable=False,
    )

    # ========================================================
    # UNIQUE CRM SLUG
    # ========================================================

    op.create_index(
        "ix_clients_crm_slug",
        "clients",
        ["crm_slug"],
        unique=True,
    )


def downgrade() -> None:
    # Remove unique index first.
    op.drop_index(
        "ix_clients_crm_slug",
        table_name="clients",
    )

    op.drop_column(
        "clients",
        "disabled_reason",
    )

    op.drop_column(
        "clients",
        "disabled_by",
    )

    op.drop_column(
        "clients",
        "disabled_at",
    )

    op.drop_column(
        "clients",
        "account_status",
    )

    op.drop_column(
        "clients",
        "welcome_message",
    )

    op.drop_column(
        "clients",
        "crm_slug",
    )