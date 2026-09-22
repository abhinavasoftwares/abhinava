"""add billing payment communication

Revision ID: f1b7c9d2e401
Revises: e7c3f8a91b20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "f1b7c9d2e401"
down_revision = "e7c3f8a91b20"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ========================================================
    # INVOICE EXTENSIONS
    # ========================================================

    op.add_column(
        "invoices",
        sa.Column(
            "due_date",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "discount_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "notes",
            sa.String(2000),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "period_start",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "period_end",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "invoice_type",
            sa.String(50),
            nullable=False,
            server_default="SUBSCRIPTION",
        ),
    )

    op.create_check_constraint(
        "ck_invoices_discount_nonnegative",
        "invoices",
        "discount_amount >= 0",
    )

    op.create_check_constraint(
        "ck_invoices_type",
        "invoices",
        "invoice_type IN "
        "('SUBSCRIPTION', 'UPGRADE', 'DOWNGRADE', "
        "'RENEWAL', 'ADJUSTMENT')",
    )

    # ========================================================
    # PAYMENTS
    # ========================================================

    op.create_table(
        "payments",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),

        sa.Column(
            "client_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "invoice_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(12, 2),
            nullable=False,
        ),

        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default="INR",
        ),

        sa.Column(
            "payment_method",
            sa.String(50),
            nullable=False,
        ),

        sa.Column(
            "payment_reference",
            sa.String(255),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="PENDING",
        ),

        sa.Column(
            "paid_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.String(1000),
            nullable=True,
        ),

        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name="fk_payments_client",
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            ["invoice_id"],
            ["invoices.id"],
            name="fk_payments_invoice",
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            ["created_by"],
            ["platform_users.id"],
            name="fk_payments_created_by",
            ondelete="SET NULL",
        ),

        sa.CheckConstraint(
            "amount > 0",
            name="ck_payments_amount_positive",
        ),

        sa.CheckConstraint(
            "status IN "
            "('PENDING', 'SUCCESS', 'FAILED', "
            "'REFUNDED', 'CANCELLED')",
            name="ck_payments_status",
        ),
    )

    op.create_index(
        "ix_payments_client",
        "payments",
        ["client_id"],
    )

    op.create_index(
        "ix_payments_invoice",
        "payments",
        ["invoice_id"],
    )

    op.create_index(
        "ix_payments_status",
        "payments",
        ["status"],
    )

    op.create_index(
        "ix_payments_paid_at",
        "payments",
        ["paid_at"],
    )

    # ========================================================
    # CLIENT COMMUNICATIONS
    # ========================================================

    op.create_table(
        "client_communications",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),

        sa.Column(
            "client_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "channel",
            sa.String(30),
            nullable=False,
        ),

        sa.Column(
            "direction",
            sa.String(20),
            nullable=False,
        ),

        sa.Column(
            "communication_type",
            sa.String(50),
            nullable=False,
        ),

        sa.Column(
            "recipient",
            sa.String(320),
            nullable=False,
        ),

        sa.Column(
            "sender",
            sa.String(320),
            nullable=True,
        ),

        sa.Column(
            "subject",
            sa.String(500),
            nullable=True,
        ),

        sa.Column(
            "message",
            sa.String(10000),
            nullable=False,
        ),

        sa.Column(
            "template_name",
            sa.String(150),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(30),
            nullable=False,
            server_default="PENDING",
        ),

        sa.Column(
            "provider",
            sa.String(50),
            nullable=True,
        ),

        sa.Column(
            "provider_message_id",
            sa.String(255),
            nullable=True,
        ),

        sa.Column(
            "provider_response",
            postgresql.JSONB(),
            nullable=True,
        ),

        sa.Column(
            "failure_reason",
            sa.String(2000),
            nullable=True,
        ),

        sa.Column(
            "sent_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),

        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name="fk_client_communications_client",
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            ["sent_by"],
            ["platform_users.id"],
            name="fk_client_communications_sent_by",
            ondelete="SET NULL",
        ),

        sa.CheckConstraint(
            "channel IN ('EMAIL', 'WHATSAPP')",
            name="ck_client_communications_channel",
        ),

        sa.CheckConstraint(
            "direction IN ('OUTBOUND', 'INBOUND')",
            name="ck_client_communications_direction",
        ),

        sa.CheckConstraint(
            "status IN "
            "('PENDING', 'SENT', 'DELIVERED', "
            "'READ', 'FAILED', 'RECEIVED')",
            name="ck_client_communications_status",
        ),
    )

    op.create_index(
        "ix_client_communications_client",
        "client_communications",
        ["client_id"],
    )

    op.create_index(
        "ix_client_communications_channel",
        "client_communications",
        ["channel"],
    )

    op.create_index(
        "ix_client_communications_created_at",
        "client_communications",
        ["created_at"],
    )

    op.create_index(
        "ix_client_communications_provider_message",
        "client_communications",
        ["provider_message_id"],
    )


def downgrade() -> None:

    op.drop_index(
        "ix_client_communications_provider_message",
        table_name="client_communications",
    )

    op.drop_index(
        "ix_client_communications_created_at",
        table_name="client_communications",
    )

    op.drop_index(
        "ix_client_communications_channel",
        table_name="client_communications",
    )

    op.drop_index(
        "ix_client_communications_client",
        table_name="client_communications",
    )

    op.drop_table("client_communications")

    op.drop_index(
        "ix_payments_paid_at",
        table_name="payments",
    )

    op.drop_index(
        "ix_payments_status",
        table_name="payments",
    )

    op.drop_index(
        "ix_payments_invoice",
        table_name="payments",
    )

    op.drop_index(
        "ix_payments_client",
        table_name="payments",
    )

    op.drop_table("payments")

    op.drop_constraint(
        "ck_invoices_type",
        "invoices",
        type_="check",
    )

    op.drop_constraint(
        "ck_invoices_discount_nonnegative",
        "invoices",
        type_="check",
    )

    op.drop_column(
        "invoices",
        "invoice_type",
    )

    op.drop_column(
        "invoices",
        "period_end",
    )

    op.drop_column(
        "invoices",
        "period_start",
    )

    op.drop_column(
        "invoices",
        "notes",
    )

    op.drop_column(
        "invoices",
        "discount_amount",
    )

    op.drop_column(
        "invoices",
        "due_date",
    )