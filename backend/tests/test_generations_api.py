import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Connection
from sqlalchemy.orm import Session, sessionmaker

from app.ai_providers import fake
from app.ai_providers.errors import AiBadOutputError, AiUnavailableError
from app.config import settings
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Card, CardDraft, Deck, Generation, User
from app.schemas.ai import DraftCard, GenerateCardsRequest
from app.services import ai_service, generation_service


##########################################################
#!                       FIXTURES
##########################################################
@pytest.fixture
def connection() -> Iterator[Connection]:
    connection = engine.connect()
    transaction = connection.begin()
    try:
        yield connection
    finally:
        transaction.rollback()
        connection.close()


@pytest.fixture
def db(connection: Connection) -> Iterator[Session]:
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def task_sessions(connection: Connection, monkeypatch: pytest.MonkeyPatch) -> None:
    factory = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")
    monkeypatch.setattr(generation_service, "session_factory", factory)
    monkeypatch.setattr(settings, "ai_provider", "fake")
    monkeypatch.setattr(fake, "DELAY_SECONDS", 0)


@pytest.fixture
def user(db: Session) -> User:
    return _user(db)


@pytest.fixture
def client(db: Session, user: User) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def deck(db: Session, user: User) -> Deck:
    return _deck(db, user)


def _user(db: Session) -> User:
    user = User(email=f"{uuid.uuid4()}@test.local", password_hash="x")
    db.add(user)
    db.flush()
    return user


def _deck(db: Session, user: User) -> Deck:
    deck = Deck(user_id=user.id, name="Deck")
    db.add(deck)
    db.flush()
    return deck


def _body(**fields) -> dict:
    return {"sources": [{"type": "text", "text": "apple\nbanana\ncherry"}], "mode": "qa", **fields}


def _start(client: TestClient, deck: Deck, **fields) -> dict:
    response = client.post(f"/decks/{deck.id}/generations", json=_body(**fields))
    assert response.status_code == 202
    return response.json()


def _get(client: TestClient, generation_id: str) -> dict:
    response = client.get(f"/generations/{generation_id}")
    assert response.status_code == 200
    return response.json()


def _returns(monkeypatch: pytest.MonkeyPatch, cards: list[DraftCard]) -> list[list[str]]:
    calls = []

    def generate_cards(request, existing_fronts):
        calls.append(existing_fronts)
        return cards

    monkeypatch.setattr(ai_service, "generate_cards", generate_cards)
    return calls


def _raises(monkeypatch: pytest.MonkeyPatch, error: Exception) -> None:
    def generate_cards(request, existing_fronts):
        raise error

    monkeypatch.setattr(ai_service, "generate_cards", generate_cards)


def _job(db: Session, user: User, deck: Deck, **fields) -> Generation:
    generation = Generation(
        user_id=user.id, deck_id=deck.id, request=_body(), **{"status": "queued", **fields}
    )
    db.add(generation)
    db.flush()
    return generation


##########################################################
#!                       FLOW
##########################################################
def test_post_queues_then_job_finishes_with_drafts(client: TestClient, deck: Deck):
    created = _start(client, deck, count=3, instructions="short")

    assert created["status"] == "queued"
    assert created["drafts"] == []
    assert (created["progress_done"], created["progress_total"]) == (0, 1)

    job = _get(client, created["id"])
    assert job["status"] == "done"
    assert (job["progress_done"], job["progress_total"]) == (1, 1)
    assert job["finished_at"] is not None
    assert [draft["position"] for draft in job["drafts"]] == [0, 1, 2]
    assert [draft["front"] for draft in job["drafts"]] == [
        "Q1: What does this mean? apple",
        "Q2: What does this mean? banana",
        "Q3: What does this mean? cherry",
    ]
    assert all(draft["back"].endswith("[short]") for draft in job["drafts"])
    assert all(draft["included"] and not draft["edited"] for draft in job["drafts"])


def test_prompt_gets_only_active_fronts(
    client: TestClient, deck: Deck, db: Session, monkeypatch: pytest.MonkeyPatch
):
    db.add_all(
        [
            Card(deck_id=deck.id, front="Active", back="b"),
            Card(deck_id=deck.id, front="Gone", back="b", deleted_at=datetime.now(timezone.utc)),
        ]
    )
    db.flush()
    calls = _returns(monkeypatch, [])

    _start(client, deck)

    assert calls == [["Active"]]


##########################################################
#!                       DUPLICATES
##########################################################
def test_duplicates_are_flagged_and_excluded(
    client: TestClient, deck: Deck, db: Session, monkeypatch: pytest.MonkeyPatch
):
    db.add_all(
        [
            Card(deck_id=deck.id, front="  Apple ", back="b"),
            Card(
                deck_id=deck.id,
                front="Deleted one",
                back="b",
                deleted_at=datetime.now(timezone.utc),
            ),
        ]
    )
    db.flush()
    _returns(
        monkeypatch,
        [
            DraftCard(front="apple", back="1"),
            DraftCard(front="Pear  tree", back="2"),
            DraftCard(front="PEAR tree", back="3"),
            DraftCard(front="deleted one", back="4"),
        ],
    )

    drafts = _get(client, _start(client, deck)["id"])["drafts"]

    flags = [(d["front"], d["is_duplicate"], d["included"]) for d in drafts]
    assert flags == [
        ("apple", True, False),
        ("Pear  tree", False, True),
        ("PEAR tree", True, False),
        ("deleted one", False, True),
    ]


