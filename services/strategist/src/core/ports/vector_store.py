from abc import ABC, abstractmethod
from typing import List

class IVectorStore(ABC):
    @abstractmethod
    def get_past_rejections(self, anomaly_summary: str, entities: List[str]) -> str:
        """
        Queries the audit_log vector space for past human rejections
        related to the current context, returning them as a constraint string.
        """
        pass
