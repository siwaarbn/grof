"""add correlation_events table

Revision ID: 2fc065366352
Revises: 9b5717f56118
Create Date: 2026-02-03 19:48:30.000862

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fc065366352'
down_revision: Union[str, Sequence[str], None] = '9b5717f56118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        "correlation_event",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("correlation_id", sa.BigInteger, nullable=False),
        sa.Column("cpu_timestamp_ns", sa.BigInteger, nullable=False),
        sa.Column("cpu_stack_hash", sa.BigInteger, nullable=False),
        sa.Column("gpu_kernel_id", sa.Integer, sa.ForeignKey("gpu_events.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("correlation_event")