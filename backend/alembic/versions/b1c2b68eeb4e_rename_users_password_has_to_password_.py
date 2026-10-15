"""rename users.password_has to password_hash

Revision ID: b1c2b68eeb4e
Revises: 2fd867aa1451
Create Date: 2026-10-15 18:01:27.794921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2b68eeb4e'
down_revision: Union[str, Sequence[str], None] = '2fd867aa1451'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "password_has", new_column_name="password_hash")



def downgrade() -> None:
    op.alter_column("users", "password_hash", new_column_name="password_has")