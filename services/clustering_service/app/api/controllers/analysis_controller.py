from fastapi import APIRouter, Depends
from app.domain.models import DataPoint, AnalysisResponse
from app.services.clustering_service import ClusteringService
from app.api.dependencies import get_clustering_service

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(
    point: DataPoint, 
    service: ClusteringService = Depends(get_clustering_service)
):
    return service.process_data_point(point)
