"""convert card ids to uuid

Revision ID: af005f5bc482
Revises: 0a6811e6149f
Create Date: 2026-10-15 21:31:44.740591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af005f5bc482'
down_revision: Union[str, Sequence[str], None] = '0a6811e6149f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('reviews_card_id_fkey', 'reviews', type_='foreignkey')
    op.alter_column('cards', 'id',
               existing_type=sa.VARCHAR(),
               type_=sa.Uuid(),
               existing_nullable=False,
               postgresql_using='id::uuid')
    op.alter_column('reviews', 'card_id',
               existing_type=sa.VARCHAR(),
               type_=sa.Uuid(),
               existing_nullable=False,
               postgresql_using='card_id::uuid')
    op.create_foreign_key('reviews_card_id_fkey', 'reviews', 'cards',
               ['card_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('reviews_card_id_fkey', 'reviews', type_='foreignkey')
    op.alter_column('reviews', 'card_id',
               existing_type=sa.Uuid(),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               postgresql_using='card_id::varchar')
    op.alter_column('cards', 'id',
               existing_type=sa.Uuid(),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               postgresql_using='id::varchar')
    op.create_foreign_key('reviews_card_id_fkey', 'reviews', 'cards',
               ['card_id'], ['id'], ondelete='CASCADE')
