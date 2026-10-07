import os
import sys
from pathlib import Path
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import httpx
import psycopg2
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from src.core.models import AnalysisCompleteEvent, ProposalReadyEvent
from src.core.agent import StrategistAgent
from src.core.config import settings
from src.core.logging import get_logger
from src.adapters.deepseek_adapter import DeepSeekAdapter
from src.adapters.postgres_adapter import PostgresAdapter
from src.adapters.knowledge_service_adapter import KnowledgeServiceAdapter

logger = get_logger("centinela.strategist", settings.log_level)

app = FastAPI(
    title="Centinela - El Estratega (The Strategist)", 
    description="Consumes root cause analysis and formulates actionable proposals."
)


llm_provider = DeepSeekAdapter()
database_client = PostgresAdapter(database_url=settings.database_url)
vector_client = KnowledgeServiceAdapter(base_url=settings.knowledge_service_url)

agent = StrategistAgent(
    llm=llm_provider,
    db=database_client,
    vector_store=vector_client
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "detail": None, "trace_id": str(uuid.uuid4())},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc), "trace_id": str(uuid.uuid4())},
    )

@app.post("/api/v1/strategist/analyze", response_model=ProposalReadyEvent)
async def analyze_anomaly(event: AnalysisCompleteEvent):
    try:
        return agent.process_event(event)
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))

@app.get("/health")
async def health_check():
    checks = {}
    
    try:
        conn = psycopg2.connect(settings.database_url, options="-c statement_timeout=2000")
        conn.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        
    try:
        r = httpx.get(f"{settings.knowledge_service_url.rstrip('/')}/health", timeout=2.0)
        checks["knowledge_service"] = "ok" if r.status_code == 200 else f"error: status {r.status_code}"
    except Exception as e:
        checks["knowledge_service"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}


if __name__ == "__main__":
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8005, reload=True)
