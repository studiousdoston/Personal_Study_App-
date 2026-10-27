from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    jwt_secret_key:str
    jwt_algorithm: str = 'HS256'
    access_token_expires_minutes:int = 15
    refresh_token_expire_days: int = 15
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]
    cookie_path: str = "/auth"
    allow_registration: bool = True

    ai_provider: Literal["fake", "claude"] = "fake"
    anthropic_api_key: str | None = None
    ai_model: str = "claude-sonnet-5-5"
    ai_max_input_chars: int = 12000
    ai_max_cards: int = 30
    ai_timeout_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()