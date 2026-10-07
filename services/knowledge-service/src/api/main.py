import uuid
import psycopg2
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from core.models import IngestAuditRequest, SearchRequest, SearchResponse, SearchResult
from core.config import settings
from core.logging import get_logger
from adapters.huggingface_embedding_adapter import HuggingFaceEmbeddingAdapter
from adapters.pgvector_adapter import PGVectorAdapter
from services.knowledge_agent import KnowledgeAgent

logger = get_logger("centinela.knowledge-service", settings.log_level)
app = FastAPI(title="Centinela - El Bibliotecario (Knowledge Service, Enterprise Edition)")

# Dependency Injection
embedding_provider = HuggingFaceEmbeddingAdapter()
vector_store = PGVectorAdapter(
    embedding_provider=embedding_provider, 
    database_url=settings.database_url
)
agent = KnowledgeAgent(vector_store=vector_store)

# Global Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "detail": None, "trace_id": str(uuid.uuid4())},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc), "trace_id": str(uuid.uuid4())},
    )

@app.get("/health")
async def health_check():
    checks = {}
    try:
        # Note: psycopg2 needs postgresql:// not postgresql+psycopg2:// for standard connect
        dsn = settings.database_url.replace("postgresql+psycopg2://", "postgresql://")
        conn = psycopg2.connect(dsn)
        conn.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}

@app.post("/api/v1/knowledge/ingest/document")
async def ingest_document(namespace: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    content = await file.read()
    chunks_created = agent.ingest_pdf(content, file.filename, namespace)
    return {"status": "success", "chunks_processed": chunks_created}

@app.post("/api/v1/knowledge/ingest/audit")
async def ingest_audit(request: IngestAuditRequest):
    text = f"Action {request.rejected_action} was rejected because: {request.rejection_reason}"
    metadata = {
        "alert_id": request.alert_id,
        "entities": request.entities_involved,
        "type": "human_rejection"
    }
    agent.ingest_audit_log(text, "audit_log", metadata)
    return {"status": "success", "message": "Audit log ingested."}

@app.post("/api/v1/knowledge/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    results = agent.search(request.query, request.namespace, request.top_k)
    response_results = [
        SearchResult(
            text=doc.page_content,
            similarity_score=1.0 - distance,
            metadata=doc.metadata
        )
        for doc, distance in results
    ]
    return SearchResponse(results=response_results)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8001, reload=True)
