import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.deck import DeckCreate, DeckOut, DeckUpdate
from app.services import deck_service

router = APIRouter(prefix="/decks", tags=["decks"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


##########################################################
#!                       ROUTES
##########################################################
@router.post("", response_model=DeckOut, status_code=status.HTTP_201_CREATED)
def create_deck(payload: DeckCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return deck_service.create_deck(db, current_user.id, payload)


@router.get("", response_model=list[DeckOut])
def list_decks(current_user: CurrentUser, db: Session = Depends(get_db)):
    return deck_service.list_decks(db, current_user.id)


@router.get("/{deck_id}", response_model=DeckOut)
def get_deck(deck_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)):
    try:
        return deck_service.get_deck(db, current_user.id, deck_id)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None


@router.patch("/{deck_id}", response_model=DeckOut)
def update_deck(
    deck_id: uuid.UUID,
    payload: DeckUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        return deck_service.update_deck(db, current_user.id, deck_id, payload)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(
    deck_id: uuid.UUID, current_user: CurrentUser, db: Session = Depends(get_db)
) -> None:
    try:
        deck_service.delete_deck(db, current_user.id, deck_id)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None
