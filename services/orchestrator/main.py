import logging
from fastapi import FastAPI
from app.api.controllers import orchestration_controller
from app.core.config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(orchestration_controller.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
