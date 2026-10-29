import logging
import uuid
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.ai_providers.errors import AiBadOutputError, AiNotConfiguredError, AiUnavailableError
from app.database import SessionLocal
from app.models import Card, CardDraft, Deck, Generation
from app.schemas.ai import (
    MAX_REFINES,
    DraftCard,
    DraftUpdate,
    GenerateCardsRequest,
    GenerationCreate,
    GenerationOptions,
    RefineRequest,
    SaveResult,
)
from app.services import ai_service, card_service, deck_service
from app.services.card_images import check_card_images, check_image_changes

logger = logging.getLogger(__name__)

session_factory = SessionLocal

EXISTING_FRONTS_LIMIT = 300
LIST_LIMIT = 20
STUCK_AFTER = timedelta(minutes=5)
DRAFT_TTL = timedelta(days=7)
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


class DraftNotFoundError(Exception):
    pass


class GenerationRunningError(Exception):
    pass


class NoRefinesLeftError(Exception):
    pass


class NothingToRegenerateError(Exception):
    pass


class NoDraftsSelectedError(Exception):
    pass


class InstructionsTooLongError(Exception):
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
    _delete_expired_generations(db, user_id)
    _fail_stuck_generations(db, user_id)
    return _get_visible_generation(db, user_id, generation_id)


def list_generations(db: Session, user_id: uuid.UUID) -> list[tuple[Generation, int]]:
    _delete_expired_generations(db, user_id)
    _fail_stuck_generations(db, user_id)
    rows = db.execute(
        select(Generation, func.count(CardDraft.id))
        .join(Deck, Deck.id == Generation.deck_id)
        .outerjoin(CardDraft, CardDraft.generation_id == Generation.id)
        .where(Generation.user_id == user_id, Deck.deleted_at.is_(None))
        .group_by(Generation.id)
        .order_by(Generation.created_at.desc(), Generation.id.desc())
        .limit(LIST_LIMIT)
    )
    return [(generation, draft_count) for generation, draft_count in rows]


def refine_generation(
    db: Session, user_id: uuid.UUID, generation_id: uuid.UUID, payload: RefineRequest
) -> Generation:
    generation = _get_visible_generation(db, user_id, generation_id)
    _ensure_not_running(generation)
    if generation.run_count - 1 >= MAX_REFINES:
        raise NoRefinesLeftError()
    edited_count = sum(1 for draft in generation.drafts if draft.edited)
    if edited_count >= generation.request["count"]:
        raise NothingToRegenerateError()
    try:
        options = GenerationOptions.model_validate(
            {**generation.request, "instructions": payload.instructions}
        )
    except ValidationError:
        raise InstructionsTooLongError() from None
    generation.request = options.model_dump(mode="json")
    generation.status = "queued"
    generation.progress_done = 0
    generation.error_message = None
    generation.queued_at = _now()
    generation.started_at = None
    generation.finished_at = None
    db.commit()
    db.refresh(generation)
    return generation


def update_draft(
    db: Session, user_id: uuid.UUID, draft_id: uuid.UUID, data: DraftUpdate
) -> CardDraft:
    draft = _get_draft(db, user_id, draft_id)
    _ensure_not_running(draft.generation)
    changes = data.model_dump(exclude_unset=True)
    check_image_changes(db, user_id, draft, changes)
    front_changed = "front" in changes and changes["front"] != draft.front
    back_changed = "back" in changes and changes["back"] != draft.back
    for field, value in changes.items():
        setattr(draft, field, value)
    if front_changed or back_changed:
        draft.edited = True
    if front_changed:
        draft.is_duplicate = _normalize(draft.front) in _taken_fronts(db, draft)
    db.commit()
    db.refresh(draft)
    return draft


def delete_draft(db: Session, user_id: uuid.UUID, draft_id: uuid.UUID) -> None:
    draft = _get_draft(db, user_id, draft_id)
    _ensure_not_running(draft.generation)
    db.delete(draft)
    db.commit()


def save_generation(db: Session, user_id: uuid.UUID, generation_id: uuid.UUID) -> SaveResult:
    generation = _get_own_generation(db, user_id, generation_id)
    deck = deck_service.get_deck(db, user_id, generation.deck_id)
    _ensure_not_running(generation)
    included = [draft for draft in generation.drafts if draft.included]
    if not included:
        raise NoDraftsSelectedError()
    for draft in included:
        check_card_images(db, user_id, [draft.front, draft.back])
    now = _now()
    try:
        for index, draft in enumerate(included):
            card = card_service.new_card(deck.id, draft.front, draft.back)
            card.created_at = now + timedelta(microseconds=index)
            db.add(card)
        db.delete(generation)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return SaveResult(deck_id=deck.id, saved_count=len(included))


