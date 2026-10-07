import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_chat_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {"alerta_id": 1, "mensaje": "hello"}
        response = await ac.post("/chat", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "data:" in response.text
    assert "data: Hola\n\n" in response.text
    assert "data: Soy el agente\n\n" in response.text


@pytest.mark.asyncio
async def test_chat_endpoint_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Missing mensaje
        payload = {"alerta_id": 1}
        response = await ac.post("/chat", json=payload)
    assert response.status_code == 422
