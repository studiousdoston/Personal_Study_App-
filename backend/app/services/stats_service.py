import uuid
from collections.abc import Iterable
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app import stats
from app.models import Card, Deck, Review
from app.schemas.stats import StatsOut


ACCURACY_DAYS = 30
CORRECT_RATING = 3


##########################################################
#                        ERRORS
##########################################################
class InvalidTimezoneError(Exception):
    pass


##########################################################
#                       PUBLIC
##########################################################
def get_stats(db: Session, user_id: uuid.UUID, tz: str) -> StatsOut:
    zone = _load_zone(tz)
    now = datetime.now(timezone.utc)
    today = now.astimezone(zone).date()

    return StatsOut(
        cards_due=_cards_due(db, user_id, now),
        reviews_today=_reviews_since(db, user_id, _local_midnight_utc(today, zone)),
        streak_days=stats.compute_streak(_review_days(db, user_id, tz), today),
        accuracy_30d=_accuracy(db, user_id, now - timedelta(days=ACCURACY_DAYS)),
    )


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _load_zone(tz: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise InvalidTimezoneError(tz) from None


def _local_midnight_utc(today: date, zone: ZoneInfo) -> datetime:
    return datetime.combine(today, time.min, tzinfo=zone).astimezone(timezone.utc)


def _cards_due(db: Session, user_id: uuid.UUID, now: datetime) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Card)
        .join(Deck, Card.deck_id == Deck.id)
        .where(
            Deck.user_id == user_id,
            Deck.deleted_at.is_(None),
            Card.deleted_at.is_(None),
            Card.next_review_at <= now,
        )
    )


def _reviews_since(db: Session, user_id: uuid.UUID, since: datetime) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Review)
        .where(Review.user_id == user_id, Review.reviewed_at >= since)
    )


def _review_days(db: Session, user_id: uuid.UUID, tz: str) -> Iterable[date]:
    local_day = cast(func.timezone(tz, Review.reviewed_at), Date)
    return db.scalars(select(local_day).where(Review.user_id == user_id).distinct())


def _accuracy(db: Session, user_id: uuid.UUID, since: datetime) -> float | None:
    total, correct = db.execute(
        select(
            func.count(),
            func.count().filter(Review.rating >= CORRECT_RATING),
        ).where(Review.user_id == user_id, Review.reviewed_at >= since)
    ).one()
    if total == 0:
        return None
    return round(correct / total, 2)
