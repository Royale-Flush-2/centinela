from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Load the .env file from the current directory
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Lookout Agent (Vigía)"
    CLUSTERING_URL: str = os.getenv("CLUSTERING_URL", "http://localhost:8001/analyze")
    
    # We map API_KEY from .env to DEEPSEEK_API_KEY for clarity
    DEEPSEEK_API_KEY: str = os.getenv("API_KEY", "")

settings = Settings()
