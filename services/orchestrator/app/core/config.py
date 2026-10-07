from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Orchestrator Service"
    VIGIA_URL: str = os.getenv("VIGIA_URL", "http://localhost:8002/process_anomaly")
    ANALYZER_URL: str = os.getenv("ANALYZER_URL", "http://localhost:8003/analyze_metadata")
    STRATEGIST_URL: str = os.getenv("STRATEGIST_URL", "http://localhost:8005/api/v1/strategist/analyze")

settings = Settings()
