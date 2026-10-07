from unittest.mock import AsyncMock, patch
import pytest
import database as database_module
from database import close_db_pool, get_db_pool


@pytest.mark.asyncio
async def test_db_pool_creation(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://fake:fake@localhost:5432/fake")
    monkeypatch.setattr(database_module, "_pool", None)
    pool = await get_db_pool()
    # If asyncpg connects to a fake DB it throws an error, but we just check if it tries to init a pool
    assert pool is not None


@pytest.mark.asyncio
async def test_db_pool_success_and_caching(monkeypatch):
    mock_pool = AsyncMock()
    monkeypatch.setattr(database_module, "_pool", None)
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")

    with patch("asyncpg.create_pool", new_callable=AsyncMock) as mock_create_pool:
        mock_create_pool.return_value = mock_pool
        pool = await get_db_pool()
        assert pool == mock_pool
        mock_create_pool.assert_awaited_once_with(
            "postgresql://user:pass@localhost:5432/db"
        )

        # Second call should return cached pool without calling create_pool again
        pool_cached = await get_db_pool()
        assert pool_cached == mock_pool
        assert mock_create_pool.await_count == 1


@pytest.mark.asyncio
async def test_close_db_pool(monkeypatch):
    mock_pool = AsyncMock()
    monkeypatch.setattr(database_module, "_pool", mock_pool)
    await close_db_pool()
    mock_pool.close.assert_awaited_once()
    assert database_module._pool is None
