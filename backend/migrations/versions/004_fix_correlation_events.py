"""fix correlation_events columns for T1 integration
Revision ID: 004_fix_correlation_events
Revises: 1c6768eaaca6
Create Date: 2026-03-09
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_fix_correlation_events'
down_revision: Union[str, Sequence[str], None] = '1c6768eaaca6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.drop_column('correlation_events', 'cpu_stack_hash')
    op.add_column('correlation_events', sa.Column('cpu_function_name', sa.String, nullable=True))
    op.add_column('correlation_events', sa.Column('cpu_stack', sa.String, nullable=True))

def downgrade():
    op.drop_column('correlation_events', 'cpu_function_name')
    op.drop_column('correlation_events', 'cpu_stack')
    op.add_column('correlation_events', sa.Column('cpu_stack_hash', sa.BigInteger, nullable=True))
