from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from src.core.schemas import ChatRequest, DecisionRequest
from src.adapters.llm_adapter import LangChainLLMProvider
from src.adapters.knowledge_client import KnowledgeToolProvider

router = APIRouter()
llm_provider = LangChainLLMProvider()
knowledge_provider = KnowledgeToolProvider()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/alertas/{alerta_id}/decision")
async def process_decision(alerta_id: int, request: DecisionRequest):
    return {"status": "success", "alerta_id": alerta_id, "decision": request.decision}


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    tools = await knowledge_provider.get_tools()
    return StreamingResponse(
        llm_provider.stream_response(request.mensaje, tools),
        media_type="text/event-stream",
    )
