import uuid

from pydantic import BaseModel, ConfigDict, Field, computed_field

UPLOADS_URL_PREFIX = "/uploads/"


class UploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    filename: str = Field(exclude=True)
    width: int
    height: int

    @computed_field
    @property
    def url(self) -> str:
        return f"{UPLOADS_URL_PREFIX}{self.filename}"
