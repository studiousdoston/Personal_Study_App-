import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
)


DeckColor = Literal["green", "blue", "purple", "rose", "amber", "slate"]
DeckIcon = Literal[
    "book-open",
    "graduation-cap",
    "brain",
    "pen-line",
    "languages",
    "globe",
    "landmark",
    "music",
    "palette",
    "code",
    "database",
    "flask-conical",
    "atom",
    "dna",
    "heart-pulse",
    "calculator",
    "sigma",
    "chart-line",
    "briefcase",
    "scale",
    "camera",
    "dumbbell",
    "chef-hat",
    "plane",
]

DEFAULT_DECK_COLOR: DeckColor = "green"
DEFAULT_DECK_ICON: DeckIcon = "book-open"


def _empty_to_none(value: str | None) -> str | None:
    return value or None


DeckName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
DeckDescription = Annotated[
    str | None,
    StringConstraints(strip_whitespace=True, max_length=1000),
    AfterValidator(_empty_to_none),
]


class DeckCreate(BaseModel):
    name: DeckName
    description: DeckDescription = None
    color: DeckColor = DEFAULT_DECK_COLOR
    icon: DeckIcon = DEFAULT_DECK_ICON


class DeckUpdate(BaseModel):
    name: DeckName | None = None
    description: DeckDescription = None
    color: DeckColor | None = None
    icon: DeckIcon | None = None

    @field_validator("name", "color", "icon")
    @classmethod
    def reject_null(cls, value: str | None, info: ValidationInfo) -> str:
        if value is None:
            raise ValueError(f"{info.field_name} cannot be null")
        return value


class DeckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    color: DeckColor
    icon: DeckIcon
    created_at: datetime
    card_count: int
    due_count: int
    mastery: Annotated[int, Field(ge=0, le=100)]
