from fastapi import APIRouter, Request
from app.domain.models import AnalyzerPayload, AnalyzerResponse
from app.services.analyzer_service import AnalyzerService

router = APIRouter()

@router.post("/analyze_metadata", response_model=AnalyzerResponse)
async def analyze_metadata(
    payload: AnalyzerPayload,
    request: Request
):
    mcp_client = request.app.state.mcp_client
    service = AnalyzerService(mcp_client=mcp_client)
    return await service.process_analysis(payload)
