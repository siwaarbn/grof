"""add index on cpu_function_name for grouping queries
Revision ID: 005_add_function_index
Revises: 004_fix_correlation_events
Create Date: 2026-03-09
"""
from typing import Sequence, Union
from alembic import op

revision: str = '005_add_function_index'
down_revision: Union[str, Sequence[str], None] = '004_fix_correlation_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.create_index(
        "idx_correlation_event_session_function",
        "correlation_events",
        ["session_id", "cpu_function_name"],
    )
    op.create_index(
        "idx_correlation_event_timestamp",
        "correlation_events",
        ["cpu_timestamp_ns"],
    )
    op.create_index(
        "idx_gpu_event_session_id",
        "gpu_events",
        ["session_id"],
    )

def downgrade():
    op.drop_index("idx_correlation_event_session_function", table_name="correlation_events")
    op.drop_index("idx_correlation_event_timestamp", table_name="correlation_events")
    op.drop_index("idx_gpu_event_session_id", table_name="gpu_events")
