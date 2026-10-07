import json
from typing import List, Optional, Dict, Any
from app.infrastructure.database import db

class AlertsRepository:
    async def create_alert(self, alert_id: str, severity: str, topic: str, headline: str, amount_at_risk: float, agent: str, markdown: str):
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO centinela_alerts 
                (id, severity, confidence, status, topic, type_label, entity_label, headline, amount_at_risk, agent, markdown)
                VALUES ($1, $2, 'high', 'analyzing', $3, 'Anomaly', 'System', $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            """, alert_id, severity, topic, headline, amount_at_risk, agent, markdown)

    async def update_alert_status(self, alert_id: str, status: str, markdown: Optional[str] = None):
        async with db.pool.acquire() as conn:
            if markdown is not None:
                await conn.execute("UPDATE centinela_alerts SET status = $1, markdown = $2 WHERE id = $3", status, markdown, alert_id)
            else:
                await conn.execute("UPDATE centinela_alerts SET status = $1 WHERE id = $2", status, alert_id)

    async def list_alerts(self) -> List[Dict[str, Any]]:
        async with db.pool.acquire() as conn:
            records = await conn.fetch("SELECT * FROM centinela_alerts ORDER BY created_at DESC")
            return [dict(r) for r in records]

    async def get_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        async with db.pool.acquire() as conn:
            record = await conn.fetchrow("SELECT * FROM centinela_alerts WHERE id = $1", alert_id)
            return dict(record) if record else None

    async def decide_alert(self, alert_id: str, decision_type: str, body: Dict[str, Any]):
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE centinela_alerts
                SET status = $1, decision_type = $1, decision_actions = $2, decision_protects = $3, decision_reason = $4, decision_details = $5, decision_at = CURRENT_TIMESTAMP
                WHERE id = $6
            """, decision_type, json.dumps(body.get("actions", [])), body.get("protects"), body.get("reason"), body.get("details"), alert_id)

alerts_repo = AlertsRepository()
