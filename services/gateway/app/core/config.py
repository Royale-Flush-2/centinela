from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "API Gateway"
    ORCHESTRATOR_URL: str = os.getenv("ORCHESTRATOR_URL", "http://localhost:8004/orchestrate")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres@localhost:5432/postgres")

settings = Settings()
