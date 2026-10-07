import logging
from app.domain.models import AnalyzerPayload, AnalyzerResponse
from app.infrastructure.mcp_client import MCPClientWrapper
from app.core.config import settings

# Langchain
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from app.infrastructure.rag_client import search_knowledge_base

logger = logging.getLogger(__name__)

class AnalyzerService:
    def __init__(self, mcp_client: MCPClientWrapper):
        self.mcp_client = mcp_client
        
        if settings.DEEPSEEK_API_KEY:
            self.llm = ChatOpenAI(
                model="deepseek-chat",
                api_key=settings.DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com",
                temperature=0.1
            )
        else:
            self.llm = None
            logger.warning("AnalyzerService: DEEPSEEK_API_KEY no configurada.")

    async def process_analysis(self, payload: AnalyzerPayload) -> AnalyzerResponse:
        anomalous_client = payload.anomalous_client_id
        references = payload.reference_ids
        
        logger.info(f"AnalyzerService: Analizando causa raíz para {anomalous_client}")
        
        if not self.llm or not self.mcp_client.langchain_tools:
            # Fallback
            return AnalyzerResponse(
                status="success",
                message="Analyzer received the request but lacks LLM or MCP tools."
            )
            
        # Crear agente con herramientas MCP + RAG
        all_tools = self.mcp_client.langchain_tools + [search_knowledge_base]
        agent = create_react_agent(self.llm, all_tools)
        
        # Prompt para el agente
        system_prompt = SystemMessage(
            content="""Eres el Agente Analizador (Investigador de Causa Raíz) de una empresa distribuidora.
El Agente Vigía ha detectado un comportamiento anómalo en un cliente y te ha proporcionado su ID junto con 
otros clientes de referencia que presentan patrones similares de riesgo.

Tu misión es usar tus herramientas en la base de datos (PostgreSQL a través de MCP) y en el sistema de conocimiento 
(RAG de políticas de negocio) para averiguar QUÉ está causando la anomalía y si se están violando las reglas.

Las métricas están en la 'Capa Semántica' (vistas que empiezan con v_). Revisa vistas como v_cartera_cliente, 
v_ventas, o v_descuentos_fuera_politica para los IDs proporcionados. Puedes usar la herramienta search_knowledge_base 
para consultar las políticas de la empresa (ej. límites de crédito, porcentajes máximos de descuento).

Investiga y redacta una conclusión explicando la posible causa raíz de la anomalía basándote en evidencia en los datos y las políticas.

IMPORTANTE: Tu 'Final Answer' DEBE estar formateada en el formato 'Agent Markdown'.
Puedes usar cualquiera de los siguientes componentes para estructurar tu informe, según consideres necesario:
# kpi (ej. `## label:`, `## value:`)
# chart (ej. `## data:` como tabla Markdown)
# rule
# cause (ej. `## type:`, `## title:`, `## metric:`)
# evidence (ej. `## table:`)
# calculation

Usa tu criterio para incluir los componentes gráficos o de evidencia que mejor expliquen la causa raíz.
NO incluyas pasos de razonamiento de tus herramientas en tu respuesta final, solo el reporte Markdown válido."""
        )
        
        human_prompt = HumanMessage(
            content=f"Investiga al cliente anómalo: {anomalous_client} y a sus vecinos estadísticos: {references}"
        )
        
        try:
            logger.info("Iniciando ejecución del React Agent con MCP tools...")
            result = await agent.ainvoke({"messages": [system_prompt, human_prompt]})
            
            # El último mensaje es la conclusión del agente
            final_message = result["messages"][-1].content
            
            logger.info(f"AnalyzerService: Análisis completado exitosamente.")
            
            return AnalyzerResponse(
                status="success",
                message=final_message
            )
            
        except Exception as e:
            logger.error(f"AnalyzerService: Error durante la ejecución del agente: {e}")
            return AnalyzerResponse(
                status="error",
                message=f"Error en la investigación: {str(e)}"
            )
