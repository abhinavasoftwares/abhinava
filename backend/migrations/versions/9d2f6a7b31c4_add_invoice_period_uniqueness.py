from alembic import op


revision = "9d2f6a7b31c4"
down_revision = "c4a8e7f1d902"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.create_unique_constraint(
        "uq_invoice_subscription_period",
        "invoices",
        [
            "client_subscription_id",
            "period_start",
            "period_end",
        ],
    )


def downgrade() -> None:

    op.drop_constraint(
        "uq_invoice_subscription_period",
        "invoices",
        type_="unique",
    )