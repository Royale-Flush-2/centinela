from abc import ABC, abstractmethod
from typing import Dict, Any
from app.domain.models import IngestPayload

class IOrchestratorClient(ABC):
    @abstractmethod
    async def orchestrate_flow(self, payload: IngestPayload) -> Dict[str, Any]:
        pass
