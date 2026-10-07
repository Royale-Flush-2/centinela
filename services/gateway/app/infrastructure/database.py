import asyncpg
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        logger.info("Connecting to database...")
        self.pool = await asyncpg.create_pool(settings.database_url)
        await self._init_db()

    async def disconnect(self):
        if self.pool:
            logger.info("Closing database connection...")
            await self.pool.close()

    async def _init_db(self):
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS centinela_alerts (
                    id VARCHAR(50) PRIMARY KEY,
                    severity VARCHAR(20),
                    confidence VARCHAR(20),
                    status VARCHAR(20),
                    topic VARCHAR(50),
                    type_label VARCHAR(100),
                    entity_label VARCHAR(100),
                    headline TEXT,
                    description TEXT,
                    amount_at_risk NUMERIC,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    agent VARCHAR(100),
                    markdown TEXT,
                    decision_type VARCHAR(20),
                    decision_actions JSONB,
                    decision_protects NUMERIC,
                    decision_reason TEXT,
                    decision_details TEXT,
                    decision_at TIMESTAMP WITH TIME ZONE
                )
            """)

db = Database()
