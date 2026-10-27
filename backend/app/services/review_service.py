import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scheduling, sm2
from app.models import Card, Review
from app.schemas.review import ReviewCreate
from app.services import card_service, deck_service


##########################################################
#                       PUBLIC
##########################################################
def list_due_cards(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, limit: int
) -> list[Card]:
    deck = deck_service.get_deck(db, user_id, deck_id)
    now = datetime.now(timezone.utc)
    cards = db.scalars(
        select(Card)
        .where(
            Card.deck_id == deck.id,
            Card.deleted_at.is_(None),
            Card.next_review_at <= now,
        )
        .order_by(Card.next_review_at.asc(), Card.id.asc())
        .limit(limit)
    )
    return list(cards)


def create_review(
    db: Session, user_id: uuid.UUID, card_id: uuid.UUID, data: ReviewCreate, zone: ZoneInfo
) -> Card:
    card = card_service.get_card(db, user_id, card_id)
    result = sm2.review(card.ease_factor, card.interval_days, card.repetitions, data.rating)
    now = datetime.now(timezone.utc)

    card.ease_factor = result.ease_factor
    card.interval_days = result.interval_days
    card.repetitions = result.repetitions
    card.last_reviewed_at = now
    card.next_review_at = scheduling.next_review_at(now, result.interval_days, zone)

    db.add(
        Review(
            card_id=card.id,
            user_id=user_id,
            rating=data.rating,
            time_taken_ms=data.time_taken_ms,
            reviewed_at=now,
        )
    )
    db.commit()
    db.refresh(card)
    return card
