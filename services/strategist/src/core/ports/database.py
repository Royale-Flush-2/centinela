from abc import ABC, abstractmethod
from typing import Dict, Any

class IDatabase(ABC):
    @abstractmethod
    def calculate_action_impact(self, action_type: str, parameters: Dict[str, Any], current_margin_cop: float) -> float:
        """
        Executes raw deterministic queries (e.g., against lista_precios and costos_proveedor)
        to calculate the exact COP impact of a proposed action.
        """
        pass
