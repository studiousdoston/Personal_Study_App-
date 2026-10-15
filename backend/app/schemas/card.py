import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator


CardText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class CardCreate(BaseModel):
    front: CardText
    back: CardText


class CardUpdate(BaseModel):
    front: CardText | None = None
    back: CardText | None = None

    @field_validator("front", "back")
    @classmethod
    def reject_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("cannot be null")
        return value


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deck_id: uuid.UUID
    front: str
    back: str
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: datetime
    last_reviewed_at: datetime | None
    created_at: datetime
