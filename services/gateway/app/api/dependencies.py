from app.core.config import settings
from app.infrastructure.http_orchestrator_client import HttpOrchestratorClient
from app.services.gateway_service import GatewayService

orchestrator_client = HttpOrchestratorClient(orchestrator_url=settings.orchestrator_url)
gateway_service = GatewayService(orchestrator_client=orchestrator_client)

def get_gateway_service() -> GatewayService:
    return gateway_service
