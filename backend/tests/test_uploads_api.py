import io
import re
import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import ExifTags, Image, ImageCms
from sqlalchemy import Connection, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import Card, CardDraft, Deck, Generation, Upload, User
from app.services import upload_service

URL_PATTERN = re.compile(r"^/uploads/[0-9a-f]{32}\.webp$")


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
def uploads_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "uploads_dir", str(tmp_path))
    return tmp_path


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
    deck = Deck(user_id=user.id, name="Deck")
    db.add(deck)
    db.flush()
    return deck


def _user(db: Session) -> User:
    user = User(email=f"{uuid.uuid4()}@test.local", password_hash="x")
    db.add(user)
    db.flush()
    return user


def _image(
    fmt: str = "JPEG",
    size: tuple[int, int] = (40, 30),
    mode: str = "RGB",
    color: str | tuple[int, ...] = "red",
    **save,
) -> bytes:
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, format=fmt, **save)
    return buffer.getvalue()


def _post(client: TestClient, data: bytes, name: str = "photo.jpg"):
    return client.post("/uploads", files={"file": (name, data, "application/octet-stream")})


def _saved(uploads_dir: Path, url: str) -> Image.Image:
    return Image.open(uploads_dir / url.removeprefix("/uploads/"))


def _upload(db: Session, user: User, age: timedelta = timedelta(0)) -> Upload:
    upload = Upload(
        user_id=user.id,
        filename=f"{uuid.uuid4().hex}.webp",
        width=10,
        height=10,
        size_bytes=10,
        created_at=datetime.now(timezone.utc) - age,
    )
    db.add(upload)
    db.flush()
    return upload


def _md(upload: Upload) -> str:
    return f"![diagram](/uploads/{upload.filename})"


##########################################################
#!                       UPLOAD
##########################################################
def test_jpeg_with_gps_is_saved_as_webp_without_exif(client: TestClient, uploads_dir: Path):
    exif = Image.Exif()
    gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
    gps[ExifTags.GPS.GPSLatitudeRef] = "N"
    gps[ExifTags.GPS.GPSLatitude] = (52.0, 30.0, 0.0)
    icc_profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

    response = _post(client, _image(exif=exif, icc_profile=icc_profile))

    assert response.status_code == 201
    body = response.json()
    assert URL_PATTERN.match(body["url"])
    assert (body["width"], body["height"]) == (40, 30)
    saved = _saved(uploads_dir, body["url"])
    assert saved.format == "WEBP"
    assert "exif" not in saved.info
    assert len(saved.getexif()) == 0
    assert "xmp" not in saved.info
    assert saved.info["icc_profile"] == icc_profile


@pytest.mark.parametrize(
    ("size", "expected"), [((3000, 2000), (1600, 1067)), ((800, 600), (800, 600))]
)
def test_long_side_is_capped_without_upscaling(
    client: TestClient, uploads_dir: Path, size: tuple[int, int], expected: tuple[int, int]
):
    response = _post(client, _image(size=size))

    assert response.status_code == 201
    assert _saved(uploads_dir, response.json()["url"]).size == expected


def test_png_keeps_transparency(client: TestClient, uploads_dir: Path):
    response = _post(client, _image("PNG", mode="RGBA", color=(255, 0, 0, 0)), "logo.png")

    assert response.status_code == 201
    saved = _saved(uploads_dir, response.json()["url"])
    assert saved.mode == "RGBA"
    assert saved.getpixel((0, 0))[3] == 0


def test_heic_is_accepted(client: TestClient, uploads_dir: Path):
    try:
        data = _image("HEIF")
    except Exception:
        pytest.skip("pillow-heif cannot encode HEIF here")

    response = _post(client, data, "photo.heic")

    assert response.status_code == 201
    assert _saved(uploads_dir, response.json()["url"]).format == "WEBP"


@pytest.mark.parametrize("data", [b"just some text, not an image", _image("GIF")])
def test_non_images_and_other_formats_are_rejected(client: TestClient, data: bytes):
    response = _post(client, data)

    assert response.status_code == 415


def test_file_over_limit_is_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    data = _image()
    monkeypatch.setattr(settings, "upload_max_bytes", len(data) - 1)

    response = _post(client, data)

    assert response.status_code == 413


