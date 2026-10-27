import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, get_db
from app.main import app
from app.models import User


PASSWORD = "correct-horse-battery"


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
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _email() -> str:
    return f"{uuid.uuid4()}@example.com"


def _user_exists(db: Session, email: str) -> bool:
    return db.scalar(select(User).where(User.email == email)) is not None


##########################################################
#                       REGISTER
##########################################################
def test_register_when_open_creates_user(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "allow_registration", True)
    email = _email()

    response = client.post("/auth/register", json={"email": email, "password": PASSWORD})

    assert response.status_code == 201
    assert response.json()["email"] == email
    assert _user_exists(db, email)


def test_register_when_closed_returns_403_and_creates_nothing(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "allow_registration", False)
    email = _email()

    response = client.post("/auth/register", json={"email": email, "password": PASSWORD})

    assert response.status_code == 403
    assert response.json() == {"detail": "Registration is closed"}
    assert not _user_exists(db, email)


def test_login_still_works_when_closed(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    email = _email()
    monkeypatch.setattr(settings, "allow_registration", True)
    client.post("/auth/register", json={"email": email, "password": PASSWORD})
    monkeypatch.setattr(settings, "allow_registration", False)

    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})

    assert response.status_code == 200
    assert "access_token" in response.json()


##########################################################
#                  REGISTRATION STATUS
##########################################################
@pytest.mark.parametrize("allowed", [True, False])
def test_registration_status_reflects_setting(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, allowed: bool
):
    monkeypatch.setattr(settings, "allow_registration", allowed)

    response = client.get("/auth/registration")

    assert response.status_code == 200
    assert response.json() == {"open": allowed}
