from typing import List, Dict, Any
from src.core.ports.llm_provider import ILLMProvider
from src.core.models import AnalysisCompleteEvent

class NotImplementedLLMProvider(ILLMProvider):
    def generate_solutions(self, event: AnalysisCompleteEvent, constraints: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Missing integration: LLM API key and prompt logic needed here.")
