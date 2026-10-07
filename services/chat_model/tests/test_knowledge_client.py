import os
from unittest.mock import MagicMock, patch
import httpx
import pytest

from src.adapters.knowledge_client import (
    consultar_politicas,
    KnowledgeToolProvider,
    get_knowledge_tools,
)
from src.core.interfaces import ToolProvider


def test_tool_definition():
    """Verify tool metadata and attributes."""
    assert consultar_politicas.name == "consultar_politicas"
    assert "políticas" in consultar_politicas.description.lower() or "rag" in consultar_politicas.description.lower()


def test_consultar_politicas_success(monkeypatch):
    """Verify successful response when knowledge-service returns 200."""
    fake_response = MagicMock(spec=httpx.Response)
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "results": [
            {
                "text": "La política de reembolso permite cancelaciones dentro de 30 días.",
                "similarity_score": 0.95,
                "metadata": {"source": "politicas_reembolso.pdf"},
            }
        ]
    }
    fake_response.raise_for_status.return_value = None

    with patch("httpx.post", return_value=fake_response) as mock_post:
        result = consultar_politicas.invoke({"query": "politica de reembolso"})
        mock_post.assert_called_once()
        call_args, call_kwargs = mock_post.call_args
        assert "/api/v1/knowledge/search" in call_args[0]
        assert call_kwargs["json"] == {"query": "politica de reembolso"}
        assert call_kwargs["timeout"] == 10.0
        assert "La política de reembolso permite cancelaciones" in result


def test_consultar_politicas_http_error():
    """Verify graceful handling when knowledge-service returns an HTTP error status."""
    fake_response = MagicMock(spec=httpx.Response)
    fake_response.status_code = 500
    fake_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=fake_response
    )

    with patch("httpx.post", return_value=fake_response):
        result = consultar_politicas.invoke({"query": "error query"})
        assert "Error retrieving knowledge:" in result


def test_consultar_politicas_connection_error():
    """Verify graceful handling when knowledge-service is unreachable."""
    with patch("httpx.post", side_effect=httpx.ConnectError("Connection refused")):
        result = consultar_politicas.invoke({"query": "unreachable query"})
        assert "Error retrieving knowledge:" in result
        assert "Connection refused" in result


def test_consultar_politicas_timeout():
    """Verify graceful handling when request times out."""
    with patch("httpx.post", side_effect=httpx.TimeoutException("Request timed out")):
        result = consultar_politicas.invoke({"query": "timeout query"})
        assert "Error retrieving knowledge:" in result
        assert "Request timed out" in result


def test_consultar_politicas_custom_url(monkeypatch):
    """Verify that KNOWLEDGE_SERVICE_URL environment variable is respected."""
    monkeypatch.setenv("KNOWLEDGE_SERVICE_URL", "http://custom-knowledge-host:8080")
    fake_response = MagicMock(spec=httpx.Response)
    fake_response.status_code = 200
    fake_response.json.return_value = {"results": []}
    fake_response.raise_for_status.return_value = None

    with patch("httpx.post", return_value=fake_response) as mock_post:
        consultar_politicas.invoke({"query": "test url"})
        call_args, _ = mock_post.call_args
        assert call_args[0] == "http://custom-knowledge-host:8080/api/v1/knowledge/search"


@pytest.mark.asyncio
async def test_knowledge_tool_provider():
    """Verify KnowledgeToolProvider returns the tool and satisfies ToolProvider protocol."""
    provider = KnowledgeToolProvider()
    tools = await provider.get_tools()
    assert len(tools) == 1
    assert tools[0].name == "consultar_politicas"
    assert isinstance(provider, ToolProvider)


def test_get_knowledge_tools():
    """Verify helper function returns the knowledge tools list."""
    tools = get_knowledge_tools()
    assert len(tools) == 1
    assert tools[0].name == "consultar_politicas"
