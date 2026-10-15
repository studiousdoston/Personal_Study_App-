import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
  from app.models.deck import Deck

class User(Base):
  __tablename__ = 'users'

  id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
  email: Mapped[str] = mapped_column(String(255), unique=True)
  password_hash: Mapped[str] = mapped_column(String(255))
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )

  decks: Mapped[list["Deck"]] = relationship(
    back_populates="user", cascade="all, delete-orphan", passive_deletes=True 
  )