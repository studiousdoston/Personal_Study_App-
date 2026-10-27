from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


DAY_START_HOUR = 4


def next_review_at(reviewed_at: datetime, interval_days: int, zone: ZoneInfo) -> datetime:
    if interval_days == 0:
        return reviewed_at

    local = reviewed_at.astimezone(zone)
    study_date = (local - timedelta(hours=DAY_START_HOUR)).date()
    due_date = study_date + timedelta(days=interval_days)
    due_local = datetime.combine(due_date, time(hour=DAY_START_HOUR), tzinfo=zone)
    return due_local.astimezone(timezone.utc)
