import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Connection, select
from sqlalchemy.orm import Session, sessionmaker

from app.ai_providers import fake
from app.ai_providers.errors import AiBadOutputError, AiUnavailableError
from app.config import settings
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Card, CardDraft, Deck, Generation, User
from app.schemas.ai import DraftCard, GenerateCardsRequest, GenerationOptions
from app.services import ai_service, card_service, generation_service


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
        user_id=user.id,
        deck_id=deck.id,
        request=GenerationOptions.model_validate(_body()).model_dump(mode="json"),
        **{"status": "queued", **fields},
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
    assert (created["mode"], created["count"], created["instructions"]) == ("qa", 3, "short")
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
    assert "request" not in response.json()[0]
    assert response.json()[0]["mode"] == "qa"


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
        queued_at=datetime.now(timezone.utc) - timedelta(minutes=6),
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


##########################################################
#!                   ACTION HELPERS
##########################################################
def _spy(monkeypatch: pytest.MonkeyPatch) -> list[GenerateCardsRequest]:
    requests = []

    def generate_cards(request, existing_fronts):
        requests.append(request)
        return fake.generate_cards(request, existing_fronts)

    monkeypatch.setattr(ai_service, "generate_cards", generate_cards)
    return requests


def _refine(client: TestClient, generation_id: str, **body):
    return client.post(f"/generations/{generation_id}/refine", json=body)


def _patch(client: TestClient, draft_id: str, **body):
    return client.patch(f"/drafts/{draft_id}", json=body)


def _done_job(client: TestClient, deck: Deck, **fields) -> dict:
    return _get(client, _start(client, deck, **fields)["id"])


def _job_with_draft(db: Session, user: User, deck: Deck, **fields) -> Generation:
    generation = _job(db, user, deck, **fields)
    generation.drafts.append(CardDraft(front="f", back="b", position=0))
    db.flush()
    return generation


def _soft_delete(db: Session, deck: Deck) -> None:
    deck.deleted_at = datetime.now(timezone.utc)
    db.flush()


