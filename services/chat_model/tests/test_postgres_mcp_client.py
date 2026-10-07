import pytest
from src.adapters.postgres_mcp_client import PostgresMCPToolProvider
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_postgres_mcp_client_initialization():
    provider = PostgresMCPToolProvider(mcp_server_url="http://fake-server/sse")
    assert provider.mcp_server_url == "http://fake-server/sse"
    assert provider.client is None

    # Test initialize
    await provider.initialize()
    assert provider.client is not None
    assert provider.client.connections["postgres"]["transport"] == "sse"
    assert provider.client.connections["postgres"]["url"] == "http://fake-server/sse"

@pytest.mark.asyncio
async def test_postgres_mcp_client_get_tools_uninitialized():
    provider = PostgresMCPToolProvider()
    with pytest.raises(RuntimeError, match="Client not initialized"):
        await provider.get_tools()

@pytest.mark.asyncio
async def test_postgres_mcp_client_get_tools():
    provider = PostgresMCPToolProvider()
    await provider.initialize()
    
    # As requested, get_tools returns an empty list mocked for now
    tools = await provider.get_tools()
    assert tools == []

@pytest.mark.asyncio
async def test_postgres_mcp_client_close():
    provider = PostgresMCPToolProvider()
    await provider.initialize()
    
    # Should not crash even though MultiServerMCPClient has no close method
    await provider.close()
    
    assert provider.client is None

@pytest.mark.asyncio
async def test_postgres_mcp_client_close_with_mock():
    provider = PostgresMCPToolProvider()
    await provider.initialize()
    
    # Inject a mock client with a close method to verify it would be called
    mock_client = MagicMock()
    mock_client.close = AsyncMock()
    provider.client = mock_client
    
    await provider.close()
    
    mock_client.close.assert_awaited_once()
    assert provider.client is None
