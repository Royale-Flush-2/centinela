import logging
import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

RAG_API_URL = "https://7pfqgcwyrm.us-east-2.awsapprunner.com/api/v1/knowledge/search"

@tool
def search_knowledge_base(query: str, namespace: str = "politicas") -> str:
    """
    Busca en el sistema RAG (Base de Conocimiento) las políticas de la empresa usando lenguaje natural.
    Útil para consultar las reglas de negocio, límites de crédito, políticas de descuento, etc.
    Usa el namespace 'politicas' por defecto.
    """
    logger.info(f"RAG Search: query='{query}' namespace='{namespace}'")
    try:
        with httpx.Client(timeout=180.0) as client:
            response = client.post(
                RAG_API_URL,
                json={"query": query, "namespace": namespace, "top_k": 3}
            )
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            if not results:
                return "No se encontraron políticas relevantes para esta búsqueda."
                
            formatted_results = []
            for i, r in enumerate(results, 1):
                text = r.get("text", "")
                score = r.get("similarity_score", 0)
                formatted_results.append(f"[Resultado {i} - Relevancia {score:.2f}]: {text}")
                
            return "\n\n".join(formatted_results)
    except Exception as e:
        logger.error(f"Error consultando RAG: {e}")
        return f"Error consultando la base de conocimiento: {e}"