##########################################################
#!                       OWNERSHIP
##########################################################
def test_post_to_other_users_deck_returns_404(client: TestClient, db: Session):
    other_deck = _deck(db, _user(db))
    response = client.post(f"/decks/{other_deck.id}/generations", json=_body())
    assert response.status_code == 404


def test_post_to_missing_deck_returns_404(client: TestClient):
    response = client.post(f"/decks/{uuid.uuid4()}/generations", json=_body())
    assert response.status_code == 404


def test_get_other_users_job_returns_404(client: TestClient, db: Session):
    other = _user(db)
    generation = _job(db, other, _deck(db, other))
    assert client.get(f"/generations/{generation.id}").status_code == 404


def test_get_missing_job_returns_404(client: TestClient):
    assert client.get(f"/generations/{uuid.uuid4()}").status_code == 404


##########################################################
#!                         LIST
##########################################################
def test_list_shows_own_jobs_newest_first_with_draft_count(
    client: TestClient, db: Session, user: User, deck: Deck
):
    now = datetime.now(timezone.utc)
    older = _job(db, user, deck, status="done", created_at=now - timedelta(minutes=2))
    newer = _job(db, user, deck, status="done", created_at=now - timedelta(minutes=1))
    older.drafts.extend(CardDraft(front=f"f{i}", back="b", position=i) for i in range(3))
    other = _user(db)
    _job(db, other, _deck(db, other))
    db.flush()

    response = client.get("/generations")

    assert response.status_code == 200
    rows = [(row["id"], row["draft_count"]) for row in response.json()]
    assert rows == [(str(newer.id), 0), (str(older.id), 3)]
    assert "drafts" not in response.json()[0]


##########################################################
#!                       FAILURES
##########################################################
@pytest.mark.parametrize(
    ("error", "message"),
    [
        (AiUnavailableError(), "AI is unavailable right now"),
        (AiBadOutputError(), "AI returned an unusable answer, try again"),
        (RuntimeError("boom"), "Something went wrong, try again"),
    ],
    ids=["unavailable", "bad-output", "unexpected"],
)
def test_provider_errors_fail_the_job(
    client: TestClient,
    deck: Deck,
    monkeypatch: pytest.MonkeyPatch,
    error: Exception,
    message: str,
):
    _raises(monkeypatch, error)

    job = _get(client, _start(client, deck)["id"])

    assert job["status"] == "failed"
    assert job["error_message"] == message
    assert job["finished_at"] is not None
    assert job["drafts"] == []


def test_zero_cards_is_done_without_drafts(
    client: TestClient, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    _returns(monkeypatch, [])

    job = _get(client, _start(client, deck)["id"])

    assert job["status"] == "done"
    assert job["drafts"] == []


def test_stuck_job_is_marked_timed_out(
    client: TestClient, db: Session, user: User, deck: Deck
):
    generation = _job(
        db,
        user,
        deck,
        status="running",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=6),
    )

    job = _get(client, str(generation.id))

    assert job["status"] == "failed"
    assert job["error_message"] == "Timed out, try again"


def test_run_generation_ignores_jobs_that_are_not_queued(
    db: Session, user: User, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    generation = _job(db, user, deck, status="done")
    db.commit()
    calls = _returns(monkeypatch, [DraftCard(front="f", back="b")])

    generation_service.run_generation(generation.id)

    db.expire_all()
    assert generation.status == "done"
    assert generation.drafts == []
    assert calls == []


##########################################################
#!                       VALIDATION
##########################################################
_TEXT = {"type": "text", "text": "x"}


@pytest.mark.parametrize(
    "fields",
    [
        {"sources": []},
        {"sources": [_TEXT] * 6},
        {"sources": [{"type": "text", "text": "   "}]},
        {"sources": [{"type": "link", "url": "https://example.com"}]},
        {"sources": [{"type": "text", "text": "x" * (settings.ai_max_input_chars + 1)}]},
        {
            "sources": [{"type": "text", "text": "x" * (settings.ai_max_input_chars - 5)}],
            "instructions": "x" * 10,
        },
        {"instructions": "x" * 301},
        {"count": 0},
        {"count": settings.ai_max_cards + 1},
        {"mode": "essay"},
    ],
    ids=[
        "no-sources",
        "too-many-sources",
        "empty-text",
        "unknown-type",
        "text-too-long",
        "text-plus-instructions-too-long",
        "instructions-too-long",
        "count-zero",
        "count-over-max",
        "invalid-mode",
    ],
)
def test_invalid_request_returns_422(client: TestClient, deck: Deck, fields: dict):
    response = client.post(f"/decks/{deck.id}/generations", json=_body(**fields))
    assert response.status_code == 422


def test_keep_cards_must_be_fewer_than_count():
    keep = [{"front": "a", "back": "b"}, {"front": "c", "back": "d"}]
    with pytest.raises(ValidationError):
        GenerateCardsRequest.model_validate(_body(count=2, keep_cards=keep))
