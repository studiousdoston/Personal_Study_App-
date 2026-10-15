import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.quiz import QuizOut
from app.services import deck_service, quiz_service

router = APIRouter(tags=["quiz"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


def _not_enough_cards() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="A quiz needs at least 4 cards with different answers",
    )


##########################################################
#!                       ROUTES
##########################################################
@router.get("/decks/{deck_id}/quiz", response_model=QuizOut)
def get_quiz(
    deck_id: uuid.UUID,
    current_user: CurrentUser,
    count: Annotated[int, Query(ge=1, le=50)] = 10,
    db: Session = Depends(get_db),
):
    try:
        return quiz_service.get_quiz(db, current_user.id, deck_id, count)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None
    except quiz_service.NotEnoughCardsError:
        raise _not_enough_cards() from None
