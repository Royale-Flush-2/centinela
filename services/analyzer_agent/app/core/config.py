from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Analyzer Agent"
    
    # URL del servidor MCP desplegado en AWS AppRunner
    MCP_SERVER_URL: str = os.getenv("MCP_SERVER_URL", "https://jk3v3ufmrk.us-east-2.awsapprunner.com/sse")
    DEEPSEEK_API_KEY: str = os.getenv("API_KEY", "")

settings = Settings()
