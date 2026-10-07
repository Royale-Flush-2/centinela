from pydantic import BaseModel
from typing import List

class AnalyzerPayload(BaseModel):
    anomalous_client_id: str
    reference_ids: List[str]

class AnalyzerResponse(BaseModel):
    status: str
    message: str
