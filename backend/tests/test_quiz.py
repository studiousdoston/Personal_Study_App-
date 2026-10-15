import random

import pytest

from app.quiz import build_options


POOL = ["Madrid", "Rome", "Berlin", "Lisbon", "Vienna"]


##########################################################
#                        SHAPE
##########################################################
def test_returns_four_options():
    options = build_options("Paris", POOL, random.Random(1))
    assert len(options) == 4


def test_exactly_one_correct_with_correct_text():
    options = build_options("Paris", POOL, random.Random(1))
    correct = [o for o in options if o.is_correct]
    assert len(correct) == 1
    assert correct[0].text == "Paris"


@pytest.mark.parametrize("seed", range(20))
def test_all_texts_distinct(seed):
    options = build_options("Paris", POOL, random.Random(seed))
    assert len({o.text for o in options}) == 4


##########################################################
#                      DUPLICATES
##########################################################
@pytest.mark.parametrize("seed", range(20))
def test_pool_duplicates_and_correct_copies_are_skipped(seed):
    pool = ["Paris", "Madrid", "Madrid", "Paris", "Rome", "Rome", "Berlin"]
    options = build_options("Paris", pool, random.Random(seed))

    wrong = sorted(o.text for o in options if not o.is_correct)
    assert wrong == ["Berlin", "Madrid", "Rome"]
    assert [o.text for o in options].count("Paris") == 1


##########################################################
#                      RANDOMNESS
##########################################################
def test_same_seed_gives_same_result():
    first = build_options("Paris", POOL, random.Random(42))
    second = build_options("Paris", POOL, random.Random(42))
    assert first == second


##########################################################
#                     NOT ENOUGH
##########################################################
@pytest.mark.parametrize(
    "pool",
    [
        [],
        ["Madrid", "Rome"],
        ["Madrid", "Madrid", "Rome", "Rome"],
        ["Paris", "Paris", "Madrid", "Rome"],
    ],
)
def test_not_enough_distinct_wrong_answers_raises(pool):
    with pytest.raises(ValueError):
        build_options("Paris", pool, random.Random(1))
