from abc import ABC, abstractmethod
from typing import Dict, Any
from app.domain.models import AnomalyData

class IClusteringClient(ABC):
    @abstractmethod
    async def evaluate_strategy(self, payload: AnomalyData) -> Dict[str, Any]:
        """Envía los datos al clustering service como una estrategia de evaluación."""
        pass
