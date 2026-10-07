import os
from typing import List, Any
import httpx
from langchain_core.tools import tool

try:
    from src.core.interfaces import ToolProvider
except ImportError:
    from core.interfaces import ToolProvider


@tool
def consultar_politicas(query: str) -> str:
    """Busca en las políticas de la empresa usando RAG."""
    # Assuming knowledge-service is at http://localhost:8001
    base_url = os.getenv("KNOWLEDGE_SERVICE_URL", "http://localhost:8001").rstrip("/")
    try:
        response = httpx.post(
            f"{base_url}/api/v1/knowledge/search",
            json={"query": query},
            timeout=10.0,
        )
        response.raise_for_status()
        return str(response.json())
    except Exception as e:
        return f"Error retrieving knowledge: {str(e)}"


class KnowledgeToolProvider(ToolProvider):
    async def get_tools(self) -> List[Any]:
        return [consultar_politicas]


def get_knowledge_tools() -> List[Any]:
    return [consultar_politicas]