def test_body_over_limit_is_rejected_before_parsing(
    client: TestClient, db: Session, user: User, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "upload_max_bytes", 0)

    response = _post(client, b"x" * 100_000)

    assert response.status_code == 413
    assert db.scalar(select(func.count(Upload.id)).where(Upload.user_id == user.id)) == 0


def test_upload_requires_auth(db: Session):
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = _post(TestClient(app), _image())
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401


def test_failed_insert_removes_file(
    db: Session, user: User, uploads_dir: Path, monkeypatch: pytest.MonkeyPatch
):
    existing = _upload(db, user)
    monkeypatch.setattr(upload_service.secrets, "token_hex", lambda _: existing.filename[:-5])

    with pytest.raises(Exception):
        upload_service.upload_image(db, user.id, _image())

    assert list(uploads_dir.iterdir()) == []


##########################################################
#!                       CARDS
##########################################################
def test_card_with_one_image_is_created(client: TestClient, db: Session, user: User, deck: Deck):
    back = f"A cell\n\n{_md(_upload(db, user))}"

    response = client.post(f"/decks/{deck.id}/cards", json={"front": "Cell?", "back": back})

    assert response.status_code == 201
    assert response.json()["back"] == back


@pytest.mark.parametrize(
    ("front", "back"), [("Plain front", "Plain back"), ("**Bold** _front_", "- one\n- two")]
)
def test_cards_without_images_are_unchanged(client: TestClient, deck: Deck, front: str, back: str):
    response = client.post(f"/decks/{deck.id}/cards", json={"front": front, "back": back})

    assert response.status_code == 201
    assert (response.json()["front"], response.json()["back"]) == (front, back)


def test_card_with_two_images_is_rejected(
    client: TestClient, db: Session, user: User, deck: Deck
):
    body = {"front": _md(_upload(db, user)), "back": _md(_upload(db, user))}

    response = client.post(f"/decks/{deck.id}/cards", json=body)

    assert response.status_code == 422
    assert response.json()["detail"] == "A card can have only one image"


@pytest.mark.parametrize(
    ("back", "detail"),
    [
        ("![x](https://example.com/cat.webp)", "Images must be uploaded"),
        (f"![x](/uploads/{'a' * 32}.png)", "Images must be uploaded"),
        ("![x][ref]\n\n[ref]: https://example.com/cat.png", "Images must be uploaded"),
        ('<img src="/uploads/x.webp">', "Images must be added with the image button"),
        (f"![x](/uploads/{'a' * 32}.webp)", "Unknown image"),
    ],
)
def test_card_with_invalid_image_is_rejected(
    client: TestClient, deck: Deck, back: str, detail: str
):
    response = client.post(f"/decks/{deck.id}/cards", json={"front": "Q", "back": back})

    assert response.status_code == 422
    assert response.json()["detail"] == detail


@pytest.mark.parametrize(
    "back",
    [
        "What does `<img>` do?",
        "Use ``![a](http://x)`` or `<IMG src=y>` in HTML",
        "Example:\n\n```html\n<img src=\"x\">\n![a](http://x)\n```",
        "~~~\n<img src=\"x\">\n~~~",
    ],
)
def test_images_inside_code_are_ignored(client: TestClient, deck: Deck, back: str):
    response = client.post(f"/decks/{deck.id}/cards", json={"front": "HTML", "back": back})

    assert response.status_code == 201
    assert response.json()["back"] == back


def test_real_image_outside_code_still_counts(
    client: TestClient, db: Session, user: User, deck: Deck
):
    code = "```\n![a](http://x)\n```"
    one = {"front": "Q", "back": f"{code}\n\n{_md(_upload(db, user))}"}
    two = {"front": _md(_upload(db, user)), "back": f"`code` {_md(_upload(db, user))}"}

    allowed = client.post(f"/decks/{deck.id}/cards", json=one)
    rejected = client.post(f"/decks/{deck.id}/cards", json=two)

    assert allowed.status_code == 201
    assert rejected.status_code == 422
    assert rejected.json()["detail"] == "A card can have only one image"


def test_card_with_another_users_upload_is_rejected(
    client: TestClient, db: Session, deck: Deck
):
    other_upload = _upload(db, _user(db))

    response = client.post(f"/decks/{deck.id}/cards", json={"front": "Q", "back": _md(other_upload)})

    assert response.status_code == 422
    assert response.json()["detail"] == "Unknown image"


