from abc import ABC, abstractmethod
from typing import Any, Dict, List

class IDatabaseConnection(ABC):
    @abstractmethod
    def get_connection(self):
        """Return a read-only database connection."""
        pass

    @abstractmethod
    def execute_readonly(self, sql: str) -> List[Dict[str, Any]]:
        """Execute a read-only query with security checks. Returns rows as dicts."""
        pass

    @abstractmethod
    def list_tables(self, schemas: List[str]) -> List[Dict[str, str]]:
        """List tables from given schemas."""
        pass

    @abstractmethod
    def describe_table(self, schema: str, table_name: str) -> List[Dict[str, str]]:
        """Return column info for a table."""
        pass
