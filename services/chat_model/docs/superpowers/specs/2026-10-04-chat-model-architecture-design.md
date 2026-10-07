# Chat Model Architecture Refactor Design

## Objective
Refactor the `chat_model` microservice to align with the hexagonal architecture used in the other project services (`strategist`, `postgres-mcp`, `knowledge-service`). Additionally, replace the current mocked tools with actual integrations: an MCP client for SQL operations (`postgres-mcp`) and a REST client for RAG operations (`knowledge-service`).

## Architecture Overview
The service will be restructured into a hexagonal (Clean Architecture) pattern:
- **`src/api/`**: Contains the delivery mechanisms (FastAPI routers and endpoints).
- **`src/core/`**: Contains business logic interfaces, domain entities (Pydantic schemas), and use cases.
- **`src/adapters/`**: Contains concrete implementations of external dependencies (LLMs, external APIs, MCP servers).

## Directory Structure
```
chat_model/
├── pyproject.toml / uv.lock
├── src/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py (FastAPI app setup)
│   │   └── router.py (Endpoints: /chat, /health, /alertas/...)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── schemas.py (ChatRequest, DecisionRequest)
│   │   └── interfaces.py (Protocols for LLM and Tools)
│   └── adapters/
│       ├── __init__.py
│       ├── llm_adapter.py (LangChain + Deepseek setup)
│       ├── postgres_mcp_client.py (Connects to postgres-mcp)
│       └── knowledge_client.py (HTTP calls to knowledge-service)
```

## Component Details

### 1. API (`src/api/`)
- **`main.py`**: Initializes the FastAPI app, registers routers, and sets up any global middleware or lifecycle events (like initializing the MCP client).
- **`router.py`**: Defines the `/chat` endpoint (returning a `StreamingResponse`), the `/health` check, and the `/alertas/{alerta_id}/decision` endpoint.

### 2. Core (`src/core/`)
- **`schemas.py`**: Preserves existing `ChatRequest` and `DecisionRequest` models.
- **`interfaces.py`**: Defines how the application communicates with the LLM and retrieves tools, ensuring the API layer doesn't depend directly on LangChain or specific clients.

### 3. Adapters (`src/adapters/`)
- **`postgres_mcp_client.py`**: 
  - Establishes a connection to the `postgres-mcp` service (e.g., via SSE or standard stdio if run locally, though likely SSE/HTTP for microservices).
  - Retrieves available SQL tools dynamically and exposes them as LangChain-compatible tools.
- **`knowledge_client.py`**: 
  - Implements the `consultar_politicas` tool.
  - Sends a `POST` request to `http://<knowledge-service>/api/v1/knowledge/search`.
  - Returns the context retrieved from the vector database.
- **`llm_adapter.py`**: 
  - Configures `ChatOpenAI` targeting the Deepseek API.
  - Binds the tools provided by the MCP client and the Knowledge client to the model.
  - Handles streaming the response generator back to the API.

## Data Flow
1. **Request**: The user sends a chat request to `POST /chat`.
2. **Routing**: The FastAPI router receives the request and invokes the Chat Use Case.
3. **Tool Resolution**: The adapter layer fetches SQL tools from `postgres-mcp` and the RAG tool from `knowledge-service`.
4. **LLM Invocation**: The deepseek model receives the prompt and the available tools.
5. **Execution**: If the model decides to use a tool, the corresponding adapter executes the MCP call or the REST call and feeds the result back to the LLM.
6. **Response**: The final output is streamed back to the user via Server-Sent Events (SSE).

## Open Questions & Assumptions
- **MCP Connection Protocol**: Assuming `postgres-mcp` exposes an SSE endpoint for network communication since they are separate microservices.
- **Dependency Management**: We will need to add necessary dependencies to `pyproject.toml` (e.g., `langchain-mcp-adapters` or official `mcp` SDK, `httpx`).
