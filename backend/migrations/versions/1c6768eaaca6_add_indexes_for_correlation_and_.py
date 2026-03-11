"""add indexes for correlation and timeline queries

Revision ID: 1c6768eaaca6
Revises: 2fc065366352
Create Date: 2026-02-06 02:05:11.845522

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c6768eaaca6'
down_revision = '2fc065366352'
branch_labels: Union[str, Sequence[str], None] = None
depends_on = ('2fc065366352',)


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "idx_gpu_event_correlation_id",
        "gpu_event",
        ["correlation_id"],
    )

    op.create_index(
        "idx_correlation_event_correlation_id",
        "correlation_events",
        ["correlation_id"],
    )
    op.create_index(
        "idx_gpu_event_session_time",
        "gpu_event",
        ["session_id", "start_time", "end_time"],
    )

    op.create_index(
        "idx_stack_frame_function_name",
        "stack_frame",
        ["function_name"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "idx_gpu_event_correlation_id",
        table_name="gpu_event",
    )

    op.drop_index(
        "idx_correlation_event_correlation_id",
        table_name="correlation_events",
    )

    op.drop_index(
        "idx_gpu_event_session_time",
        table_name="gpu_event",
    )

    op.drop_index(
        "idx_stack_frame_function_name",
        table_name="stack_frame",
    )
