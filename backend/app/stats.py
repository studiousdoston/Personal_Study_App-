from collections.abc import Iterable
from datetime import date, timedelta


def compute_streak(review_days: Iterable[date], today: date) -> int:
    days = set(review_days)
    day = today if today in days else today - timedelta(days=1)

    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    return streak
