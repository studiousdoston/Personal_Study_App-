import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.models import Generation
from app.schemas.ai import GenerationBase, GenerationCreate, GenerationOut, GenerationSummary
from app.services import deck_service, generation_service

router = APIRouter(tags=["generations"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


def _generation_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")


##########################################################
#!                       HELPERS
##########################################################
def _summary(generation: Generation, draft_count: int) -> GenerationSummary:
    base = GenerationBase.model_validate(generation)
    return GenerationSummary(**base.model_dump(), draft_count=draft_count)


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
