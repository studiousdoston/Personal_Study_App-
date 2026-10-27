import json
import uuid
from collections.abc import Iterator
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai_providers import claude, fake
from app.config import settings
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Card, Deck, User


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
def deck(db: Session, user: User) -> Deck:
    deck = Deck(user_id=user.id, name="Deck")
    db.add(deck)
    db.flush()
    return deck


@pytest.fixture(autouse=True)
def fake_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_provider", "fake")
    monkeypatch.setattr(fake, "DELAY_SECONDS", 0)


@pytest.fixture
def claude_client(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock = MagicMock()
    monkeypatch.setattr(settings, "ai_provider", "claude")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(claude, "_client", lambda: mock)
    return mock


def _body(**fields) -> dict:
    return {"sources": [{"type": "text", "text": "apple\nbanana\ncherry"}], "mode": "qa", **fields}


def _card(front: str, back: str = "b") -> dict:
    return {"front": front, "back": back}


def _response(text: str, stop_reason: str = "end_turn") -> SimpleNamespace:
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=text)], stop_reason=stop_reason
    )


def _generate(client: TestClient, deck: Deck, **fields):
    return client.post(f"/decks/{deck.id}/generate", json=_body(**fields))


##########################################################
#                     FAKE PROVIDER
##########################################################
def test_fake_returns_count_minus_keep_cards(client: TestClient, deck: Deck):
    response = _generate(client, deck, count=5, keep_cards=[_card("k1"), _card("k2")])
    assert response.status_code == 200
    assert len(response.json()["cards"]) == 3


def test_fake_output_shows_mode_and_instructions(client: TestClient, deck: Deck):
    qa = _generate(client, deck, count=2, instructions="  be brief  ").json()["cards"]
    vocab = _generate(client, deck, count=2, mode="vocab").json()["cards"]

    assert qa[0]["front"].startswith("Q1:")
    assert "apple" in qa[0]["front"]
    assert all(card["back"].endswith("[be brief]") for card in qa)
    assert vocab[0]["front"] == "Word 1: apple"
    assert "[" not in vocab[0]["back"]


##########################################################
#                       OWNERSHIP
##########################################################
def test_other_users_deck_returns_404(client: TestClient, db: Session):
    other = User(email=f"{uuid.uuid4()}@test.local", password_hash="x")
    db.add(other)
    db.flush()
    other_deck = Deck(user_id=other.id, name="Theirs")
    db.add(other_deck)
    db.flush()

    assert _generate(client, other_deck).status_code == 404


def test_missing_deck_returns_404(client: TestClient):
    response = client.post(f"/decks/{uuid.uuid4()}/generate", json=_body())
    assert response.status_code == 404


##########################################################
#                       VALIDATION
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
        {"count": 2, "keep_cards": [_card("a"), _card("b")]},
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
        "keep-not-below-count",
        "invalid-mode",
    ],
)
def test_invalid_request_returns_422(client: TestClient, deck: Deck, fields: dict):
    assert _generate(client, deck, **fields).status_code == 422


##########################################################
#                     CLAUDE PROVIDER
##########################################################
def test_claude_parses_cleans_and_caps_cards(
    client: TestClient, deck: Deck, claude_client: MagicMock
):
    output = {
        "cards": [
            {"front": "  What is A?  ", "back": " A "},
            {"front": "   ", "back": "dropped"},
            {"front": "What is B?", "back": "B"},
            {"front": "What is C?", "back": "C"},
        ]
    }
    claude_client.messages.create.return_value = _response(json.dumps(output))

    response = _generate(client, deck, count=2)

    assert response.status_code == 200
    assert response.json()["cards"] == [
        {"front": "What is A?", "back": "A"},
        {"front": "What is B?", "back": "B"},
    ]


def test_claude_prompt_contains_all_inputs(
    client: TestClient, deck: Deck, db: Session, claude_client: MagicMock
):
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            Card(deck_id=deck.id, front="Active front", back="b"),
            Card(deck_id=deck.id, front="Deleted front", back="b", deleted_at=now),
        ]
    )
    db.flush()
    claude_client.messages.create.return_value = _response(
        json.dumps({"cards": [_card("New?", "Yes")]})
    )

    response = _generate(
        client,
        deck,
        mode="vocab",
        count=4,
        instructions="Use examples",
        keep_cards=[_card("Kept front", "Kept back")],
        avoid_cards=[_card("Avoided front")],
    )

    assert response.status_code == 200
    kwargs = claude_client.messages.create.call_args.kwargs
    message = kwargs["messages"][0]["content"]
    assert kwargs["model"] == settings.ai_model
    assert "Mode vocab" in kwargs["system"]
    assert kwargs["output_config"]["format"]["type"] == "json_schema"
    assert '<source index="1">\napple\nbanana\ncherry\n</source>' in message
    assert "<instructions>\nUse examples\n</instructions>" in message
    assert "<front>Kept front</front><back>Kept back</back>" in message
    assert "<front>Avoided front</front>" in message
    assert "<front>Active front</front>" in message
    assert "Deleted front" not in message
    assert "<card_count>3</card_count>" in message


@pytest.mark.parametrize(
    "response",
    [
        _response("not json"),
        _response(json.dumps({"items": []})),
        _response(json.dumps({"cards": [{"front": " ", "back": " "}]})),
        _response(json.dumps({"cards": [_card("a")]}), stop_reason="max_tokens"),
    ],
    ids=["not-json", "wrong-shape", "only-empty-cards", "truncated"],
)
def test_claude_garbage_output_returns_502(
    client: TestClient, deck: Deck, claude_client: MagicMock, response: SimpleNamespace
):
    claude_client.messages.create.return_value = response

    result = _generate(client, deck)

    assert result.status_code == 502
    assert result.json()["detail"] == "AI returned an unusable answer, try again"


def test_claude_sdk_error_returns_503(client: TestClient, deck: Deck, claude_client: MagicMock):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    claude_client.messages.create.side_effect = anthropic.APIConnectionError(request=request)

    response = _generate(client, deck)

    assert response.status_code == 503
    assert response.json()["detail"] == "AI is unavailable right now"


def test_claude_without_api_key_returns_503(
    client: TestClient, deck: Deck, claude_client: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "anthropic_api_key", None)

    response = _generate(client, deck)

    assert response.status_code == 503
    claude_client.messages.create.assert_not_called()
