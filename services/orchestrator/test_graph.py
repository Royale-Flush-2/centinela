import asyncio
import httpx
from app.services.graph_service import build_graph

async def main():
    graph = build_graph()
    payload = {
        "client_id": "C-TEST-123",
        "saldo_vencido": 5000000.0,
        "max_dias_vencido": 45,
        "dias_pago_prom_120d": 15
    }
    
    initial_state = {
        "initial_payload": payload,
        "is_anomaly": None,
        "reference_ids": None,
        "analysis_result": None,
        "analyzer_report": None,
        "strategist_report": None
    }
    
    print("Iniciando orquestación...")
    final_state = await graph.ainvoke(initial_state)
    
    print("\n--- ANALYZER REPORT ---")
    if final_state.get("analyzer_report"):
        print(final_state["analyzer_report"])
    else:
        print("No se generó analyzer_report")
        
    print("\n--- STRATEGIST REPORT ---")
    if final_state.get("strategist_report"):
        print(final_state["strategist_report"])
    else:
        print("No se generó strategist_report")
        print("Estado completo:", final_state)

if __name__ == "__main__":
    asyncio.run(main())
