import pytest
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.mark.asyncio
async def test_post_decision():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {"decision": "aprobar", "motivo": "looks good"}
        response = await ac.post("/alertas/1/decision", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success", "alerta_id": 1, "decision": "aprobar"}


@pytest.mark.asyncio
async def test_post_decision_invalid_choice():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {"decision": "invalid_choice", "motivo": "test"}
        response = await ac.post("/alertas/1/decision", json=payload)
    assert response.status_code == 422
