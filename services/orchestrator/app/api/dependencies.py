from app.services.graph_service import build_graph

# Compilamos el grafo una sola vez
orchestrator_graph = build_graph()

def get_orchestrator_graph():
    return orchestrator_graph
