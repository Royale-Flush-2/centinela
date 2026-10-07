from pydantic import BaseModel
from typing import Optional, Dict, Any

class IngestPayload(BaseModel):
    client_id: str
    saldo_vencido: Optional[float] = 0.0
    max_dias_vencido: Optional[float] = 0.0
    dias_pago_prom_120d: Optional[float] = 0.0

class GatewayResponse(BaseModel):
    status: str
    message: str
    orchestrator_response: Optional[Dict[str, Any]] = None
