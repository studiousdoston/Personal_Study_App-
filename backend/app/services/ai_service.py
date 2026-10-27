from types import ModuleType

from app.ai_providers import claude, fake
from app.config import settings
from app.schemas.ai import DraftCard, GenerateCardsRequest

_PROVIDERS: dict[str, ModuleType] = {"fake": fake, "claude": claude}


def generate_cards(request: GenerateCardsRequest, existing_fronts: list[str]) -> list[DraftCard]:
    return _PROVIDERS[settings.ai_provider].generate_cards(request, existing_fronts)
