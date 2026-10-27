import uuid
from types import ModuleType

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai_providers import claude, fake
from app.ai_providers.errors import (
    AiBadOutputError,
    AiNotConfiguredError,
    AiUnavailableError,
)
from app.config import settings
from app.models import Card
from app.schemas.ai import DraftCard, GenerateCardsRequest
from app.services import deck_service

__all__ = ["AiBadOutputError", "AiNotConfiguredError", "AiUnavailableError", "generate_cards"]


EXISTING_FRONTS_LIMIT = 300

_PROVIDERS: dict[str, ModuleType] = {"fake": fake, "claude": claude}


##########################################################
#                       PUBLIC
##########################################################
def generate_cards(
    db: Session, user_id: uuid.UUID, deck_id: uuid.UUID, request: GenerateCardsRequest
) -> list[DraftCard]:
    deck = deck_service.get_deck(db, user_id, deck_id)
    existing_fronts = _existing_fronts(db, deck.id)
    return _provider().generate_cards(request, existing_fronts)


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _existing_fronts(db: Session, deck_id: uuid.UUID) -> list[str]:
    fronts = db.scalars(
        select(Card.front)
        .where(Card.deck_id == deck_id, Card.deleted_at.is_(None))
        .order_by(Card.created_at.desc(), Card.id.desc())
        .limit(EXISTING_FRONTS_LIMIT)
    )
    return list(fronts)


def _provider() -> ModuleType:
    return _PROVIDERS[settings.ai_provider]
