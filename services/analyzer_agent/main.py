import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.controllers import analyzer_controller
from app.core.config import settings
from app.infrastructure.mcp_client import MCPClientWrapper

logging.basicConfig(level=logging.INFO)

# Instancia global del cliente MCP
mcp_client = MCPClientWrapper(url=settings.MCP_SERVER_URL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await mcp_client.connect()
    except Exception as e:
        logging.error(f"Fallo al conectar con MCP al inicio: {e}")
    yield
    # Shutdown
    await mcp_client.disconnect()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Para poder inyectarlo en dependencias
app.state.mcp_client = mcp_client

app.include_router(analyzer_controller.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
