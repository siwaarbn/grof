"""initial schema

Revision ID: e9a3e26dbbf7
Revises: 
Create Date: 2026-02-02 17:26:05.997964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9a3e26dbbf7'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("start_time", sa.BigInteger, nullable=False),
        sa.Column("end_time", sa.BigInteger, nullable=True),
        sa.Column("git_commit_hash", sa.String, nullable=True),
        sa.Column("tags", sa.String, nullable=True),
    )

    op.create_table(
        "stack_frames",
        sa.Column("hash", sa.BigInteger, primary_key=True),
        sa.Column("function_name", sa.String, nullable=False),
        sa.Column("file_path", sa.String, nullable=True),
        sa.Column("line_no", sa.Integer, nullable=True),
    )

    op.create_table(
        "cpu_samples",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id")),
        sa.Column("timestamp", sa.BigInteger, nullable=False),
        sa.Column("thread_id", sa.Integer, nullable=False),
        sa.Column("stack_hash", sa.BigInteger, nullable=False),
    )

    op.create_table(
        "gpu_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("sessions.id")),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("start_time", sa.BigInteger, nullable=False),
        sa.Column("end_time", sa.BigInteger, nullable=False),
        sa.Column("stream_id", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("gpu_events")
    op.drop_table("cpu_samples")
    op.drop_table("stack_frames")
    op.drop_table("sessions")