from datetime import date, timedelta

from app.stats import compute_streak


TODAY = date(2026, 10, 15)


def _days_ago(*offsets: int) -> list[date]:
    return [TODAY - timedelta(days=n) for n in offsets]


##########################################################
#                       START DAY
##########################################################
def test_no_days_gives_0():
    assert compute_streak([], TODAY) == 0


def test_today_only_gives_1():
    assert compute_streak(_days_ago(0), TODAY) == 1


def test_yesterday_only_gives_1():
    assert compute_streak(_days_ago(1), TODAY) == 1


def test_only_two_days_ago_gives_0():
    assert compute_streak(_days_ago(2), TODAY) == 0


##########################################################
#                     CONSECUTIVE DAYS
##########################################################
def test_today_yesterday_and_two_days_ago_gives_3():
    assert compute_streak(_days_ago(0, 1, 2), TODAY) == 3


def test_gap_stops_the_count():
    assert compute_streak(_days_ago(0, 1, 3, 4, 5), TODAY) == 2


def test_duplicates_do_not_change_the_result():
    assert compute_streak(_days_ago(0, 0, 1, 1, 1, 2), TODAY) == 3


def test_accepts_any_iterable():
    assert compute_streak(iter(_days_ago(1, 2)), TODAY) == 2
