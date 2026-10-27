import uuid
from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
    model_validator,
)

from app.config import settings
from app.schemas.card import CardText

MAX_SOURCES = 5
MAX_INSTRUCTIONS_LENGTH = 300
MAX_AVOID_CARDS = 100
MAX_REFINES = 2


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


class GenerationOptions(BaseModel):
    sources: Annotated[list[Source], Field(min_length=1, max_length=MAX_SOURCES)]
    mode: Literal["qa", "vocab"]
    count: Annotated[int, Field(ge=1, le=settings.ai_max_cards)] = 10
    instructions: Instructions = None

    @model_validator(mode="after")
    def check_total_length(self) -> "GenerationOptions":
        total = sum(len(source.text) for source in self.sources) + len(self.instructions or "")
        if total > settings.ai_max_input_chars:
            raise ValueError(f"sources and instructions exceed {settings.ai_max_input_chars} characters")
        return self


GenerationCreate = GenerationOptions


class GenerateCardsRequest(GenerationOptions):
    keep_cards: Annotated[list[DraftCard], Field(max_length=settings.ai_max_cards)] = []
    avoid_cards: Annotated[list[DraftCard], Field(max_length=MAX_AVOID_CARDS)] = []

    @model_validator(mode="after")
    def check_keep_cards(self) -> "GenerateCardsRequest":
        if len(self.keep_cards) >= self.count:
            raise ValueError("keep_cards must have fewer items than count")
        return self

    @property
    def new_card_count(self) -> int:
        return self.count - len(self.keep_cards)


##########################################################
#                     GENERATIONS
##########################################################
GenerationStatus = Literal["queued", "running", "done", "failed"]


class CardDraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    front: str
    back: str
    position: int
    is_duplicate: bool
    included: bool
    edited: bool


class GenerationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deck_id: uuid.UUID
    status: GenerationStatus
    progress_done: int
    progress_total: int
    run_count: int = Field(exclude=True)
    error_message: str | None
    created_at: datetime
    finished_at: datetime | None

    @computed_field
    @property
    def refines_left(self) -> int:
        return max(0, MAX_REFINES - max(self.run_count - 1, 0))


class GenerationOut(GenerationBase):
    drafts: list[CardDraftOut]


class GenerationSummary(GenerationBase):
    draft_count: int


##########################################################
#                    DRAFT ACTIONS
##########################################################
class RefineRequest(BaseModel):
    instructions: Instructions = None


class DraftUpdate(BaseModel):
    front: CardText | None = None
    back: CardText | None = None
    included: bool | None = None

    @field_validator("front", "back", "included")
    @classmethod
    def reject_null(cls, value: str | bool | None) -> str | bool:
        if value is None:
            raise ValueError("cannot be null")
        return value


class SaveResult(BaseModel):
    deck_id: uuid.UUID
    saved_count: int
