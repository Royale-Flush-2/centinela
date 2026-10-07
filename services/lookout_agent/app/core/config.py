from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Lookout Agent (Vigía)"
    clustering_url: str = "http://clustering.centinela.internal:8001/analyze"
    deepseek_api_key: str = ""
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
