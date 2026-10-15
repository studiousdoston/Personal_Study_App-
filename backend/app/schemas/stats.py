from pydantic import BaseModel, ConfigDict


class StatsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cards_due: int
    reviews_today: int
    streak_days: int
    accuracy_30d: float | None
