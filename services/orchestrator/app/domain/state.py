from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict):
    """
    Estado del grafo de LangGraph.
    - initial_payload: Los datos recibidos del Gateway.
    - is_anomaly: Resultado de la evaluación del Vigía.
    - reference_ids: IDs vecinos encontrados por el Vigía.
    - analysis_result: Resultado final del Analizador.
    """
    initial_payload: Dict[str, Any]
    is_anomaly: Optional[bool]
    reference_ids: Optional[List[str]]
    analysis_result: Optional[Dict[str, Any]]
    strategist_result: Optional[Dict[str, Any]]
    analyzer_report: Optional[str]
    strategist_report: Optional[str]
