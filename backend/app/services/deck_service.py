import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Deck
from app.schemas.deck import DeckCreate, DeckUpdate


##########################################################
#                        ERRORS
##########################################################
class DeckNotFoundError(Exception):
    pass


##########################################################
#                       PUBLIC
##########################################################
def create_deck(db: Session, user_id: uuid.UUID, data: DeckCreate) -> Deck:
    deck = Deck(user_id=user_id, name=data.name, description=data.description)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


def list_decks(db: Session, user_id: uuid.UUID) -> list[Deck]:
    decks = db.scalars(
        select(Deck)
        .where(Deck.user_id == user_id, Deck.deleted_at.is_(None))
        .order_by(Deck.created_at.desc(), Deck.id.desc())
    )
    return list(decks)


def get_deck(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> Deck:
    return _get_active_deck(db, user_id, deck_id)


def update_deck(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, data: DeckUpdate
) -> Deck:
    deck = _get_active_deck(db, user_id, deck_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deck, field, value)
    db.commit()
    db.refresh(deck)
    return deck


def delete_deck(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> None:
    deck = _get_active_deck(db, user_id, deck_id)
    deck.deleted_at = datetime.now(timezone.utc)
    db.commit()


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _get_active_deck(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> Deck:
    deck = db.scalar(
        select(Deck).where(
            Deck.id == deck_id,
            Deck.user_id == user_id,
            Deck.deleted_at.is_(None),
        )
    )
    if deck is None:
        raise DeckNotFoundError()
    return deck
