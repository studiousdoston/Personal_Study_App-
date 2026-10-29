import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser
from app.models import Generation
from app.schemas.ai import (
    CardDraftOut,
    DraftUpdate,
    GenerationBase,
    GenerationCreate,
    GenerationOut,
    GenerationSummary,
    RefineRequest,
    SaveResult,
)
from app.services import deck_service, generation_service
from app.services.card_images import CardImageError

router = APIRouter(tags=["generations"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


def _generation_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")


def _draft_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")


def _conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def _still_running() -> HTTPException:
    return _conflict("Generation is still running")


##########################################################
#!                       HELPERS
##########################################################
def _summary(generation: Generation, draft_count: int) -> GenerationSummary:
    fields = {name: getattr(generation, name) for name in GenerationBase.model_fields}
    return GenerationSummary(**fields, draft_count=draft_count)


##########################################################
#!                       ROUTES
##########################################################
@router.post(
    "/decks/{deck_id}/generations",
    response_model=GenerationOut,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_generation(
    deck_id: uuid.UUID,
    payload: GenerationCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        generation = generation_service.create_generation(db, current_user.id, deck_id, payload)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None
    background_tasks.add_task(generation_service.run_generation, generation.id)
    return generation


@router.get("/generations", response_model=list[GenerationSummary])
def list_generations(current_user: CurrentUser, db: Session = Depends(get_db)):
    rows = generation_service.list_generations(db, current_user.id)
    return [_summary(generation, draft_count) for generation, draft_count in rows]


@router.get("/generations/{generation_id}", response_model=GenerationOut)
def get_generation(
    generation_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
):
    try:
        return generation_service.get_generation(db, current_user.id, generation_id)
    except generation_service.GenerationNotFoundError:
        raise _generation_not_found() from None


@router.post(
    "/generations/{generation_id}/refine",
    response_model=GenerationOut,
    status_code=status.HTTP_202_ACCEPTED,
)
def refine_generation(
    generation_id: uuid.UUID,
    payload: RefineRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        generation = generation_service.refine_generation(
            db, current_user.id, generation_id, payload
        )
    except generation_service.GenerationNotFoundError:
        raise _generation_not_found() from None
    except generation_service.GenerationRunningError:
        raise _still_running() from None
    except generation_service.NoRefinesLeftError:
        raise _conflict("No refines left") from None
    except generation_service.NothingToRegenerateError:
        raise _conflict("Nothing to regenerate") from None
    except generation_service.InstructionsTooLongError:
        raise _unprocessable(
            f"Sources and instructions exceed {settings.ai_max_input_chars} characters"
        ) from None
    background_tasks.add_task(generation_service.run_generation, generation.id)
    return generation


@router.post("/generations/{generation_id}/save", response_model=SaveResult)
def save_generation(
    generation_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
):
    try:
        return generation_service.save_generation(db, current_user.id, generation_id)
    except generation_service.GenerationNotFoundError:
        raise _generation_not_found() from None
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None
    except generation_service.GenerationRunningError:
        raise _still_running() from None
    except generation_service.NoDraftsSelectedError:
        raise _unprocessable("No drafts selected") from None
    except CardImageError as error:
        raise _unprocessable(error.detail) from None


@router.delete("/generations/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_generation(
    generation_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    try:
        generation_service.delete_generation(db, current_user.id, generation_id)
    except generation_service.GenerationNotFoundError:
        raise _generation_not_found() from None


@router.patch("/drafts/{draft_id}", response_model=CardDraftOut)
def update_draft(
    draft_id: uuid.UUID,
    payload: DraftUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return generation_service.update_draft(db, current_user.id, draft_id, payload)
    except generation_service.DraftNotFoundError:
        raise _draft_not_found() from None
    except generation_service.GenerationRunningError:
        raise _still_running() from None
    except CardImageError as error:
        raise _unprocessable(error.detail) from None


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    draft_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    try:
        generation_service.delete_draft(db, current_user.id, draft_id)
    except generation_service.DraftNotFoundError:
        raise _draft_not_found() from None
    except generation_service.GenerationRunningError:
        raise _still_running() from None
