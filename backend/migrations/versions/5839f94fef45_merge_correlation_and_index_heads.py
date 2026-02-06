"""merge correlation and index heads

Revision ID: 5839f94fef45
Revises: 1c6768eaaca6, 2fc065366352
Create Date: 2026-02-06 02:07:33.044381

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5839f94fef45'
down_revision: Union[str, Sequence[str], None] = ('1c6768eaaca6', '2fc065366352')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
