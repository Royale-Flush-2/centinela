import os
from unittest.mock import AsyncMock, MagicMock
import pytest
from src.core.interfaces import LLMProvider
from src.adapters.llm_adapter import LangChainLLMProvider


def test_llm_provider_satisfies_protocol():
    provider = LangChainLLMProvider()
    assert isinstance(provider, LLMProvider)


def test_llm_provider_init_default(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    provider = LangChainLLMProvider()
    assert provider.llm.model_name == "deepseek-chat"
    assert provider.llm.openai_api_base == "https://api.deepseek.com/v1"
    assert provider.llm.openai_api_key.get_secret_value() == "fake-key"


def test_llm_provider_init_custom_env_and_model(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "custom-secret-key")
    provider = LangChainLLMProvider(model="deepseek-coder")
    assert provider.llm.model_name == "deepseek-coder"
    assert provider.llm.openai_api_base == "https://api.deepseek.com/v1"
    assert provider.llm.openai_api_key.get_secret_value() == "custom-secret-key"


@pytest.mark.asyncio
async def test_generate_response_without_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()
    mock_response = MagicMock(content="Respuesta sin tools")
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
    provider.llm = mock_llm

    res = await provider.generate_response("Hola", tools=[])

    mock_llm.ainvoke.assert_awaited_once_with("Hola")
    assert res == "Respuesta sin tools"


@pytest.mark.asyncio
async def test_generate_response_default_none_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()
    mock_response = MagicMock(content="Respuesta por defecto")
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
    provider.llm = mock_llm

    res = await provider.generate_response("Pregunta")

    mock_llm.ainvoke.assert_awaited_once_with("Pregunta")
    assert res == "Respuesta por defecto"


@pytest.mark.asyncio
async def test_generate_response_with_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()
    mock_bound_llm = MagicMock()
    mock_response = MagicMock(content="Respuesta con tools")
    mock_bound_llm.ainvoke = AsyncMock(return_value=mock_response)
    mock_llm.bind_tools = MagicMock(return_value=mock_bound_llm)
    provider.llm = mock_llm

    dummy_tool = MagicMock()
    res = await provider.generate_response("Consulta metricas", tools=[dummy_tool])

    mock_llm.bind_tools.assert_called_once_with([dummy_tool])
    mock_bound_llm.ainvoke.assert_awaited_once_with("Consulta metricas")
    assert res == "Respuesta con tools"


@pytest.mark.asyncio
async def test_stream_response_without_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()

    async def fake_astream(prompt):
        assert prompt == "Hola stream"
        yield MagicMock(content="Parte 1")
        yield MagicMock(content=" Parte 2")

    mock_llm.astream = fake_astream
    provider.llm = mock_llm

    chunks = []
    async for chunk in provider.stream_response("Hola stream", tools=[]):
        chunks.append(chunk)

    assert chunks == [
        "data: Parte 1\n\n",
        "data:  Parte 2\n\n",
    ]


@pytest.mark.asyncio
async def test_stream_response_default_none_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()

    async def fake_astream(prompt):
        assert prompt == "Hola stream default"
        yield MagicMock(content="Default chunk")

    mock_llm.astream = fake_astream
    provider.llm = mock_llm

    chunks = []
    async for chunk in provider.stream_response("Hola stream default"):
        chunks.append(chunk)

    assert chunks == [
        "data: Default chunk\n\n",
    ]


@pytest.mark.asyncio
async def test_stream_response_with_tools():
    provider = LangChainLLMProvider()
    mock_llm = MagicMock()
    mock_bound_llm = MagicMock()

    async def fake_bound_astream(prompt):
        assert prompt == "Hola stream con tools"
        yield MagicMock(content="Tool chunk 1")
        yield MagicMock(content=" Tool chunk 2")

    mock_bound_llm.astream = fake_bound_astream
    mock_llm.bind_tools = MagicMock(return_value=mock_bound_llm)
    provider.llm = mock_llm

    dummy_tool = MagicMock()
    chunks = []
    async for chunk in provider.stream_response("Hola stream con tools", tools=[dummy_tool]):
        chunks.append(chunk)

    mock_llm.bind_tools.assert_called_once_with([dummy_tool])
    assert chunks == [
        "data: Tool chunk 1\n\n",
        "data:  Tool chunk 2\n\n",
    ]
