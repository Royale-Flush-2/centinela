from pydantic import BaseModel
from typing import List, Dict, Any

class FinancialBaseline(BaseModel):
    affected_revenue_cop: float
    current_margin_cop: float

class AnalysisCompleteEvent(BaseModel):
    alert_id: str
    anomaly_category: str
    root_cause_summary: str
    entities_involved: List[str]
    financial_baseline: FinancialBaseline
    policy_context: List[str]

class Proposal(BaseModel):
    proposal_id: str
    action_type: str
    description: str
    estimated_impact_cop: float
    parameters: Dict[str, Any]
    is_recommended: bool

class ProposalReadyEvent(BaseModel):
    alert_id: str
    status: str = "ready_for_human"
    pesos_at_risk: float
    summary_sentence: str
    confidence_level: str
    proposals: List[Proposal] = []
    markdown: str = ""
