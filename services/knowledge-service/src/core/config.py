import sys
import logging
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    knowledge_service_url: str
    deepseek_api_key: str
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

try:
    settings = Settings()
except ValidationError as e:
    missing_fields = [err["loc"][0] for err in e.errors() if err["type"] == "missing"]
    if missing_fields:
        logging.error(f"CRITICAL ERROR: Service lacking required configuration. Missing fields: {missing_fields}")
    else:
        logging.error(f"Configuration validation error: {e}")
    sys.exit(1)

