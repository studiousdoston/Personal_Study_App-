from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from app.dependencies import get_client_timezone
from app.scheduling import next_review_at


SEOUL = ZoneInfo("Asia/Seoul")
NEW_YORK = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")


def _local(zone: ZoneInfo, *args: int) -> datetime:
    return datetime(*args, tzinfo=zone)


##########################################################
#                     STUDY DAY START
##########################################################
def test_late_evening_review_is_due_next_morning():
    due = next_review_at(_local(SEOUL, 2026, 10, 27, 23, 0), 1, SEOUL)
    assert due == _local(SEOUL, 2026, 10, 28, 4, 0)


def test_review_before_4am_belongs_to_previous_study_day():
    due = next_review_at(_local(SEOUL, 2026, 10, 28, 2, 0), 1, SEOUL)
    assert due == _local(SEOUL, 2026, 10, 28, 4, 0)


@pytest.mark.parametrize(
    ("hour", "minute", "expected_day"),
    [(3, 59, 28), (4, 0, 29)],
)
def test_boundary_is_exactly_4am(hour: int, minute: int, expected_day: int):
    due = next_review_at(_local(SEOUL, 2026, 10, 28, hour, minute), 1, SEOUL)
    assert due == _local(SEOUL, 2026, 10, expected_day, 4, 0)


def test_interval_6_days():
    due = next_review_at(_local(SEOUL, 2026, 10, 27, 23, 0), 6, SEOUL)
    assert due == _local(SEOUL, 2026, 11, 2, 4, 0)


def test_interval_0_is_due_immediately():
    reviewed_at = _local(SEOUL, 2026, 10, 27, 23, 0)
    assert next_review_at(reviewed_at, 0, SEOUL) == reviewed_at


def test_result_is_utc():
    due = next_review_at(_local(SEOUL, 2026, 10, 27, 23, 0), 1, SEOUL)
    assert due.tzinfo == timezone.utc
    assert due == datetime(2026, 10, 27, 19, 0, tzinfo=timezone.utc)


##########################################################
#                   DAYLIGHT SAVING TIME
##########################################################
def test_dst_ends_in_new_york():
    reviewed_at = _local(NEW_YORK, 2026, 10, 31, 20, 0)
    due = next_review_at(reviewed_at, 1, NEW_YORK)
    assert due == datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)


def test_dst_starts_in_new_york():
    reviewed_at = _local(NEW_YORK, 2026, 3, 7, 20, 0)
    due = next_review_at(reviewed_at, 1, NEW_YORK)
    assert due == datetime(2026, 3, 8, 8, 0, tzinfo=timezone.utc)


##########################################################
#                     X-TIMEZONE HEADER
##########################################################
def test_valid_header_is_used():
    assert get_client_timezone("Asia/Seoul") == SEOUL


@pytest.mark.parametrize("header", [None, "", "Mars/Olympus", "../etc/passwd", "America"])
def test_missing_or_invalid_header_falls_back_to_utc(header: str | None):
    assert get_client_timezone(header) == UTC
