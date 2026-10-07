import httpx
import logging
from typing import Dict, Any
from app.domain.interfaces import IOrchestratorClient
from app.domain.models import IngestPayload
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class HttpOrchestratorClient(IOrchestratorClient):
    def __init__(self, orchestrator_url: str):
        self.orchestrator_url = orchestrator_url

    async def orchestrate_flow(self, payload: IngestPayload) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(self.orchestrator_url, json=payload.model_dump())
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"HttpOrchestratorClient: Error comunicándose con Orquestador: {e}")
                raise HTTPException(status_code=500, detail="Error interno en el procesamiento de orquestación")
