from decimal import Decimal

import pytest

from app.sm2 import SM2Result, review


NEW_CARD = (Decimal("2.50"), 0, 0)


##########################################################
#                       INTERVALS
##########################################################
def test_first_success_gives_interval_1():
    result = review(*NEW_CARD, rating=4)
    assert result.interval_days == 1
    assert result.repetitions == 1


def test_second_success_gives_interval_6():
    result = review(Decimal("2.50"), 1, 1, rating=4)
    assert result.interval_days == 6
    assert result.repetitions == 2


def test_four_successes_from_new_card():
    result = SM2Result(*NEW_CARD)
    intervals = []
    for _ in range(4):
        result = review(*result, rating=4)
        intervals.append(result.interval_days)

    assert intervals == [1, 6, 15, 38]
    assert result.ease_factor == Decimal("2.50")
    assert result.repetitions == 4


def test_failure_after_successes_resets():
    result = SM2Result(*NEW_CARD)
    for _ in range(3):
        result = review(*result, rating=4)

    failed = review(*result, rating=2)

    assert failed.repetitions == 0
    assert failed.interval_days == 1
    assert failed.ease_factor < result.ease_factor


##########################################################
#                      EASE FACTOR
##########################################################
@pytest.mark.parametrize(
    ("rating", "expected_ease"),
    [
        (5, Decimal("2.60")),
        (4, Decimal("2.50")),
        (3, Decimal("2.36")),
    ],
)
def test_ease_change_by_rating(rating, expected_ease):
    assert review(*NEW_CARD, rating=rating).ease_factor == expected_ease


def test_ease_never_drops_below_minimum():
    result = review(Decimal("1.30"), 6, 2, rating=0)
    assert result.ease_factor == Decimal("1.30")


@pytest.mark.parametrize("rating", [0, 1, 2, 3, 4, 5])
def test_ease_is_decimal_with_two_places(rating):
    ease = review(*NEW_CARD, rating=rating).ease_factor
    assert isinstance(ease, Decimal)
    assert ease.as_tuple().exponent == -2


##########################################################
#                     INVALID RATING
##########################################################
@pytest.mark.parametrize("rating", [-1, 6])
def test_invalid_rating_raises(rating):
    with pytest.raises(ValueError):
        review(*NEW_CARD, rating=rating)
