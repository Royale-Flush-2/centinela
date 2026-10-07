import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.controllers import ingest_controller, alerts_controller
from app.core.config import settings

logging.basicConfig(level=logging.INFO)

from contextlib import asynccontextmanager
from app.infrastructure.database import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(title=settings.project_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_controller.router)
app.include_router(alerts_controller.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

