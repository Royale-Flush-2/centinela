from fastapi import APIRouter, Depends
from app.domain.models import AnomalyData, LookoutResponse
from app.services.lookout_service import LookoutService
from app.api.dependencies import get_lookout_service

router = APIRouter()

@router.post("/process_anomaly", response_model=LookoutResponse)
async def process_anomaly(
    payload: AnomalyData,
    service: LookoutService = Depends(get_lookout_service)
):
    return await service.evaluate_anomaly(payload)
