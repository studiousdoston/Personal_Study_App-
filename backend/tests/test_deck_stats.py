import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Card, Deck, User
from app.services import deck_service
from app.services.deck_service import MASTERY_INTERVAL_DAYS


NOW = datetime.now(timezone.utc)
PAST = NOW - timedelta(days=1)
FUTURE = NOW + timedelta(days=1)


##########################################################
#                       FIXTURES
##########################################################
@pytest.fixture
def db() -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def user(db: Session) -> User:
    user = User(email=f"{uuid.uuid4()}@test.local", password_hash="x")
    db.add(user)
    db.flush()
    return user


def _deck(db: Session, user: User, name: str = "Deck") -> Deck:
    deck = Deck(user_id=user.id, name=name)
    db.add(deck)
    db.flush()
    return deck


def _card(
    db: Session,
    deck: Deck,
    *,
    due: datetime = FUTURE,
    interval: int = 0,
    deleted: bool = False,
) -> Card:
    card = Card(
        deck_id=deck.id,
        front="f",
        back="b",
        next_review_at=due,
        interval_days=interval,
        deleted_at=NOW if deleted else None,
    )
    db.add(card)
    db.flush()
    return card


def _stats(db: Session, user: User, deck: Deck) -> tuple[int, int, int]:
    out = deck_service.get_deck(db, user.id, deck.id)
    return out.card_count, out.due_count, out.mastery


##########################################################
#                       SINGLE DECK
##########################################################
def test_empty_deck_gives_zeros(db: Session, user: User):
    assert _stats(db, user, _deck(db, user)) == (0, 0, 0)


def test_due_vs_not_due(db: Session, user: User):
    deck = _deck(db, user)
    _card(db, deck, due=PAST)
    _card(db, deck, due=PAST)
    _card(db, deck, due=FUTURE)
    assert _stats(db, user, deck) == (3, 2, 0)


def test_mastery_threshold_is_inclusive(db: Session, user: User):
    deck = _deck(db, user)
    _card(db, deck, interval=MASTERY_INTERVAL_DAYS)
    _card(db, deck, interval=MASTERY_INTERVAL_DAYS - 1)
    assert _stats(db, user, deck)[2] == 50


@pytest.mark.parametrize(
    ("mastered", "total", "expected"),
    [(1, 3, 33), (2, 3, 67), (1, 8, 13), (3, 8, 38), (3, 3, 100)],
)
def test_mastery_rounding(db: Session, user: User, mastered: int, total: int, expected: int):
    deck = _deck(db, user)
    for i in range(total):
        _card(db, deck, interval=MASTERY_INTERVAL_DAYS if i < mastered else 1)
    assert _stats(db, user, deck)[2] == expected


def test_soft_deleted_cards_are_not_counted(db: Session, user: User):
    deck = _deck(db, user)
    _card(db, deck, due=PAST, interval=30)
    _card(db, deck, due=PAST, interval=30, deleted=True)
    _card(db, deck, due=FUTURE, interval=1, deleted=True)
    assert _stats(db, user, deck) == (1, 1, 100)


##########################################################
#                         LIST
##########################################################
def test_list_returns_stats_per_deck(db: Session, user: User):
    first = _deck(db, user, "First")
    _card(db, first, due=PAST, interval=30)
    _card(db, first, due=FUTURE, interval=1)

    second = _deck(db, user, "Second")
    _card(db, second, due=PAST, interval=1)
    _card(db, second, due=PAST, interval=1)
    _card(db, second, due=PAST, interval=25)
    _card(db, second, due=PAST, interval=1, deleted=True)

    empty = _deck(db, user, "Empty")

    deleted = _deck(db, user, "Deleted")
    _card(db, deleted, due=PAST)
    deleted.deleted_at = NOW
    db.flush()

    result = {d.id: (d.card_count, d.due_count, d.mastery) for d in deck_service.list_decks(db, user.id)}

    assert result == {
        first.id: (2, 1, 50),
        second.id: (3, 3, 33),
        empty.id: (0, 0, 0),
    }


def test_list_uses_constant_number_of_queries(db: Session, user: User):
    for i in range(5):
        deck = _deck(db, user, f"Deck {i}")
        _card(db, deck, due=PAST)

    statements: list[str] = []

    def _count(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", _count)
    try:
        decks = deck_service.list_decks(db, user.id)
    finally:
        event.remove(engine, "before_cursor_execute", _count)

    assert len(decks) == 5
    assert len(statements) == 2
