from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://postgres@localhost:5432/postgres"
    embedding_model: str = "all-MiniLM-L6-v2"
    log_level: str = "INFO"
    deepseek_api_key: str = ""
    knowledge_service_url: str = "http://knowledge.centinela.internal:8007/api/v1/knowledge/search"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
