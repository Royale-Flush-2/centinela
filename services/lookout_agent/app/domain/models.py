from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AnomalyData(BaseModel):
    client_id: str
    saldo_vencido: float = 0.0
    max_dias_vencido: float = 0.0
    dias_pago_prom_120d: float = 0.0

class LookoutResponse(BaseModel):
    is_anomaly: bool
    reference_ids: List[str]
    details: str

class VigiaEvaluation(BaseModel):
    """
    Evaluación generada por el LLM
    """
    escalar_al_analizador: bool = Field(description="Verdadero si la anomalía representa un riesgo financiero real y debe ser escalada al Analizador.")
    justificacion: str = Field(description="Explicación detallada de por qué se considera o no crítica la anomalía, basándose en los datos financieros.")
