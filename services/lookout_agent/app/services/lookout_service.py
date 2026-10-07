import logging
import json
from app.domain.interfaces import IClusteringClient
from app.domain.models import AnomalyData, LookoutResponse, VigiaEvaluation
from app.core.config import settings

# Langchain imports
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

class LookoutService:
    def __init__(self, clustering_client: IClusteringClient):
        self.clustering_client = clustering_client
        
        # Inicializar el LLM (DeepSeek) solo si hay API Key disponible
        if settings.deepseek_api_key:
            self.llm = ChatOpenAI(
                model="deepseek-chat",
                api_key=settings.deepseek_api_key,
                base_url="https://api.deepseek.com",
                temperature=0.2
            )
            # DeepSeek might require json_mode instead of json_schema
            self.structured_llm = self.llm.with_structured_output(VigiaEvaluation, method="json_mode")
        else:
            self.llm = None
            self.structured_llm = None
            logger.warning("LookoutService: DEEPSEEK_API_KEY no configurada. El filtro cognitivo está deshabilitado.")

    async def evaluate_anomaly(self, data: AnomalyData) -> LookoutResponse:
        client_id = data.client_id
        logger.info(f"LookoutService: Iniciando evaluación de estrategias para {client_id}")
        
        # 1. Estrategia Estadística: Isolation Forest (Clustering Service)
        clustering_result = await self.clustering_client.evaluate_strategy(data)
        is_statistical_anomaly = clustering_result.get("status") == "anomaly_detected"
        
        if not is_statistical_anomaly:
            logger.info(f"LookoutService: Evaluación normal para {client_id}.")
            return LookoutResponse(
                is_anomaly=False,
                reference_ids=[],
                details="Todas las estrategias reportan normalidad."
            )
            
        neighbors = clustering_result.get("nearest_neighbors", [])
        reference_ids = [n.get("client_id") for n in neighbors if n.get("client_id")]
        
        logger.info(f"LookoutService: Anomalía estadística confirmada para {client_id}. Referencias: {reference_ids}")
        
        # 2. Evaluación Cognitiva (LLM)
        if not self.structured_llm:
            # Fallback si no hay API Key: escalamos la alerta automáticamente
            return LookoutResponse(
                is_anomaly=True,
                reference_ids=reference_ids,
                details="Anomalía estadística detectada (Filtro cognitivo deshabilitado por falta de API Key)."
            )
            
        logger.info(f"LookoutService: Iniciando evaluación cognitiva con DeepSeek para {client_id}")
        
        prompt_template = PromptTemplate.from_template(
            """Eres el Agente Vigía de una empresa distribuidora. 
El modelo de clustering estadístico ha marcado al cliente {client_id} como una anomalía ('caso gris').

Sus datos actuales son: 
- Saldo vencido: ${saldo_vencido}
- Días máximos de atraso: {max_dias_vencido} días
- Promedio de días de pago histórico: {dias_pago_prom_120d} días

Además, este cliente es estadísticamente similar a estos vecinos históricos: {neighbors}.

Tu trabajo es evaluar si esta anomalía estadística representa un riesgo financiero real y de negocio que amerite 
escalar la alerta al Agente Analizador para una investigación profunda. 

Analiza los números. Si el saldo vencido es mínimo (ej. 0) y los atrasos son nulos o bajísimos, NO es crítico 
aunque estadísticamente sea un "outlier". Si los números muestran peligro de impago, SI es crítico.

Responde obligatoriamente cumpliendo el esquema JSON solicitado."""
        )
        
        prompt = prompt_template.format(
            client_id=client_id,
            saldo_vencido=data.saldo_vencido,
            max_dias_vencido=data.max_dias_vencido,
            dias_pago_prom_120d=data.dias_pago_prom_120d,
            neighbors=json.dumps(neighbors)
        )
        
        try:
            evaluation: VigiaEvaluation = self.structured_llm.invoke(prompt)
            logger.info(f"LookoutService: Razonamiento DeepSeek -> {evaluation.justificacion} | is_critical: {evaluation.escalar_al_analizador}")
            
            if evaluation.escalar_al_analizador:
                return LookoutResponse(
                    is_anomaly=True,
                    reference_ids=reference_ids,
                    details=f"Evaluación LLM: {evaluation.justificacion}"
                )
            else:
                logger.info(f"LookoutService: El LLM descartó la alerta para {client_id}.")
                return LookoutResponse(
                    is_anomaly=False,
                    reference_ids=[],
                    details=f"Anomalía estadística descartada por LLM: {evaluation.justificacion}"
                )
        except Exception as e:
            logger.error(f"LookoutService: Error en la evaluación cognitiva LLM: {e}")
            # Fallback en caso de error del LLM
            return LookoutResponse(
                is_anomaly=True,
                reference_ids=reference_ids,
                details="Anomalía estadística detectada (Error en evaluación cognitiva)."
            )
