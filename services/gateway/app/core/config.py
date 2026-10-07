from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "API Gateway"
    orchestrator_url: str = "http://orchestrator.centinela.internal:8004/orchestrate"
    database_url: str = "postgresql://postgres@localhost:5432/postgres"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