def test_update_counts_images_in_unsent_field(
    client: TestClient, db: Session, user: User, deck: Deck
):
    card = Card(deck_id=deck.id, front=_md(_upload(db, user)), back="A")
    db.add(card)
    db.flush()

    second_image = client.patch(f"/cards/{card.id}", json={"back": _md(_upload(db, user))})
    plain_text = client.patch(f"/cards/{card.id}", json={"back": "New answer"})

    assert second_image.status_code == 422
    assert plain_text.status_code == 200


##########################################################
#!                       DRAFTS
##########################################################
def _generation(db: Session, user: User, deck: Deck, backs: list[str]) -> Generation:
    generation = Generation(
        user_id=user.id,
        deck_id=deck.id,
        status="done",
        request={"sources": [{"type": "text", "text": "x"}], "mode": "qa", "count": len(backs)},
        drafts=[
            CardDraft(front=f"Q{position}", back=back, position=position)
            for position, back in enumerate(backs)
        ],
    )
    db.add(generation)
    db.flush()
    return generation


def test_patch_draft_applies_image_rules(
    client: TestClient, db: Session, user: User, deck: Deck
):
    draft = _generation(db, user, deck, ["A"]).drafts[0]

    external = client.patch(f"/drafts/{draft.id}", json={"back": "![x](http://evil.test/a.webp)"})
    own = client.patch(f"/drafts/{draft.id}", json={"back": _md(_upload(db, user))})

    assert external.status_code == 422
    assert external.json()["detail"] == "Images must be uploaded"
    assert own.status_code == 200


def test_save_with_one_bad_draft_saves_nothing(
    client: TestClient, db: Session, user: User, deck: Deck
):
    generation = _generation(db, user, deck, [_md(_upload(db, user)), "<img src=x>"])

    response = client.post(f"/generations/{generation.id}/save")

    assert response.status_code == 422
    assert db.scalar(select(func.count(Card.id)).where(Card.deck_id == deck.id)) == 0
    assert db.get(Generation, generation.id) is not None


def test_save_with_valid_images_saves_all(
    client: TestClient, db: Session, user: User, deck: Deck
):
    generation = _generation(db, user, deck, [_md(_upload(db, user)), "Plain"])

    response = client.post(f"/generations/{generation.id}/save")

    assert response.status_code == 200
    assert response.json()["saved_count"] == 2


##########################################################
#!                       CLEANUP
##########################################################
def _with_file(uploads_dir: Path, upload: Upload) -> Path:
    path = uploads_dir / upload.filename
    path.write_bytes(b"webp")
    return path


def test_cleanup_deletes_only_old_unreferenced_uploads(
    db: Session, user: User, deck: Deck, uploads_dir: Path
):
    old = timedelta(hours=25)
    orphan = _upload(db, user, old)
    in_card = _upload(db, user, old)
    in_archived_card = _upload(db, user, old)
    in_draft = _upload(db, user, old)
    recent = _upload(db, user, timedelta(hours=1))
    files = {upload.id: _with_file(uploads_dir, upload) for upload in [orphan, in_card, recent]}
    db.add(Card(deck_id=deck.id, front="Q", back=_md(in_card)))
    db.add(
        Card(
            deck_id=deck.id,
            front=_md(in_archived_card),
            back="A",
            deleted_at=datetime.now(timezone.utc),
        )
    )
    _generation(db, user, deck, [_md(in_draft)])
    ids = [orphan.id, in_card.id, in_archived_card.id, in_draft.id, recent.id]

    deleted = upload_service.cleanup_orphan_uploads(db, user.id)

    remaining = set(db.scalars(select(Upload.id).where(Upload.id.in_(ids))))
    assert deleted == 1
    assert remaining == {in_card.id, in_archived_card.id, in_draft.id, recent.id}
    assert not files[orphan.id].exists()
    assert files[in_card.id].exists() and files[recent.id].exists()


def test_cleanup_for_one_user_leaves_other_users(db: Session, user: User):
    other_orphan = _upload(db, _user(db), timedelta(days=2))

    upload_service.cleanup_orphan_uploads(db, user.id)

    assert db.get(Upload, other_orphan.id) is not None


def test_cleanup_for_everyone_removes_row_when_file_is_missing(db: Session, user: User):
    orphan = _upload(db, user, timedelta(days=2))

    deleted = upload_service.cleanup_orphan_uploads(db)

    assert deleted >= 1
    assert db.get(Upload, orphan.id) is None
