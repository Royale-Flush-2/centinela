from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Analyzer Agent"
    mcp_server_url: str = "http://postgres-mcp.centinela.internal:8006/sse"
    knowledge_service_url: str = "http://knowledge.centinela.internal:8007/api/v1/knowledge/search"
    deepseek_api_key: str = ""
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="CENTINELA_", env_file=".env", extra="ignore")

settings = Settings()
