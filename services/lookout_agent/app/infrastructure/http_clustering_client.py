import httpx
import logging
from typing import Dict, Any
from app.domain.interfaces import IClusteringClient
from app.domain.models import AnomalyData

logger = logging.getLogger(__name__)

class HttpClusteringClient(IClusteringClient):
    def __init__(self, clustering_url: str):
        self.clustering_url = clustering_url

    async def evaluate_strategy(self, payload: AnomalyData) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.clustering_url, json=payload.model_dump())
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"HttpClusteringClient: Error comunicándose con Clustering: {e}")
                return {"status": "error", "message": str(e)}
