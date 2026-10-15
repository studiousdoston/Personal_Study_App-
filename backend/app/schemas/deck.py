import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints, field_validator


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


class DeckUpdate(BaseModel):
    name: DeckName | None = None
    description: DeckDescription = None

    @field_validator("name")
    @classmethod
    def reject_null_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("name cannot be null")
        return value


class DeckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
