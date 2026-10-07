import os
from mcp.server.fastmcp import FastMCP
from adapters.postgres_connection_adapter import PostgresConnectionAdapter
from core.logging import get_logger
from core.config import settings

logger = get_logger("postgres-mcp", settings.log_level)
host = os.getenv("HOST", "127.0.0.1")
port = int(os.getenv("PORT", "8000"))
mcp = FastMCP("DatabaseMCP", host=host, port=port)
db = PostgresConnectionAdapter()

@mcp.tool()
def execute_readonly_sql(sql: str) -> str:
    """Execute a read-only SQL query on the database.
    Only SELECT statements are allowed.
    Returns results as a JSON string or an error message.
    """
    logger.info(f"Executing SQL: {sql}")
    try:
        results = db.execute_readonly(sql)
        return str(results)
    except Exception as e:
        logger.error(f"Query execution failed: {str(e)}")
        return f"Error executing query: {str(e)}"

@mcp.tool()
def list_tables() -> str:
    """List all tables in the public schema of the database."""
    logger.info("Listing tables")
    try:
        tables = db.list_tables(["public"])
        return str(tables)
    except Exception as e:
        logger.error(f"Failed to list tables: {str(e)}")
        return f"Error listing tables: {str(e)}"

@mcp.tool()
def describe_table(table_name: str) -> str:
    """Describe the schema (columns and types) of a specific table."""
    logger.info(f"Describing table: {table_name}")
    try:
        schema = db.describe_table("public", table_name)
        return str(schema)
    except Exception as e:
        logger.error(f"Failed to describe table {table_name}: {str(e)}")
        return f"Error describing table: {str(e)}"

if __name__ == "__main__":
    logger.info("Starting Postgres MCP Server")
    if "PORT" in os.environ:
        mcp.run(transport='sse')
    else:
        mcp.run(transport='stdio')
