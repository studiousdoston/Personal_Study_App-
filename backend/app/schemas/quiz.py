import uuid

from pydantic import BaseModel, ConfigDict


class QuizOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    text: str
    is_correct: bool


class QuizQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    card_id: uuid.UUID
    prompt: str
    options: list[QuizOption]


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    deck_id: uuid.UUID
    questions: list[QuizQuestion]
