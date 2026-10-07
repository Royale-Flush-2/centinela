from fastapi import APIRouter, Depends
from app.domain.models import AnalyzerPayload
from app.services.analyzer_service import AnalyzerService
from app.api.dependencies import get_analyzer_service

router = APIRouter()

@router.post("/analyze_metadata")
async def analyze_metadata(
    payload: AnalyzerPayload,
    service: AnalyzerService = Depends(get_analyzer_service)
):
    return service.process_metadata(payload)
