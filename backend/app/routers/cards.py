import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.card import CardCreate, CardOut, CardUpdate
from app.services import card_service, deck_service

router = APIRouter(tags=["cards"])


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
@router.post("/decks/{deck_id}/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED)
def create_card(
    deck_id: uuid.UUID,
    payload: CardCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return card_service.create_card(db, current_user.id, deck_id, payload)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None


@router.get("/decks/{deck_id}/cards", response_model=list[CardOut])
def list_cards(deck_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)):
    try:
        return card_service.list_cards(db, current_user.id, deck_id)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None


@router.get("/cards/{card_id}", response_model=CardOut)
def get_card(card_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)):
    try:
        return card_service.get_card(db, current_user.id, card_id)
    except card_service.CardNotFoundError:
        raise _card_not_found() from None


@router.patch("/cards/{card_id}", response_model=CardOut)
def update_card(
    card_id: uuid.UUID,
    payload: CardUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return card_service.update_card(db, current_user.id, card_id, payload)
    except card_service.CardNotFoundError:
        raise _card_not_found() from None


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    try:
        card_service.delete_card(db, current_user.id, card_id)
    except card_service.CardNotFoundError:
        raise _card_not_found() from None
