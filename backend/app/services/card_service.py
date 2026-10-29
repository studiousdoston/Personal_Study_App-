import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Card, Deck
from app.schemas.card import CardCreate, CardUpdate
from app.services import deck_service
from app.services.card_images import check_card_images, check_image_changes


##########################################################
#                        ERRORS
##########################################################
class CardNotFoundError(Exception):
    pass


##########################################################
#                       PUBLIC
##########################################################
def create_card(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, data: CardCreate
) -> Card:
    deck = deck_service.get_deck(db, user_id, deck_id)
    check_card_images(db, user_id, [data.front, data.back])
    card = new_card(deck.id, data.front, data.back)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def new_card(deck_id: uuid.UUID, front: str, back: str) -> Card:
    return Card(deck_id=deck_id, front=front, back=back)


def list_cards(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> list[Card]:
    deck = deck_service.get_deck(db, user_id, deck_id)
    cards = db.scalars(
        select(Card)
        .where(Card.deck_id == deck.id, Card.deleted_at.is_(None))
        .order_by(Card.created_at.asc(), Card.id.asc())
    )
    return list(cards)


def get_card(db: Session, user_id: uuid.UUID, card_id: uuid.UUID) -> Card:
    return _get_active_card(db, user_id, card_id)


def update_card(
    db: Session, user_id: uuid.UUID, card_id: uuid.UUID, data: CardUpdate
) -> Card:
    card = _get_active_card(db, user_id, card_id)
    changes = data.model_dump(exclude_unset=True)
    check_image_changes(db, user_id, card, changes)
    for field, value in changes.items():
        setattr(card, field, value)
    db.commit()
    db.refresh(card)
    return card


def delete_card(db: Session, user_id: uuid.UUID, card_id: uuid.UUID) -> None:
    card = _get_active_card(db, user_id, card_id)
    card.deleted_at = datetime.now(timezone.utc)
    db.commit()


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _get_active_card(db: Session, user_id: uuid.UUID, card_id: uuid.UUID) -> Card:
    card = db.scalar(
        select(Card)
        .join(Card.deck)
        .where(
            Card.id == card_id,
            Deck.user_id == user_id,
            Card.deleted_at.is_(None),
            Deck.deleted_at.is_(None),
        )
    )
    if card is None:
        raise CardNotFoundError()
    return card
