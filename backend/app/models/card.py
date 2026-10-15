import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING


from sqlalchemy import DateTime, ForeignKey, Index, Numeric, Text, func

from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.database import Base

if TYPE_CHECKING:
  from app.models.deck import Deck

class Card(Base):
  __tablename__ = "cards"
  __table_args__ =  (Index("ix_cards_deck_id_next_review_at", "deck_id", "next_review_at"),)

  id: Mapped[str] = mapped_column(primary_key=True, default=uuid.uuid4)
  deck_id: Mapped[uuid.UUID] = mapped_column(
    ForeignKey("decks.id", ondelete="CASCADE")
  )
  front: Mapped[str] = mapped_column(Text)
  back: Mapped[str] = mapped_column(Text)

  #SM-2 scheduling state
  ease_factor: Mapped[Decimal] = mapped_column(
    Numeric(4, 2),
    default=Decimal("2.50"),
    server_default="2.50"
  )
  interval_days: Mapped[int] = mapped_column(
    default=0, server_default="0")
  repetitions: Mapped[int] = mapped_column(default=0, server_default="0")
  next_review_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
  last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

  #Soft delete: NULL = active, timestamp = archived
  deleted_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))

  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )

  deck: Mapped["Deck"] = relationship(back_populates="cards")