def delete_generation(db: Session, user_id: uuid.UUID, generation_id: uuid.UUID) -> None:
    generation = _get_own_generation(db, user_id, generation_id)
    db.delete(generation)
    db.commit()


##########################################################
#!                    PRIVATE HELPERS
##########################################################
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize(front: str) -> str:
    return " ".join(front.split()).casefold()


def _get_own_generation(db: Session, user_id: uuid.UUID, generation_id: uuid.UUID) -> Generation:
    generation = db.scalar(
        select(Generation).where(Generation.id == generation_id, Generation.user_id == user_id)
    )
    if generation is None:
        raise GenerationNotFoundError()
    return generation


def _get_visible_generation(
    db: Session, user_id: uuid.UUID, generation_id: uuid.UUID
) -> Generation:
    generation = db.scalar(
        select(Generation)
        .join(Deck, Deck.id == Generation.deck_id)
        .where(
            Generation.id == generation_id,
            Generation.user_id == user_id,
            Deck.deleted_at.is_(None),
        )
    )
    if generation is None:
        raise GenerationNotFoundError()
    return generation


def _get_draft(db: Session, user_id: uuid.UUID, draft_id: uuid.UUID) -> CardDraft:
    draft = db.scalar(
        select(CardDraft)
        .join(Generation, Generation.id == CardDraft.generation_id)
        .join(Deck, Deck.id == Generation.deck_id)
        .where(
            CardDraft.id == draft_id,
            Generation.user_id == user_id,
            Deck.deleted_at.is_(None),
        )
    )
    if draft is None:
        raise DraftNotFoundError()
    return draft


def _ensure_not_running(generation: Generation) -> None:
    if generation.status in ACTIVE_STATUSES:
        raise GenerationRunningError()


def _taken_fronts(db: Session, draft: CardDraft) -> set[str]:
    generation = draft.generation
    card_fronts = db.scalars(
        select(Card.front).where(Card.deck_id == generation.deck_id, Card.deleted_at.is_(None))
    )
    draft_fronts = (other.front for other in generation.drafts if other.id != draft.id)
    return {_normalize(front) for front in [*card_fronts, *draft_fronts]}


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
        keep_cards = [_as_card(draft) for draft in generation.drafts if draft.edited]
        avoid_cards = [
            _as_card(draft)
            for draft in generation.drafts
            if not draft.edited and not draft.included
        ]
        request = GenerateCardsRequest.model_validate(
            {**generation.request, "keep_cards": keep_cards, "avoid_cards": avoid_cards}
        )
        db.commit()
    return request, active_fronts


def _as_card(draft: CardDraft) -> DraftCard:
    return DraftCard(front=draft.front, back=draft.back)


def _finish(generation_id: uuid.UUID, cards: list[DraftCard], active_fronts: list[str]) -> None:
    with session_factory() as db:
        generation = db.get(Generation, generation_id)
        if generation is None or generation.status != "running":
            return
        kept = [draft for draft in generation.drafts if draft.edited]
        generation.drafts = kept
        for position, draft in enumerate(kept):
            draft.position = position
        seen = {_normalize(front) for front in active_fronts}
        seen.update(_normalize(draft.front) for draft in kept)
        for offset, card in enumerate(cards):
            key = _normalize(card.front)
            is_duplicate = key in seen
            seen.add(key)
            generation.drafts.append(
                CardDraft(
                    front=card.front,
                    back=card.back,
                    position=len(kept) + offset,
                    is_duplicate=is_duplicate,
                    included=not is_duplicate,
                )
            )
        generation.status = "done"
        generation.progress_done = 1
        generation.run_count += 1
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
            Generation.queued_at < _now() - STUCK_AFTER,
        )
        .values(status="failed", error_message=TIMED_OUT_MESSAGE, finished_at=_now())
    )
    db.commit()


def _delete_expired_generations(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        delete(Generation).where(
            Generation.user_id == user_id, Generation.created_at < _now() - DRAFT_TTL
        )
    )
    db.commit()
