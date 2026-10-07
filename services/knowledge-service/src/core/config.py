from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://postgres@localhost:5432/postgres"
    embedding_model: str = "all-MiniLM-L6-v2"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_prefix = "CENTINELA_"

settings = Settings()
