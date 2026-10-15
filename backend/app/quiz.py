import random
from typing import NamedTuple


OPTION_COUNT = 4


class QuizOptionData(NamedTuple):
    text: str
    is_correct: bool


def build_options(correct: str, pool: list[str], rng: random.Random) -> list[QuizOptionData]:
    distinct_wrong = list(dict.fromkeys(text for text in pool if text != correct))
    if len(distinct_wrong) < OPTION_COUNT - 1:
        raise ValueError(f"pool needs at least {OPTION_COUNT - 1} distinct wrong answers")

    wrong = rng.sample(distinct_wrong, OPTION_COUNT - 1)
    options = [QuizOptionData(correct, True)] + [QuizOptionData(text, False) for text in wrong]
    rng.shuffle(options)
    return options
