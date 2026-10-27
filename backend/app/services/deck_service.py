import uuid
from datetime import UTC, datetime
from typing import NamedTuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Card, Deck
from app.schemas.deck import DeckCreate, DeckOut, DeckUpdate

MASTERY_INTERVAL_DAYS = 21


##########################################################
#                        ERRORS
##########################################################
class DeckNotFoundError(Exception):
    pass


##########################################################
#                       PUBLIC
##########################################################
def create_deck(db: Session, user_id: uuid.UUID, data: DeckCreate) -> DeckOut:
    deck = Deck(
        user_id=user_id,
        name=data.name,
        description=data.description,
        color=data.color,
        icon=data.icon,
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return _with_stats(db, [deck])[0]


def list_decks(db: Session, user_id: uuid.UUID) -> list[DeckOut]:
    decks = db.scalars(
        select(Deck)
        .where(Deck.user_id == user_id, Deck.deleted_at.is_(None))
        .order_by(Deck.created_at.desc(), Deck.id.desc())
    )
    return _with_stats(db, list(decks))


def get_deck(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> DeckOut:
    deck = _get_active_deck(db, user_id, deck_id)
    return _with_stats(db, [deck])[0]


def update_deck(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, data: DeckUpdate
) -> DeckOut:
    deck = _get_active_deck(db, user_id, deck_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deck, field, value)
    db.commit()
    db.refresh(deck)
    return _with_stats(db, [deck])[0]


def delete_deck(db: Session, user_id: uuid.UUID, deck_id: uuid.UUID) -> None:
    deck = _get_active_deck(db, user_id, deck_id)
    deck.deleted_at = datetime.now(UTC)
    db.commit()


##########################################################
#                    PRIVATE HELPERS
##########################################################
class _DeckStats(NamedTuple):
    card_count: int = 0
    due_count: int = 0
    mastered_count: int = 0


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


def _deck_stats(db: Session, deck_ids: list[uuid.UUID]) -> dict[uuid.UUID, _DeckStats]:
    if not deck_ids:
        return {}
    now = datetime.now(UTC)
    rows = db.execute(
        select(
            Card.deck_id,
            func.count(),
            func.count().filter(Card.next_review_at <= now),
            func.count().filter(Card.interval_days >= MASTERY_INTERVAL_DAYS),
        )
        .where(Card.deck_id.in_(deck_ids), Card.deleted_at.is_(None))
        .group_by(Card.deck_id)
    )
    return {deck_id: _DeckStats(*counts) for deck_id, *counts in rows}


def _mastery_percent(mastered: int, total: int) -> int:
    if total == 0:
        return 0
    return (mastered * 200 + total) // (total * 2)


def _with_stats(db: Session, decks: list[Deck]) -> list[DeckOut]:
    stats_by_deck = _deck_stats(db, [deck.id for deck in decks])
    result = []
    for deck in decks:
        stats = stats_by_deck.get(deck.id, _DeckStats())
        result.append(
            DeckOut(
                id=deck.id,
                name=deck.name,
                description=deck.description,
                color=deck.color,
                icon=deck.icon,
                created_at=deck.created_at,
                card_count=stats.card_count,
                due_count=stats.due_count,
                mastery=_mastery_percent(stats.mastered_count, stats.card_count),
            )
        )
    return result
