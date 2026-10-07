from pydantic import BaseModel
from typing import List, Optional

class DataPoint(BaseModel):
    client_id: str
    saldo_vencido: float = 0.0
    max_dias_vencido: float = 0.0
    dias_pago_prom_120d: float = 0.0

class Neighbor(BaseModel):
    client_id: str
    distance: float

class AnalysisResponse(BaseModel):
    status: str
    message: str
    nearest_neighbors: Optional[List[Neighbor]] = None
