from pydantic import BaseModel
from typing import List, Dict, Any

class IngestAuditRequest(BaseModel):
    alert_id: str
    rejected_action: str
    rejection_reason: str
    entities_involved: List[str]

class SearchRequest(BaseModel):
    query: str
    namespace: str
    top_k: int = 3

class SearchResult(BaseModel):
    text: str
    similarity_score: float
    metadata: Dict[str, Any]

class SearchResponse(BaseModel):
    results: List[SearchResult]
