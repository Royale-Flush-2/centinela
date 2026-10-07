from abc import ABC, abstractmethod
from typing import List, Tuple
from app.domain.models import DataPoint, Neighbor

class IAnomalyDetector(ABC):
    @abstractmethod
    def is_anomaly(self, data: DataPoint) -> Tuple[bool, List[float]]:
        pass

class IVectorRepository(ABC):
    @abstractmethod
    def find_nearest_neighbors(self, vector: List[float], exclude_client_id: str, k: int = 3) -> List[Neighbor]:
        pass
