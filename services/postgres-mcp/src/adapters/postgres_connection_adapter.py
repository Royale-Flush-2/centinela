import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Any, Dict, List
from core.ports.database_connection import IDatabaseConnection
from core.config import settings
from core.logging import get_logger

logger = get_logger("postgres_adapter")

class PostgresConnectionAdapter(IDatabaseConnection):
    def __init__(self):
        self.url = settings.database_url
        self.timeout = settings.statement_timeout

    def get_connection(self):
        conn = psycopg2.connect(self.url)
        conn.set_session(readonly=True)
        return conn

    def _check_sql_safety(self, sql: str) -> None:
        sql_upper = sql.upper()
        forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE", "COMMIT"]
        if any(keyword in sql_upper for keyword in forbidden):
            logger.error(f"Security violation: unsafe SQL detected: {sql}")
            raise ValueError("Only read-only SELECT queries are allowed.")

    def execute_readonly(self, sql: str) -> List[Dict[str, Any]]:
        self._check_sql_safety(sql)
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"SET statement_timeout = {self.timeout}")
                cur.execute(sql)
                results = cur.fetchall()
                return [dict(row) for row in results]
        finally:
            conn.close()

    def list_tables(self, schemas: List[str] = ["public"]) -> List[Dict[str, str]]:
        schemas_str = "','".join(schemas)
        sql = f"""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema IN ('{schemas_str}') 
            AND table_type = 'BASE TABLE';
        """
        return self.execute_readonly(sql)

    def describe_table(self, schema: str, table_name: str) -> List[Dict[str, str]]:
        sql = f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = '{schema}' 
            AND table_name = '{table_name}';
        """
        return self.execute_readonly(sql)
