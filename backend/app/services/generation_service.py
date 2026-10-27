import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.ai_providers.errors import AiBadOutputError, AiNotConfiguredError, AiUnavailableError
from app.database import SessionLocal
from app.models import Card, CardDraft, Generation
from app.schemas.ai import DraftCard, GenerateCardsRequest, GenerationCreate
from app.services import ai_service, deck_service

logger = logging.getLogger(__name__)

session_factory = SessionLocal

EXISTING_FRONTS_LIMIT = 300
LIST_LIMIT = 20
STUCK_AFTER = timedelta(minutes=5)
ACTIVE_STATUSES = ("queued", "running")

AI_UNAVAILABLE_MESSAGE = "AI is unavailable right now"
AI_BAD_OUTPUT_MESSAGE = "AI returned an unusable answer, try again"
UNEXPECTED_ERROR_MESSAGE = "Something went wrong, try again"
TIMED_OUT_MESSAGE = "Timed out, try again"


##########################################################
#!                       ERRORS
##########################################################
class GenerationNotFoundError(Exception):
    pass


##########################################################
#!                       PUBLIC
##########################################################
def create_generation(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, payload: GenerationCreate
) -> Generation:
    deck = deck_service.get_deck(db, user_id, deck_id)
    generation = Generation(
        user_id=user_id,
        deck_id=deck.id,
        status="queued",
        request=payload.model_dump(mode="json"),
        progress_total=1,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    return generation


def run_generation(generation_id: uuid.UUID) -> None:
    try:
        started = _start(generation_id)
        if started is None:
            return
        request, active_fronts = started
        cards = ai_service.generate_cards(request, active_fronts[:EXISTING_FRONTS_LIMIT])
        _finish(generation_id, cards, active_fronts)
    except (AiNotConfiguredError, AiUnavailableError):
        _fail(generation_id, AI_UNAVAILABLE_MESSAGE)
    except AiBadOutputError:
        _fail(generation_id, AI_BAD_OUTPUT_MESSAGE)
    except Exception:
        logger.exception("Generation %s failed", generation_id)
        _fail(generation_id, UNEXPECTED_ERROR_MESSAGE)


def get_generation(db: Session, user_id: uuid.UUID, generation_id: uuid.UUID) -> Generation:
    _fail_stuck_generations(db, user_id)
    generation = db.scalar(
        select(Generation).where(Generation.id == generation_id, Generation.user_id == user_id)
    )
    if generation is None:
        raise GenerationNotFoundError()
    return generation


def list_generations(db: Session, user_id: uuid.UUID) -> list[tuple[Generation, int]]:
    _fail_stuck_generations(db, user_id)
    rows = db.execute(
        select(Generation, func.count(CardDraft.id))
        .outerjoin(CardDraft, CardDraft.generation_id == Generation.id)
        .where(Generation.user_id == user_id)
        .group_by(Generation.id)
        .order_by(Generation.created_at.desc(), Generation.id.desc())
        .limit(LIST_LIMIT)
    )
    return [(generation, draft_count) for generation, draft_count in rows]


##########################################################
#!                    PRIVATE HELPERS
##########################################################
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize(front: str) -> str:
    return " ".join(front.split()).casefold()


def _start(generation_id: uuid.UUID) -> tuple[GenerateCardsRequest, list[str]] | None:
    with session_factory() as db:
        generation = db.get(Generation, generation_id)
        if generation is None or generation.status != "queued":
            return None
        generation.status = "running"
        generation.started_at = _now()
        fronts = db.scalars(
            select(Card.front)
            .where(Card.deck_id == generation.deck_id, Card.deleted_at.is_(None))
            .order_by(Card.created_at.desc(), Card.id.desc())
        )
        active_fronts = list(fronts)
        request = GenerateCardsRequest.model_validate(generation.request)
        db.commit()
    return request, active_fronts


def _finish(generation_id: uuid.UUID, cards: list[DraftCard], active_fronts: list[str]) -> None:
    with session_factory() as db:
        generation = db.get(Generation, generation_id)
        if generation is None or generation.status != "running":
            return
        seen = {_normalize(front) for front in active_fronts}
        for position, card in enumerate(cards):
            key = _normalize(card.front)
            is_duplicate = key in seen
            seen.add(key)
            generation.drafts.append(
                CardDraft(
                    front=card.front,
                    back=card.back,
                    position=position,
                    is_duplicate=is_duplicate,
                    included=not is_duplicate,
                )
            )
        generation.status = "done"
        generation.progress_done = 1
        generation.finished_at = _now()
        db.commit()


def _fail(generation_id: uuid.UUID, message: str) -> None:
    with session_factory() as db:
        db.execute(
            update(Generation)
            .where(Generation.id == generation_id, Generation.status.in_(ACTIVE_STATUSES))
            .values(status="failed", error_message=message, finished_at=_now())
        )
        db.commit()


def _fail_stuck_generations(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        update(Generation)
        .where(
            Generation.user_id == user_id,
            Generation.status.in_(ACTIVE_STATUSES),
            Generation.created_at < _now() - STUCK_AFTER,
        )
        .values(status="failed", error_message=TIMED_OUT_MESSAGE, finished_at=_now())
    )
    db.commit()
