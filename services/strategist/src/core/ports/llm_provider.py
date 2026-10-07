from abc import ABC, abstractmethod
from typing import List, Dict, Any
from src.core.models import AnalysisCompleteEvent

class ILLMProvider(ABC):
    @abstractmethod
    def generate_solutions(self, event: AnalysisCompleteEvent, constraints: str) -> str:
        """
        Takes the anomaly context and outputs structured Markdown text.
        Must be implemented by a concrete adapter (e.g., DeepSeekAdapter).
        """
        pass
