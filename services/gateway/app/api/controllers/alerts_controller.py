from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.infrastructure.alerts_repository import alerts_repo
import time
import json

router = APIRouter()

class ActionRequest(BaseModel):
    id: str
    quantity: Optional[int] = None

class DecisionBody(BaseModel):
    actions: Optional[List[ActionRequest]] = None
    protects: Optional[float] = None
    reason: Optional[str] = None
    details: Optional[str] = None

@router.get("/alerts")
async def list_alerts(view: str = "pending", sort: str = "amount", topic: Optional[str] = None, status: Optional[str] = None):
    all_alerts = await alerts_repo.list_alerts()
    
    mapped_alerts = []
    for a in all_alerts:
        mapped_alerts.append({
            "id": a["id"],
            "severity": a["severity"],
            "confidence": a["confidence"],
            "status": a["status"],
            "topic": a["topic"],
            "typeLabel": a["type_label"],
            "entityLabel": a["entity_label"],
            "headline": a["headline"],
            "description": a["description"] or "",
            "amountAtRisk": float(a["amount_at_risk"]) if a["amount_at_risk"] else 0.0,
            "createdAt": a["created_at"].isoformat() if a["created_at"] else "",
            "agent": a["agent"],
            "series": {
                "label": "Coverage",
                "unit": "days",
                "values": [14.5, 14.1, 13.6, 13.0, 12.1, 11.4, 10.6, 9.6, 8.7, 7.8, 6.9, 6.0, 5.1, 4.2],
                "threshold": 10,
                "thresholdType": "min",
                "summary": "10 days"
            }
        })
    
    if view == "pending":
        mapped_alerts = [a for a in mapped_alerts if a["status"] in ["new", "analyzing", "proposal"]]
    elif view == "approved":
        mapped_alerts = [a for a in mapped_alerts if a["status"] == "approved"]
    
    if sort == "amount":
        mapped_alerts.sort(key=lambda x: x["amountAtRisk"], reverse=True)
    elif sort == "recent":
        mapped_alerts.sort(key=lambda x: x["createdAt"], reverse=True)
    
    facets = {
        "topic": [{"value": "inventory", "count": len(mapped_alerts)}],
        "status": [{"value": "proposal", "count": len([a for a in mapped_alerts if a["status"] == "proposal"])}],
        "priority": [{"value": "critical", "count": len([a for a in mapped_alerts if a["severity"] == "critical"])}]
    }
    
    return {
        "alerts": mapped_alerts,
        "total": len(mapped_alerts),
        "viewTotal": len(mapped_alerts),
        "facets": facets
    }

@router.get("/summary")
async def get_summary():
    all_alerts = await alerts_repo.list_alerts()
    pending = [a for a in all_alerts if a["status"] in ["new", "analyzing", "proposal"]]
    amount_at_risk = sum(float(a["amount_at_risk"]) for a in pending if a["amount_at_risk"])
    return {
        "amountAtRisk": amount_at_risk,
        "bySeverity": {
            "critical": len([a for a in pending if a["severity"] == "critical"]),
            "high": len([a for a in pending if a["severity"] == "high"]),
            "medium": len([a for a in pending if a["severity"] == "medium"]),
            "low": len([a for a in pending if a["severity"] == "low"]),
        },
        "pending": len(pending),
        "ready": len([a for a in pending if a["status"] == "proposal"]),
        "inProgress": len([a for a in pending if a["status"] != "proposal"]),
        "lastCheck": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@router.get("/alerts/{alert_id}/detail")
async def get_alert_detail(alert_id: str):
    alert = await alerts_repo.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    mapped_alert = {
        "id": alert["id"],
        "severity": alert["severity"],
        "confidence": alert["confidence"],
        "status": alert["status"],
        "topic": alert["topic"],
        "typeLabel": alert["type_label"],
        "entityLabel": alert["entity_label"],
        "headline": alert["headline"],
        "description": alert["description"] or "",
        "amountAtRisk": float(alert["amount_at_risk"]) if alert["amount_at_risk"] else 0.0,
        "createdAt": alert["created_at"].isoformat() if alert["created_at"] else "",
        "agent": alert["agent"],
        "series": {
            "label": "Coverage",
            "unit": "days",
            "values": [14.5, 14.1, 13.6, 13.0, 12.1, 11.4, 10.6, 9.6, 8.7, 7.8, 6.9, 6.0, 5.1, 4.2],
            "threshold": 10,
            "thresholdType": "min",
            "summary": "10 days"
        }
    }
    
    return {
        "alert": mapped_alert,
        "ready": alert["status"] == "proposal",
        "source": "generated",
        "markdown": alert["markdown"],
        "result": None,
        "decision": {
            "type": alert["decision_type"],
            "at": alert["decision_at"].isoformat() if alert["decision_at"] else None,
            "actions": json.loads(alert["decision_actions"]) if alert["decision_actions"] else None,
            "protects": float(alert["decision_protects"]) if alert["decision_protects"] else None,
            "reason": alert["decision_reason"],
            "details": alert["decision_details"]
        } if alert["decision_type"] else None
    }

@router.post("/alerts/{alert_id}/{action}")
async def decide_alert(alert_id: str, action: str, body: DecisionBody):
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    decision_type = "approved" if action == "approve" else "rejected"
    await alerts_repo.decide_alert(alert_id, decision_type, body.dict())
    
    alert = await alerts_repo.get_alert(alert_id)
    return {
        "id": alert["id"],
        "severity": alert["severity"],
        "confidence": alert["confidence"],
        "status": alert["status"],
        "topic": alert["topic"]
    }
