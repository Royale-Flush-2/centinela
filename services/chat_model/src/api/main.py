from fastapi import FastAPI
from src.api.router import router

app = FastAPI(title="Centinela Chat Model")
app.include_router(router)
