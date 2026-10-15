from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    jwt_secret_key:str
    jwt_algorithm: str = 'HS256'
    access_token_expires_minutes:int = 15
    refresh_token_expire_days: int = 15

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()