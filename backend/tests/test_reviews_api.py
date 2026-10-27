import uuid
from collections.abc import Iterator
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Card, Deck, User
from app.scheduling import DAY_START_HOUR


SEOUL = ZoneInfo("Asia/Seoul")


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


@pytest.fixture
def client(db: Session, user: User) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def card(db: Session, user: User) -> Card:
    deck = Deck(user_id=user.id, name="Deck")
    db.add(deck)
    db.flush()
    card = Card(deck_id=deck.id, front="f", back="b", next_review_at=datetime.now(timezone.utc))
    db.add(card)
    db.flush()
    return card


def _expected_due(reviewed_at: datetime, interval_days: int, zone: ZoneInfo) -> datetime:
    local = reviewed_at.astimezone(zone)
    study_date = (local - timedelta(hours=DAY_START_HOUR)).date()
    return datetime.combine(
        study_date + timedelta(days=interval_days), time(DAY_START_HOUR), tzinfo=zone
    )


##########################################################
#                         TESTS
##########################################################
def test_review_with_seoul_header_is_due_at_4am_seoul(client: TestClient, card: Card):
    response = client.post(
        f"/cards/{card.id}/reviews", json={"rating": 4}, headers={"X-Timezone": "Asia/Seoul"}
    )

    assert response.status_code == 201
    body = response.json()
    due = datetime.fromisoformat(body["next_review_at"])
    reviewed_at = datetime.fromisoformat(body["last_reviewed_at"])

    assert body["interval_days"] == 1
    assert due.astimezone(SEOUL).time() == time(DAY_START_HOUR, 0)
    assert due == _expected_due(reviewed_at, 1, SEOUL)


@pytest.mark.parametrize("headers", [{}, {"X-Timezone": "Not/AZone"}])
def test_review_without_valid_header_uses_utc(client: TestClient, card: Card, headers: dict):
    response = client.post(f"/cards/{card.id}/reviews", json={"rating": 4}, headers=headers)

    assert response.status_code == 201
    due = datetime.fromisoformat(response.json()["next_review_at"])
    assert due.astimezone(timezone.utc).time() == time(DAY_START_HOUR, 0)
