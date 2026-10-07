from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/postgres"
    statement_timeout: int = 5000
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
