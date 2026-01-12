"""
add cpu gpu correlation tables

Revision ID: 114ddb448743
Revises: 3fd689858dec
Create Date: 2026-01-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "114ddb448743"
down_revision: Union[str, Sequence[str], None] = "3fd689858dec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # CPU ↔ GPU Correlation Table
    # ============================================================
    op.create_table(
        "correlation_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("correlation_id", sa.BigInteger(), nullable=False),
        sa.Column("cpu_timestamp_ns", sa.BigInteger(), nullable=False),
        sa.Column("cpu_stack_hash", sa.String(), nullable=False),
        sa.Column("cpu_function_name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ------------------------------------------------------------
    # Extend gpu_events table with correlation_id
    # ------------------------------------------------------------
    op.add_column(
        "gpu_events",
        sa.Column("correlation_id", sa.BigInteger(), nullable=True),
    )

    # ------------------------------------------------------------
    # Indexes for performance
    # ------------------------------------------------------------
    op.create_index(
        "idx_corr_session",
        "correlation_event",
        ["session_id"],
    )

    op.create_index(
        "idx_corr_corrid",
        "correlation_event",
        ["correlation_id"],
    )

    op.create_index(
        "idx_gpu_corrid",
        "gpu_events",
        ["correlation_id"],
    )

    op.create_index(
        "idx_gpu_start_time",
        "gpu_events",
        ["start_time"],
    )


def downgrade() -> None:
    # ------------------------------------------------------------
    # Rollback indexes on gpu_events
    # ------------------------------------------------------------
    op.drop_index("idx_gpu_start_time", table_name="gpu_events")
    op.drop_index("idx_gpu_corrid", table_name="gpu_events")

    # ------------------------------------------------------------
    # Rollback gpu_events column
    # ------------------------------------------------------------
    op.drop_column("gpu_events", "correlation_id")

    # ------------------------------------------------------------
    # Rollback correlation_event table
    # ------------------------------------------------------------
    op.drop_index("idx_corr_corrid", table_name="correlation_event")
    op.drop_index("idx_corr_session", table_name="correlation_event")
    op.drop_table("correlation_event")
