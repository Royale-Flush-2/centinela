from unittest.mock import MagicMock
import pytest
from tools import consultar_metricas, consultar_politicas
from llm import get_chat_response, get_llm, TOOLS


def test_tool_definition():
    assert consultar_metricas.name == "consultar_metricas"
    assert "v_" in consultar_metricas.description


def test_consultar_politicas_definition():
    assert consultar_politicas.name == "consultar_politicas"
    assert "políticas" in consultar_politicas.description.lower() or "politicas" in consultar_politicas.description.lower()


def test_tool_execution_simulation():
    res_metricas = consultar_metricas.invoke({"query": "SELECT * FROM v_ventas"})
    assert "Resultado simulado para: SELECT * FROM v_ventas" in res_metricas

    res_politicas = consultar_politicas.invoke({"query": "descuentos"})
    assert "Política simulada para: descuentos" in res_politicas


def test_consultar_metricas_readonly_protection():
    res_blocked = consultar_metricas.invoke({"query": "DROP TABLE alertas;"})
    assert "Error:" in res_blocked
    assert "solo se permiten consultas de lectura" in res_blocked.lower()


def test_get_llm_tool_binding():
    llm_with_tools = get_llm(api_key="sk-test-key")
    assert llm_with_tools is not None
    assert len(TOOLS) == 2


def test_get_chat_response_simulated(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    response = get_chat_response("¿Cuál es el margen?")
    assert "Respuesta simulada para: ¿Cuál es el margen?" in response


def test_get_chat_response_with_api_key(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "real-key-for-test")
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="Respuesta del modelo")

    monkeypatch.setattr("llm.get_llm", lambda api_key=None: mock_llm)
    response = get_chat_response("¿Pregunta?")
    assert response == "Respuesta del modelo"
