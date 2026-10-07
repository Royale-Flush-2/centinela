# Knowledge Service — Centinela

> Enterprise RAG microservice providing vector search over business policies and audit logs.

## Architecture

Hexagonal architecture encapsulating LangChain, HuggingFace embeddings, and PGVector.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| CENTINELA_DATABASE_URL | No | postgresql+psycopg2://... | Connection string |
| CENTINELA_EMBEDDING_MODEL | No | all-MiniLM-L6-v2 | Model to use |
| CENTINELA_LOG_LEVEL | No | INFO | Logging level |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/knowledge/ingest/document | Upload and embed a PDF |
| POST | /api/v1/knowledge/ingest/audit | Save human rejection reason |
| POST | /api/v1/knowledge/search | Vector search |
| GET | /health | Liveness and DB check |

## Running Locally

```bash
uv sync
cp .env.example .env
uv run uvicorn src.api.main:app --reload --port 8001
```
