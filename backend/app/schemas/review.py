from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=0, le=5)
    time_taken_ms: int | None = Field(default=None, ge=0, le=3_600_000)
