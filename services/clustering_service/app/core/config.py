from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Clustering Service"
    vigia_url: str = "http://lookout.centinela.internal:8002/process_anomaly"
    database_url: str = "postgresql://centinela_user:centinela_password@localhost:5433/centinela"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
