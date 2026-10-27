import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import User
from app.schemas.deck import DEFAULT_DECK_COLOR, DEFAULT_DECK_ICON


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


def _create(client: TestClient, **fields) -> dict:
    response = client.post("/decks", json={"name": "Deck", **fields})
    assert response.status_code == 201
    return response.json()


##########################################################
#                        CREATE
##########################################################
def test_create_without_color_or_icon_uses_defaults(client: TestClient):
    deck = _create(client)
    assert deck["color"] == DEFAULT_DECK_COLOR == "green"
    assert deck["icon"] == DEFAULT_DECK_ICON == "book-open"


def test_create_with_color_and_icon(client: TestClient):
    deck = _create(client, color="purple", icon="flask-conical")
    assert deck["color"] == "purple"
    assert deck["icon"] == "flask-conical"


@pytest.mark.parametrize(
    "fields", [{"color": "red"}, {"icon": "rocket"}, {"color": None}, {"icon": None}]
)
def test_create_rejects_invalid_values(client: TestClient, fields: dict):
    response = client.post("/decks", json={"name": "Deck", **fields})
    assert response.status_code == 422


##########################################################
#                        UPDATE
##########################################################
def test_patch_color_keeps_icon(client: TestClient):
    deck = _create(client, color="blue", icon="music")
    response = client.patch(f"/decks/{deck['id']}", json={"color": "amber"})
    assert response.status_code == 200
    assert response.json()["color"] == "amber"
    assert response.json()["icon"] == "music"


@pytest.mark.parametrize(
    "fields", [{"color": None}, {"icon": None}, {"color": "red"}, {"icon": "rocket"}]
)
def test_patch_rejects_null_and_invalid_values(client: TestClient, fields: dict):
    deck = _create(client, color="blue", icon="music")
    response = client.patch(f"/decks/{deck['id']}", json=fields)
    assert response.status_code == 422

    unchanged = client.get(f"/decks/{deck['id']}").json()
    assert (unchanged["color"], unchanged["icon"]) == ("blue", "music")


##########################################################
#                         LIST
##########################################################
def test_list_includes_color_and_icon(client: TestClient):
    first = _create(client, name="First", color="rose", icon="dna")
    second = _create(client, name="Second")

    result = {d["id"]: (d["color"], d["icon"]) for d in client.get("/decks").json()}

    assert result == {
        first["id"]: ("rose", "dna"),
        second["id"]: ("green", "book-open"),
    }
