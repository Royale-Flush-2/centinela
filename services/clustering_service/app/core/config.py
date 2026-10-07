from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Clustering Service"
    VIGIA_URL: str = os.getenv("VIGIA_URL", "http://localhost:8002/process_anomaly")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://centinela_user:centinela_password@localhost:5433/centinela")

settings = Settings()
