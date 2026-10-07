from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/postgres"
    knowledge_service_url: str = "http://knowledge.centinela.internal:8007"
    deepseek_api_key: str = ""
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