##########################################################
#!                        REFINE
##########################################################
def test_refine_keeps_edited_drafts_first_and_replaces_the_rest(
    client: TestClient, db: Session, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    job = _done_job(client, deck, count=3)
    first, second, third = job["drafts"]
    assert job["refines_left"] == 2
    _patch(client, second["id"], front="My own question")
    _patch(client, third["id"], included=False)
    requests = _spy(monkeypatch)

    response = _refine(client, job["id"], instructions="harder")

    assert response.status_code == 202
    assert response.json()["status"] == "queued"
    [request] = requests
    assert request.keep_cards == [DraftCard(front="My own question", back=second["back"])]
    assert request.avoid_cards == [DraftCard(front=third["front"], back=third["back"])]
    assert request.instructions == "harder"
    assert request.new_card_count == 2

    refined = _get(client, job["id"])
    assert refined["status"] == "done"
    assert refined["refines_left"] == 1
    assert [d["position"] for d in refined["drafts"]] == [0, 1, 2]
    assert refined["drafts"][0]["id"] == second["id"]
    assert refined["drafts"][0]["edited"] is True
    assert {d["id"] for d in refined["drafts"]}.isdisjoint({first["id"], third["id"]})
    assert all(d["back"].endswith("[harder]") for d in refined["drafts"][1:])

    generation = db.get(Generation, uuid.UUID(job["id"]))
    db.refresh(generation)
    assert generation.request["instructions"] == "harder"
    assert generation.run_count == 2


def test_refine_flags_new_drafts_that_repeat_kept_ones(
    client: TestClient, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    job = _done_job(client, deck, count=2)
    _patch(client, job["drafts"][0]["id"], back="Edited back")
    _returns(monkeypatch, [DraftCard(front=job["drafts"][0]["front"].upper(), back="x")])

    _refine(client, job["id"])

    drafts = _get(client, job["id"])["drafts"]
    assert [(d["edited"], d["is_duplicate"], d["included"]) for d in drafts] == [
        (True, False, True),
        (False, True, False),
    ]


def test_third_refine_returns_409(client: TestClient, deck: Deck):
    job = _done_job(client, deck)
    assert _refine(client, job["id"]).status_code == 202
    assert _refine(client, job["id"]).status_code == 202
    assert _get(client, job["id"])["refines_left"] == 0

    response = _refine(client, job["id"])

    assert response.status_code == 409
    assert response.json()["detail"] == "No refines left"


@pytest.mark.parametrize("status", ["queued", "running"])
def test_refine_while_running_returns_409(
    client: TestClient, db: Session, user: User, deck: Deck, status: str
):
    generation = _job(db, user, deck, status=status)

    response = _refine(client, str(generation.id))

    assert response.status_code == 409
    assert response.json()["detail"] == "Generation is still running"


def test_refine_with_every_draft_edited_returns_409(client: TestClient, deck: Deck):
    job = _done_job(client, deck, count=2)
    for draft in job["drafts"]:
        _patch(client, draft["id"], back="Mine")

    response = _refine(client, job["id"])

    assert response.status_code == 409
    assert response.json()["detail"] == "Nothing to regenerate"


def test_failed_refine_keeps_old_drafts_and_run_count(
    client: TestClient, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    job = _done_job(client, deck, count=3)
    _raises(monkeypatch, AiUnavailableError())

    _refine(client, job["id"])

    failed = _get(client, job["id"])
    assert failed["status"] == "failed"
    assert failed["drafts"] == job["drafts"]
    assert failed["refines_left"] == 2


def test_refine_with_too_long_instructions_returns_422(client: TestClient, deck: Deck):
    text = "x" * (settings.ai_max_input_chars - 5)
    job = _done_job(client, deck, sources=[{"type": "text", "text": text}])

    response = _refine(client, job["id"], instructions="x" * 10)

    assert response.status_code == 422
    assert _get(client, job["id"])["status"] == "done"


def test_refine_on_soft_deleted_deck_returns_404(client: TestClient, db: Session, deck: Deck):
    job = _done_job(client, deck)
    _soft_delete(db, deck)

    assert _refine(client, job["id"]).status_code == 404


##########################################################
#!                        DRAFTS
##########################################################
def test_editing_front_sets_edited_and_recomputes_duplicate(
    client: TestClient, db: Session, deck: Deck
):
    db.add(Card(deck_id=deck.id, front="Existing card", back="b"))
    db.flush()
    first, second, third = _done_job(client, deck, count=3)["drafts"]

    against_card = _patch(client, first["id"], front="  existing   CARD ").json()
    against_draft = _patch(client, second["id"], front=third["front"].lower()).json()
    unique = _patch(client, first["id"], front="Brand new").json()

    assert (against_card["edited"], against_card["is_duplicate"]) == (True, True)
    assert against_card["front"] == "existing   CARD"
    assert against_card["included"] is True
    assert against_draft["is_duplicate"] is True
    assert unique["is_duplicate"] is False


def test_editing_back_sets_edited_only(client: TestClient, deck: Deck):
    draft = _done_job(client, deck)["drafts"][0]

    unchanged = _patch(client, draft["id"], back=draft["back"]).json()
    changed = _patch(client, draft["id"], back="New back").json()

    assert unchanged["edited"] is False
    assert (changed["back"], changed["edited"]) == ("New back", True)
    assert changed["is_duplicate"] == draft["is_duplicate"]


def test_toggling_included(client: TestClient, deck: Deck):
    draft = _done_job(client, deck)["drafts"][0]

    off = _patch(client, draft["id"], included=False).json()
    on = _patch(client, draft["id"], included=True).json()

    assert (off["included"], off["edited"]) == (False, False)
    assert on["included"] is True


@pytest.mark.parametrize("field", ["front", "back", "included"])
def test_null_draft_field_returns_422(client: TestClient, deck: Deck, field: str):
    draft = _done_job(client, deck)["drafts"][0]
    assert _patch(client, draft["id"], **{field: None}).status_code == 422


def test_empty_front_returns_422(client: TestClient, deck: Deck):
    draft = _done_job(client, deck)["drafts"][0]
    assert _patch(client, draft["id"], front="   ").status_code == 422


def test_other_users_draft_returns_404(client: TestClient, db: Session):
    other = _user(db)
    draft = _job_with_draft(db, other, _deck(db, other), status="done").drafts[0]

    assert _patch(client, str(draft.id), back="x").status_code == 404
    assert client.delete(f"/drafts/{draft.id}").status_code == 404


def test_draft_of_soft_deleted_deck_returns_404(client: TestClient, db: Session, deck: Deck):
    draft = _done_job(client, deck)["drafts"][0]
    _soft_delete(db, deck)

    assert _patch(client, draft["id"], back="x").status_code == 404
    assert client.delete(f"/drafts/{draft['id']}").status_code == 404


def test_draft_actions_while_running_return_409(
    client: TestClient, db: Session, user: User, deck: Deck
):
    draft = _job_with_draft(db, user, deck, status="running").drafts[0]

    assert _patch(client, str(draft.id), back="x").status_code == 409
    assert client.delete(f"/drafts/{draft.id}").status_code == 409


def test_delete_draft(client: TestClient, deck: Deck):
    job = _done_job(client, deck, count=2)
    first, second = job["drafts"]

    response = client.delete(f"/drafts/{first['id']}")

    assert response.status_code == 204
    assert [d["id"] for d in _get(client, job["id"])["drafts"]] == [second["id"]]


##########################################################
#!                         SAVE
##########################################################
def _deck_cards(client: TestClient, deck: Deck) -> list[dict]:
    return client.get(f"/decks/{deck.id}/cards").json()


def test_save_creates_included_cards_in_order_and_removes_the_job(
    client: TestClient, db: Session, deck: Deck
):
    job = _done_job(client, deck, count=3)
    first, second, third = job["drafts"]
    _patch(client, second["id"], included=False)
    _patch(client, third["id"], front="Edited third")

    response = client.post(f"/generations/{job['id']}/save")

    assert response.status_code == 200
    assert response.json() == {"deck_id": str(deck.id), "saved_count": 2}
    cards = _deck_cards(client, deck)
    assert [card["front"] for card in cards] == [first["front"], "Edited third"]

    manual = client.post(f"/decks/{deck.id}/cards", json={"front": "m", "back": "m"}).json()
    sm2_fields = ("ease_factor", "interval_days", "repetitions", "last_reviewed_at")
    for card in cards:
        assert {f: card[f] for f in sm2_fields} == {f: manual[f] for f in sm2_fields}

    assert client.get(f"/generations/{job['id']}").status_code == 404
    assert db.scalars(select(CardDraft).where(CardDraft.generation_id == job["id"])).all() == []


def test_save_with_nothing_included_returns_422(client: TestClient, deck: Deck):
    job = _done_job(client, deck, count=1)
    _patch(client, job["drafts"][0]["id"], included=False)

    response = client.post(f"/generations/{job['id']}/save")

    assert response.status_code == 422
    assert response.json()["detail"] == "No drafts selected"


def test_save_on_soft_deleted_deck_returns_404_and_saves_nothing(
    client: TestClient, db: Session, deck: Deck
):
    job = _done_job(client, deck)
    _soft_delete(db, deck)

    response = client.post(f"/generations/{job['id']}/save")

    assert response.status_code == 404
    assert response.json()["detail"] == "Deck not found"
    assert db.scalars(select(Card).where(Card.deck_id == deck.id)).all() == []
    assert db.get(Generation, uuid.UUID(job["id"])) is not None


def test_save_while_running_returns_409(
    client: TestClient, db: Session, user: User, deck: Deck
):
    generation = _job_with_draft(db, user, deck, status="running")
    assert client.post(f"/generations/{generation.id}/save").status_code == 409


def test_save_other_users_job_returns_404(client: TestClient, db: Session):
    other = _user(db)
    generation = _job_with_draft(db, other, _deck(db, other), status="done")
    assert client.post(f"/generations/{generation.id}/save").status_code == 404


def test_save_that_fails_halfway_saves_nothing(
    client: TestClient, db: Session, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    job = _done_job(client, deck, count=3)
    real_new_card = card_service.new_card
    calls = []

    def new_card(*args):
        calls.append(args)
        if len(calls) == 2:
            raise RuntimeError("boom")
        return real_new_card(*args)

    monkeypatch.setattr(card_service, "new_card", new_card)

    with pytest.raises(RuntimeError):
        client.post(f"/generations/{job['id']}/save")

    assert len(calls) == 2
    assert _deck_cards(client, deck) == []
    assert len(_get(client, job["id"])["drafts"]) == 3


##########################################################
#!                       DISCARD
##########################################################
def test_discard_returns_204_then_get_is_404(client: TestClient, deck: Deck):
    job = _done_job(client, deck)

    assert client.delete(f"/generations/{job['id']}").status_code == 204
    assert client.get(f"/generations/{job['id']}").status_code == 404


def test_discard_other_users_job_returns_404(client: TestClient, db: Session):
    other = _user(db)
    generation = _job(db, other, _deck(db, other))
    assert client.delete(f"/generations/{generation.id}").status_code == 404


def test_run_after_discard_does_nothing(
    client: TestClient, db: Session, user: User, deck: Deck, monkeypatch: pytest.MonkeyPatch
):
    generation = _job(db, user, deck, status="running")
    db.commit()
    client.delete(f"/generations/{generation.id}")
    calls = _returns(monkeypatch, [DraftCard(front="f", back="b")])

    generation_service._finish(generation.id, [DraftCard(front="f", back="b")], [])
    generation_service.run_generation(generation.id)

    assert calls == []
    assert db.scalars(select(CardDraft).where(CardDraft.generation_id == generation.id)).all() == []


##########################################################
#!                 VISIBILITY + CLEANUP
##########################################################
def test_old_jobs_are_cleaned_up(client: TestClient, db: Session, user: User, deck: Deck):
    now = datetime.now(timezone.utc)
    expired = _job_with_draft(db, user, deck, status="done", created_at=now - timedelta(days=8))
    kept = _job(db, user, deck, status="done", created_at=now - timedelta(days=6))
    expired_id = expired.id

    listed = [row["id"] for row in client.get("/generations").json()]

    assert listed == [str(kept.id)]
    assert client.get(f"/generations/{expired_id}").status_code == 404
    assert client.get(f"/generations/{kept.id}").status_code == 200
    assert db.scalars(select(CardDraft).where(CardDraft.generation_id == expired_id)).all() == []


def test_soft_deleted_deck_hides_its_jobs(
    client: TestClient, db: Session, user: User, deck: Deck
):
    hidden = _job(db, user, deck, status="done")
    other_deck = _deck(db, user)
    visible = _job(db, user, other_deck, status="done")
    _soft_delete(db, deck)

    listed = [row["id"] for row in client.get("/generations").json()]

    assert listed == [str(visible.id)]
    assert client.get(f"/generations/{hidden.id}").status_code == 404
