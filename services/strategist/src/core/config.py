from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/postgres"
    knowledge_service_url: str = "http://localhost:8001"
    log_level: str = "INFO"
    deepseek_api_key: str = ""

    class Config:
        env_file = ".env"
        env_prefix = "CENTINELA_"

settings = Settings()
