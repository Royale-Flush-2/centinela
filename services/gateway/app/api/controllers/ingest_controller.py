from fastapi import APIRouter, Depends
from app.domain.models import IngestPayload, GatewayResponse
from app.services.gateway_service import GatewayService
from app.api.dependencies import get_gateway_service

router = APIRouter()

@router.post("/ingest", response_model=GatewayResponse)
async def ingest_data(
    payload: IngestPayload,
    service: GatewayService = Depends(get_gateway_service)
):
    return await service.process_ingestion(payload)
