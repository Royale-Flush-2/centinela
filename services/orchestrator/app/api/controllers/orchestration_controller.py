from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.dependencies import get_orchestrator_graph

router = APIRouter()

@router.post("/orchestrate")
async def orchestrate_flow(
    payload: Dict[str, Any],
    graph = Depends(get_orchestrator_graph)
):
    initial_state = {
        "initial_payload": payload,
        "is_anomaly": None,
        "reference_ids": None,
        "analysis_result": None
    }
    
    # Ejecutamos el grafo
    final_state = await graph.ainvoke(initial_state)
    
    return {
        "status": "success",
        "message": "Flujo de orquestación completado.",
        "final_state": final_state
    }
