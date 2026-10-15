from decimal import ROUND_HALF_UP, Decimal
from typing import NamedTuple


MIN_EASE_FACTOR = Decimal("1.30")
_TWO_PLACES = Decimal("0.01")


class SM2Result(NamedTuple):
    ease_factor: Decimal
    interval_days: int
    repetitions: int


def review(
    ease_factor: Decimal, interval_days: int, repetitions: int, rating: int
) -> SM2Result:
    if not isinstance(rating, int) or not 0 <= rating <= 5:
        raise ValueError("rating must be an int from 0 to 5")

    if rating >= 3:
        if repetitions == 0:
            interval_days = 1
        elif repetitions == 1:
            interval_days = 6
        else:
            interval_days = int(
                (interval_days * ease_factor).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            )
        repetitions += 1
    else:
        repetitions = 0
        interval_days = 1

    miss = 5 - rating
    ease_factor += Decimal("0.1") - miss * (Decimal("0.08") + miss * Decimal("0.02"))
    ease_factor = max(ease_factor, MIN_EASE_FACTOR).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)

    return SM2Result(ease_factor, interval_days, repetitions)
