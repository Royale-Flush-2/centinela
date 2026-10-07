import httpx
from typing import List
from src.core.ports.vector_store import IVectorStore
from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger("centinela.strategist", settings.log_level)
SIMILARITY_THRESHOLD = 0.7

class KnowledgeServiceAdapter(IVectorStore):
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def get_past_rejections(self, anomaly_summary: str, entities: List[str]) -> str:
        query = f"{anomaly_summary} | entities: {', '.join(entities)}"
        logger.info("Querying knowledge-service for past rejections", extra={"query_preview": query[:100]})
        try:
            response = httpx.post(
                f"{self.base_url}/api/v1/knowledge/search",
                json={"query": query, "namespace": "audit_log", "top_k": 5},
                timeout=180.0,
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            relevant = [
                r["text"]
                for r in results
                if r.get("similarity_score", 0) >= SIMILARITY_THRESHOLD
            ]
            if not relevant:
                return "No prior rejections found."
            constraints = "\n---\n".join(relevant)
            return f"PAST HUMAN REJECTIONS (do NOT propose these again):\n{constraints}"
        except httpx.HTTPError as e:
            logger.warning(f"Knowledge service unreachable: {e}")
            return "Warning: Could not retrieve past rejections (service unavailable)."
