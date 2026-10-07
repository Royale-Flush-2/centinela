import httpx
import logging
from langgraph.graph import StateGraph, START, END
from app.domain.state import GraphState
from app.core.config import settings

logger = logging.getLogger(__name__)

async def call_vigia(state: GraphState) -> GraphState:
    logger.info("Orchestrator: Llamando al nodo Vigía")
    payload = state["initial_payload"]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(settings.vigia_url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Orchestrator: Vigía respondió - Anomaly: {result.get('is_anomaly')}")
            
            return {
                "initial_payload": payload,
                "is_anomaly": result.get("is_anomaly"),
                "reference_ids": result.get("reference_ids", []),
                "analysis_result": None
            }
        except Exception as e:
            logger.error(f"Orchestrator: Error llamando a Vigía: {e}")
            return {
                "initial_payload": payload,
                "is_anomaly": False,
                "reference_ids": [],
                "analysis_result": None
            }

async def call_analyzer(state: GraphState) -> GraphState:
    logger.info("Orchestrator: Llamando al nodo Analyzer")
    
    payload = {
        "anomalous_client_id": state["initial_payload"].get("client_id"),
        "reference_ids": state["reference_ids"]
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(settings.analyzer_url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            logger.info("Orchestrator: Analyzer respondió exitosamente")
            
            # Copiar el estado anterior y actualizar el analysis_result
            new_state = state.copy()
            new_state["analysis_result"] = result
            return new_state
        except Exception as e:
            logger.error(f"Orchestrator: Error llamando a Analyzer: {e}")
            new_state = state.copy()
            new_state["analysis_result"] = {"error": str(e)}
            return new_state

async def call_strategist(state: GraphState) -> GraphState:
    logger.info("Orchestrator: Llamando al nodo Strategist")
    
    # Preparamos el payload usando el analysis_result
    # El analyzer nos dará los strings de causa raíz, etc.
    analysis = state.get("analysis_result", {})
    # Construimos el payload de acuerdo a AnalysisCompleteEvent
    payload = {
        "alert_id": f"ALR-{state['initial_payload'].get('client_id', 'UNKNOWN')}",
        "anomaly_category": "unknown", # Se puede inferir o mandar hardcode por ahora
        "root_cause_summary": analysis.get("message", ""),
        "entities_involved": [state["initial_payload"].get("client_id", "")] + state.get("reference_ids", []),
        "financial_baseline": {
            "affected_revenue_cop": state["initial_payload"].get("saldo_vencido", 0.0),
            "current_margin_cop": 0.0
        },
        "policy_context": []
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(settings.strategist_url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            logger.info("Orchestrator: Strategist respondió exitosamente")
            
            new_state = state.copy()
            new_state["strategist_result"] = result
            
            # Construimos el Agent Markdown Final
            # Hero (Orchestrator) + Analyzer + Strategist
            hero = f"# hero\nAlerta detectada para el cliente {state['initial_payload'].get('client_id', '')}.\n\n"
            hero += f"## id: {payload['alert_id']}\n"
            hero += f"## title: Anomalía en cliente {state['initial_payload'].get('client_id', '')}\n"
            hero += f"## severity: high\n"
            hero += f"## type: overdue_receivables\n"
            hero += f"## status: proposal\n"
            hero += f"## confidence: high\n"
            hero += f"## amount at risk: ${payload['financial_baseline']['affected_revenue_cop']}\n"
            hero += f"## entity:\n- client: {state['initial_payload'].get('client_id', '')}\n"
            hero += f"## detected at: 2026-10-03\n\n"
            
            analyzer_md = analysis.get("message", "")
            strategist_md = result.get("markdown", "")
            
            new_state["analyzer_report"] = f"{hero}\n{analyzer_md}"
            new_state["strategist_report"] = strategist_md
            return new_state
            
        except Exception as e:
            logger.error(f"Orchestrator: Error llamando a Strategist: {e}")
            new_state = state.copy()
            new_state["strategist_result"] = {"error": str(e)}
            return new_state

def should_analyze(state: GraphState) -> str:
    if state.get("is_anomaly"):
        return "call_analyzer"
    return END

def build_graph() -> StateGraph:
    workflow = StateGraph(GraphState)
    
    # Agregar nodos
    workflow.add_node("call_vigia", call_vigia)
    workflow.add_node("call_analyzer", call_analyzer)
    workflow.add_node("call_strategist", call_strategist)
    
    # Agregar edges
    workflow.add_edge(START, "call_vigia")
    workflow.add_conditional_edges(
        "call_vigia",
        should_analyze
    )
    workflow.add_edge("call_analyzer", "call_strategist")
    workflow.add_edge("call_strategist", END)
    
    return workflow.compile()
