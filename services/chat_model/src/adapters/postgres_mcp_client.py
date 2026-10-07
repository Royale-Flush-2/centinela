from langchain_mcp_adapters.client import MultiServerMCPClient

class PostgresMCPToolProvider:
    def __init__(self, mcp_server_url: str = "http://localhost:8000/sse"):
        self.mcp_server_url = mcp_server_url
        self.client = None

    async def initialize(self):
        """Setup SSE connection to postgres-mcp."""
        self.client = MultiServerMCPClient(
            connections={
                "postgres": {
                    "transport": "sse",
                    "url": self.mcp_server_url
                }
            }
        )

    async def get_tools(self) -> list:
        """Return the tools provided by the MCP server."""
        if self.client is None:
            raise RuntimeError("Client not initialized. Call initialize() first.")
        
        # Mocking connection for now until actual mcp tools are loaded
        # return await self.client.get_tools()
        return []

    async def close(self):
        """Close the connection to the MCP server."""
        if self.client is not None:
            if hasattr(self.client, "close") and callable(getattr(self.client, "close")):
                # Check if it returns a coroutine before awaiting it
                import inspect
                close_method = getattr(self.client, "close")
                if inspect.iscoroutinefunction(close_method):
                    await close_method()
                else:
                    close_method()
            self.client = None
