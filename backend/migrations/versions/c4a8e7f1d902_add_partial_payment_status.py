from alembic import op


revision = "c4a8e7f1d902"
down_revision = "f1b7c9d2e401"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.drop_constraint(
        "ck_invoices_status",
        "invoices",
        type_="check",
    )

    op.create_check_constraint(
        "ck_invoices_status",
        "invoices",
        "status IN "
        "('DRAFT', 'ISSUED', 'PARTIALLY_PAID', "
        "'PAID', 'VOID', 'OVERDUE')",
    )


def downgrade() -> None:

    op.execute(
        """
        UPDATE invoices
        SET status = 'ISSUED'
        WHERE status = 'PARTIALLY_PAID'
        """
    )

    op.drop_constraint(
        "ck_invoices_status",
        "invoices",
        type_="check",
    )

    op.create_check_constraint(
        "ck_invoices_status",
        "invoices",
        "status IN "
        "('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE')"
    )