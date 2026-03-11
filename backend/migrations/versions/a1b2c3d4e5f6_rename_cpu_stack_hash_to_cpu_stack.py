"""rename cpu_stack_hash to cpu_stack as Text

Revision ID: a1b2c3d4e5f6
Revises: 9b5717f56118
Create Date: 2026-03-11

Renames the cpu_stack_hash column (was incorrectly typed as BigInteger)
to cpu_stack (Text) to match T1's actual output — a JSON-serialized list
of stack frame strings.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = '9b5717f56118'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the old BigInteger column
    op.drop_column('correlation_events', 'cpu_stack_hash')
    # Add the new Text column
    op.add_column(
        'correlation_events',
        sa.Column('cpu_stack', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('correlation_events', 'cpu_stack')
    op.add_column(
        'correlation_events',
        sa.Column('cpu_stack_hash', sa.BigInteger(), nullable=True)
    )
