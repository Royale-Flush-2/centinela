from typing import Literal
from pydantic import BaseModel


class DecisionRequest(BaseModel):
    decision: Literal["aprobar", "rechazar", "editar"]
    motivo: str


class ChatRequest(BaseModel):
    alerta_id: int
    mensaje: str

