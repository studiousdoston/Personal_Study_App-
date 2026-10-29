import re
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Card, CardDraft, Upload

MAX_IMAGES_PER_CARD = 1
TEXT_FIELDS = ("front", "back")

_UPLOAD_URL = re.compile(r"^/uploads/([0-9a-f]{32}\.webp)$")
_INLINE_IMAGE = re.compile(r"!\[[^\]]*\]\(\s*<?([^\s)>]*)")
_REFERENCE_IMAGE = re.compile(r"!\[[^\]]*\]\[")
_RAW_IMG = re.compile(r"<img\b", re.IGNORECASE)
_FENCED_CODE = re.compile(
    r"^ {0,3}(?P<fence>(?P<char>[`~])(?P=char){2,})[^\n]*(?:\n|\Z)"
    r".*?(?:^ {0,3}(?P=fence)(?P=char)*[ \t]*$|\Z)",
    re.MULTILINE | re.DOTALL,
)
_INLINE_CODE = re.compile(r"(?<!`)(`+)(?!`).+?(?<!`)\1(?!`)", re.DOTALL)


##########################################################
#!                       ERRORS
##########################################################
class CardImageError(Exception):
    detail = "Invalid image"


class RawImageError(CardImageError):
    detail = "Images must be added with the image button"


class ImageNotUploadedError(CardImageError):
    detail = "Images must be uploaded"


class TooManyImagesError(CardImageError):
    detail = "A card can have only one image"


class UnknownImageError(CardImageError):
    detail = "Unknown image"


##########################################################
#!                       PUBLIC
##########################################################
def check_card_images(
    db: Session, user_id: uuid.UUID, sent: Sequence[str], unchanged: Sequence[str] = ()
) -> None:
    sent = [_without_code(text) for text in sent]
    unchanged = [_without_code(text) for text in unchanged]
    if any(_RAW_IMG.search(text) for text in sent):
        raise RawImageError()
    urls = [url for text in sent for url in _image_urls(text)]
    filenames = [_filename(url) for url in urls]
    total = len(urls) + sum(len(_image_urls(text)) for text in unchanged)
    if total > MAX_IMAGES_PER_CARD:
        raise TooManyImagesError()
    if filenames and not _all_owned(db, user_id, filenames):
        raise UnknownImageError()


def check_image_changes(
    db: Session, user_id: uuid.UUID, current: Card | CardDraft, changes: dict[str, Any]
) -> None:
    sent = [changes[field] for field in TEXT_FIELDS if field in changes]
    unchanged = [getattr(current, field) for field in TEXT_FIELDS if field not in changes]
    if sent:
        check_card_images(db, user_id, sent, unchanged)


##########################################################
#!                    PRIVATE HELPERS
##########################################################
def _without_code(text: str) -> str:
    return _INLINE_CODE.sub(" ", _FENCED_CODE.sub("\n", text))


def _image_urls(text: str) -> list[str]:
    inline = _INLINE_IMAGE.findall(text)
    reference = ["" for _ in _REFERENCE_IMAGE.finditer(text)]
    return [*inline, *reference]


def _filename(url: str) -> str:
    match = _UPLOAD_URL.match(url)
    if match is None:
        raise ImageNotUploadedError()
    return match[1]


def _all_owned(db: Session, user_id: uuid.UUID, filenames: list[str]) -> bool:
    wanted = set(filenames)
    found = db.scalar(
        select(func.count(Upload.id)).where(Upload.user_id == user_id, Upload.filename.in_(wanted))
    )
    return found == len(wanted)
