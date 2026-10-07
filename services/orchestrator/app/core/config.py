from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Orchestrator Service"
    vigia_url: str = "http://lookout.centinela.internal:8002/process_anomaly"
    analyzer_url: str = "http://analyzer.centinela.internal:8003/analyze_metadata"
    strategist_url: str = "http://strategist.centinela.internal:8005/api/v1/strategist/analyze"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
