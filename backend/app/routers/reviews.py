import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.card import CardOut
from app.schemas.review import ReviewCreate
from app.services import card_service, deck_service, review_service

router = APIRouter(tags=["reviews"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


def _card_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")


##########################################################
#!                       ROUTES
##########################################################
@router.get("/decks/{deck_id}/due", response_model=list[CardOut])
def list_due_cards(
    deck_id: uuid.UUID,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    db: Session = Depends(get_db),
):
    try:
        return review_service.list_due_cards(db, current_user.id, deck_id, limit)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None


@router.post(
    "/cards/{card_id}/reviews", response_model=CardOut, status_code=status.HTTP_201_CREATED
)
def create_review(
    card_id: uuid.UUID,
    payload: ReviewCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return review_service.create_review(db, current_user.id, card_id, payload)
    except card_service.CardNotFoundError:
        raise _card_not_found() from None
