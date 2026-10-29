import io
import os
import secrets
import tempfile
import uuid
import warnings
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pillow_heif
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Card, CardDraft, Upload

pillow_heif.register_heif_opener()
Image.MAX_IMAGE_PIXELS = 40_000_000

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF"}
WEBP_QUALITY = 82
ORPHAN_AFTER = timedelta(hours=24)
FILE_MODE = 0o644


##########################################################
#!                       ERRORS
##########################################################
class UploadTooLargeError(Exception):
    pass


class UnsupportedImageError(Exception):
    pass


##########################################################
#!                       PUBLIC
##########################################################
def upload_image(db: Session, user_id: uuid.UUID, data: bytes) -> Upload:
    if len(data) > settings.upload_max_bytes:
        raise UploadTooLargeError()
    source = _open(data)
    image = _prepare(source)
    webp = _encode_webp(image, source.info.get("icc_profile"))

    cleanup_orphan_uploads(db, user_id)
    filename = f"{secrets.token_hex(16)}.webp"
    path = _write_atomic(filename, webp)
    try:
        upload = Upload(
            user_id=user_id,
            filename=filename,
            width=image.width,
            height=image.height,
            size_bytes=len(webp),
        )
        db.add(upload)
        db.commit()
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    db.refresh(upload)
    return upload


def cleanup_orphan_uploads(db: Session, user_id: uuid.UUID | None = None) -> int:
    in_cards = select(Card.id).where(
        or_(Card.front.contains(Upload.filename), Card.back.contains(Upload.filename))
    )
    in_drafts = select(CardDraft.id).where(
        or_(CardDraft.front.contains(Upload.filename), CardDraft.back.contains(Upload.filename))
    )
    query = select(Upload).where(
        Upload.created_at < datetime.now(timezone.utc) - ORPHAN_AFTER,
        ~in_cards.exists(),
        ~in_drafts.exists(),
    )
    if user_id is not None:
        query = query.where(Upload.user_id == user_id)
    orphans = list(db.scalars(query))
    for upload in orphans:
        (_uploads_dir() / upload.filename).unlink(missing_ok=True)
        db.delete(upload)
    db.commit()
    return len(orphans)


##########################################################
#!                    PRIVATE HELPERS
##########################################################
def _uploads_dir() -> Path:
    return Path(settings.uploads_dir)


def _open(data: bytes) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(data))
            if image.format not in ALLOWED_FORMATS:
                raise UnsupportedImageError()
            image.load()
    except (Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise UploadTooLargeError() from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise UnsupportedImageError() from None
    return image


def _prepare(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    has_alpha = image.mode in ("RGBA", "LA", "PA") or (
        image.mode == "P" and "transparency" in image.info
    )
    image = image.convert("RGBA" if has_alpha else "RGB")
    image.thumbnail((settings.upload_max_side, settings.upload_max_side), Image.Resampling.LANCZOS)
    return image


def _encode_webp(image: Image.Image, icc_profile: bytes | None) -> bytes:
    buffer = io.BytesIO()
    image.save(
        buffer, format="WEBP", quality=WEBP_QUALITY, exif=b"", xmp=b"", icc_profile=icc_profile
    )
    return buffer.getvalue()


def _write_atomic(filename: str, data: bytes) -> Path:
    folder = _uploads_dir()
    folder.mkdir(parents=True, exist_ok=True)
    final_path = folder / filename
    fd, temp_name = tempfile.mkstemp(dir=folder, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as temp:
            temp.write(data)
        os.chmod(temp_name, FILE_MODE)
        os.replace(temp_name, final_path)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise
    return final_path
