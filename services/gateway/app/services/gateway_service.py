import logging
import uuid
import datetime
from app.domain.interfaces import IOrchestratorClient
from app.domain.models import IngestPayload, GatewayResponse
from app.infrastructure.alerts_repository import alerts_repo

logger = logging.getLogger(__name__)

class GatewayService:
    def __init__(self, orchestrator_client: IOrchestratorClient):
        self.orchestrator_client = orchestrator_client

    async def process_ingestion(self, payload: IngestPayload) -> GatewayResponse:
        logger.info(f"GatewayService: Enviando registro del cliente {payload.client_id} al Orquestador")
        
        # Create an initial alert in the database
        now = datetime.datetime.now()
        mmdd = f"{now.month:02d}{now.day:02d}"
        alert_id = f"ALR-{mmdd}-{str(uuid.uuid4())[:8].upper()}"
        
        amount = getattr(payload, "saldo_vencido", 0.0)
        
        await alerts_repo.create_alert(
            alert_id=alert_id,
            severity="critical" if amount > 5000000 else "high",
            topic="receivables",
            headline=f"Cartera vencida detectada para cliente {payload.client_id}",
            amount_at_risk=amount,
            agent="En cola para el Analista",
            markdown=""
        )
        
        # Call Orchestrator
        orchestrator_response = await self.orchestrator_client.orchestrate_flow(payload)
        
        # Once Orchestrator finishes, it returns a final_state with the analysis and strategy.
        # We need to extract the Markdown and update the alert.
        final_state = orchestrator_response.get("final_state", {})
        analyzer_report = final_state.get("analyzer_report", "")
        strategist_report = final_state.get("strategist_report", "")
        
        # Combine the markdown
        full_markdown = f"{analyzer_report}\n\n{strategist_report}"
        
        # Update the alert in DB
        await alerts_repo.update_alert_status(alert_id, "proposal", full_markdown)
        
        logger.info(f"GatewayService: Registro {payload.client_id} orquestado exitosamente")
        
        return GatewayResponse(
            status="success",
            message="Datos recibidos y orquestados",
            orchestrator_response=orchestrator_response
        )
