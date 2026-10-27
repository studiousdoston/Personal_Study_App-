from typing import Annotated, Literal, Union

from pydantic import (
    AfterValidator,
    BaseModel,
    Field,
    StringConstraints,
    model_validator,
)

from app.config import settings
from app.schemas.card import CardText

MAX_SOURCES = 5
MAX_INSTRUCTIONS_LENGTH = 300
MAX_AVOID_CARDS = 100


def _empty_to_none(value: str | None) -> str | None:
    return value or None


##########################################################
#                       SOURCES
##########################################################
class TextSource(BaseModel):
    type: Literal["text"]
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


Source = Annotated[Union[TextSource], Field(discriminator="type")]


##########################################################
#                        CARDS
##########################################################
class DraftCard(BaseModel):
    front: CardText
    back: CardText


##########################################################
#                   REQUEST / RESPONSE
##########################################################
Instructions = Annotated[
    str | None,
    StringConstraints(strip_whitespace=True, max_length=MAX_INSTRUCTIONS_LENGTH),
    AfterValidator(_empty_to_none),
]


class GenerateCardsRequest(BaseModel):
    sources: Annotated[list[Source], Field(min_length=1, max_length=MAX_SOURCES)]
    mode: Literal["qa", "vocab"]
    count: Annotated[int, Field(ge=1, le=settings.ai_max_cards)] = 10
    instructions: Instructions = None
    keep_cards: Annotated[list[DraftCard], Field(max_length=settings.ai_max_cards)] = []
    avoid_cards: Annotated[list[DraftCard], Field(max_length=MAX_AVOID_CARDS)] = []

    @model_validator(mode="after")
    def check_limits(self) -> "GenerateCardsRequest":
        if len(self.keep_cards) >= self.count:
            raise ValueError("keep_cards must have fewer items than count")
        total = sum(len(source.text) for source in self.sources) + len(self.instructions or "")
        if total > settings.ai_max_input_chars:
            raise ValueError(f"sources and instructions exceed {settings.ai_max_input_chars} characters")
        return self

    @property
    def new_card_count(self) -> int:
        return self.count - len(self.keep_cards)


class GenerateCardsResponse(BaseModel):
    cards: list[DraftCard]
