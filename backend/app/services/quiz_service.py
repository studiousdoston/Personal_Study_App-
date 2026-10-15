import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import quiz
from app.models import Card
from app.schemas.quiz import QuizOption, QuizOut, QuizQuestion
from app.services import deck_service


##########################################################
#                        ERRORS
##########################################################
class NotEnoughCardsError(Exception):
    pass


##########################################################
#                       PUBLIC
##########################################################
def get_quiz(
    db: Session,
    user_id: uuid.UUID,
    deck_id: uuid.UUID,
    count: int,
    rng: random.Random | None = None,
) -> QuizOut:
    rng = rng or random.Random()
    deck = deck_service.get_deck(db, user_id, deck_id)
    cards = list(
        db.scalars(
            select(Card)
            .where(Card.deck_id == deck.id, Card.deleted_at.is_(None))
            .order_by(Card.id.asc())
        )
    )
    if len({card.back for card in cards}) < quiz.OPTION_COUNT:
        raise NotEnoughCardsError()

    questions = []
    for card in _pick_question_cards(cards, count, rng):
        pool = [other.back for other in cards if other.id != card.id]
        options = quiz.build_options(card.back, pool, rng)
        questions.append(
            QuizQuestion(
                card_id=card.id,
                prompt=card.front,
                options=[QuizOption(text=o.text, is_correct=o.is_correct) for o in options],
            )
        )
    return QuizOut(deck_id=deck.id, questions=questions)


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _pick_question_cards(cards: list[Card], count: int, rng: random.Random) -> list[Card]:
    now = datetime.now(timezone.utc)
    due = sorted(
        (card for card in cards if card.next_review_at <= now),
        key=lambda card: (card.next_review_at, card.id),
    )
    if len(due) >= count:
        return due[:count]

    not_due = [card for card in cards if card.next_review_at > now]
    return due + rng.sample(not_due, min(count - len(due), len(not_due)))
