from alembic import op
import sqlalchemy as sa


revision = "add_correlation_events"
down_revision = "e9a3e26dbbf7"  # your latest applied revision
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "correlation_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("correlation_id", sa.BigInteger, nullable=False),
        sa.Column("cpu_timestamp", sa.BigInteger, nullable=False),
        sa.Column("cpu_stack_hash", sa.BigInteger, nullable=False),
        sa.Column("gpu_kernel_id", sa.Integer, nullable=True),
    )

    op.add_column(
        "gpu_events",
        sa.Column("correlation_id", sa.BigInteger, nullable=True),
    )


def downgrade():
    op.drop_column("gpu_events", "correlation_id")
    op.drop_table("correlation_events")
