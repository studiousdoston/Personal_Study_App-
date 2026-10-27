import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.ai import GenerateCardsRequest, GenerateCardsResponse
from app.services import ai_service, deck_service

router = APIRouter(tags=["ai"])


##########################################################
#!                       ERRORS
##########################################################
def _deck_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")


def _ai_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI is unavailable right now"
    )


def _ai_bad_output() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="AI returned an unusable answer, try again",
    )


##########################################################
#!                       ROUTES
##########################################################
@router.post("/decks/{deck_id}/generate", response_model=GenerateCardsResponse)
def generate_cards(
    deck_id: uuid.UUID,
    payload: GenerateCardsRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    try:
        cards = ai_service.generate_cards(db, current_user.id, deck_id, payload)
    except deck_service.DeckNotFoundError:
        raise _deck_not_found() from None
    except (ai_service.AiNotConfiguredError, ai_service.AiUnavailableError):
        raise _ai_unavailable() from None
    except ai_service.AiBadOutputError:
        raise _ai_bad_output() from None
    return GenerateCardsResponse(cards=cards)
