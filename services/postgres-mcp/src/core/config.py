# postgres-mcp/src/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/postgres"
    statement_timeout: int = 5000
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_prefix = "CENTINELA_"

settings = Settings()
