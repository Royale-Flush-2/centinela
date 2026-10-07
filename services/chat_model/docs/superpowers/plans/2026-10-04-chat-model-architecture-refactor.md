# Chat Model Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `chat_model` to a hexagonal architecture and integrate real MCP and REST tools.

**Architecture:** We will move from a flat structure to `adapters`, `core`, and `api` layers. We will replace mocked tools with a REST call to `knowledge-service` and an MCP connection to `postgres-mcp`.

**Tech Stack:** FastAPI, LangChain, HTTPX, MCP Python SDK

**Spec:** `docs/superpowers/specs/2026-10-04-chat-model-architecture-design.md`

## Global Constraints

- Must maintain the existing API contract for `/chat`, `/health`, and `/alertas/{alerta_id}/decision`.
- Must not use `database.py` and `tools.py` anymore; these responsibilities move to the adapters layer.

---

### Task 1: Setup Core Domain and Interfaces

**Files:**
- Create: `src/core/schemas.py`
- Create: `src/core/interfaces.py`
- Delete: `src/schemas.py`

**Interfaces:**
- Produces: `ChatRequest`, `DecisionRequest` schemas
- Produces: `ToolProvider` and `LLMProvider` protocols

- [ ] **Step 1: Move schemas to core**

```bash
mkdir -p src/core
git mv src/schemas.py src/core/schemas.py
```

- [ ] **Step 2: Create interfaces.py**

```python
# src/core/interfaces.py
from typing import Protocol, List, Any

class ToolProvider(Protocol):
    async def get_tools(self) -> List[Any]:
        ...

class LLMProvider(Protocol):
    async def generate_response(self, prompt: str, tools: List[Any]) -> Any:
        ...
```

- [ ] **Step 3: Commit**

```bash
git add src/core/schemas.py src/core/interfaces.py
git commit -m "refactor: setup core domain and interfaces"
```

### Task 2: Knowledge REST Client Adapter

**Files:**
- Create: `src/adapters/knowledge_client.py`

**Interfaces:**
- Consumes: Nothing
- Produces: `get_knowledge_tools()` returning a LangChain tool.

- [ ] **Step 1: Implement knowledge client adapter**

```python
# src/adapters/knowledge_client.py
import httpx
from langchain_core.tools import tool

@tool
def consultar_politicas(query: str) -> str:
    """Busca en las políticas de la empresa usando RAG."""
    # Assuming knowledge-service is at http://localhost:8001
    try:
        response = httpx.post("http://localhost:8001/api/v1/knowledge/search", json={"query": query}, timeout=10.0)
        response.raise_for_status()
        return str(response.json())
    except Exception as e:
        return f"Error retrieving knowledge: {str(e)}"

class KnowledgeToolProvider:
    async def get_tools(self) -> list:
        return [consultar_politicas]
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/adapters
git add src/adapters/knowledge_client.py
git commit -m "feat: add knowledge REST client adapter"
```

### Task 3: Postgres MCP Client Adapter

**Files:**
- Create: `src/adapters/postgres_mcp_client.py`

**Interfaces:**
- Consumes: Nothing
- Produces: `PostgresMCPToolProvider`

- [ ] **Step 1: Implement MCP Client adapter**

```python
# src/adapters/postgres_mcp_client.py
from langchain_mcp_adapters.client import MultiServerMCPClient
import asyncio

class PostgresMCPToolProvider:
    def __init__(self, mcp_server_url: str = "http://localhost:8000/sse"):
        self.mcp_server_url = mcp_server_url
        self.client = None

    async def initialize(self):
        # Setup SSE connection to postgres-mcp
        # Note: Depending on actual langchain-mcp-adapters API, adjust connection logic
        pass

    async def get_tools(self) -> list:
        # Mocking connection for now until actual mcp tools are loaded
        # return await self.client.get_tools()
        return []
```
*Note: The exact MCP client setup will depend on the chosen SDK (e.g., SSE transport). We will refine this during implementation.*

- [ ] **Step 2: Commit**

```bash
git add src/adapters/postgres_mcp_client.py
git commit -m "feat: add postgres MCP client adapter scaffold"
```

### Task 4: LLM Adapter

**Files:**
- Create: `src/adapters/llm_adapter.py`
- Delete: `src/llm.py`, `src/tools.py`

**Interfaces:**
- Consumes: Tools from `ToolProvider`
- Produces: `LangChainLLMProvider`

- [ ] **Step 1: Implement LLM Adapter**

```python
# src/adapters/llm_adapter.py
import os
from langchain_openai import ChatOpenAI

class LangChainLLMProvider:
    def __init__(self, model: str = "deepseek-chat"):
        api_key = os.getenv("DEEPSEEK_API_KEY", "fake-key")
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://api.deepseek.com/v1"
        )

    async def generate_response(self, prompt: str, tools: list):
        if tools:
            llm_with_tools = self.llm.bind_tools(tools)
            response = await llm_with_tools.ainvoke(prompt)
        else:
            response = await self.llm.ainvoke(prompt)
        return str(response.content)
        
    async def stream_response(self, prompt: str, tools: list):
        llm_with_tools = self.llm.bind_tools(tools) if tools else self.llm
        async for chunk in llm_with_tools.astream(prompt):
            yield f"data: {chunk.content}\n\n"
```

- [ ] **Step 2: Clean up old files**

```bash
git rm src/llm.py src/tools.py
```

- [ ] **Step 3: Commit**

```bash
git add src/adapters/llm_adapter.py
git commit -m "refactor: create llm adapter and remove old tool/llm implementations"
```

### Task 5: API Layer Refactor

**Files:**
- Create: `src/api/router.py`
- Create: `src/api/main.py`
- Delete: `src/main.py`, `src/database.py`

**Interfaces:**
- Consumes: `LangChainLLMProvider`, `KnowledgeToolProvider`, `PostgresMCPToolProvider`, schemas

- [ ] **Step 1: Create Router**

```python
# src/api/router.py
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
    # Fetch tools
    tools = await knowledge_provider.get_tools()
    
    # Stream response
    return StreamingResponse(llm_provider.stream_response(request.message, tools), media_type="text/event-stream")
```

- [ ] **Step 2: Create Main**

```python
# src/api/main.py
from fastapi import FastAPI
from src.api.router import router

app = FastAPI(title="Centinela Chat Model")
app.include_router(router)
```

- [ ] **Step 3: Clean up old files**

```bash
mkdir -p src/api
git rm src/main.py src/database.py
```

- [ ] **Step 4: Commit**

```bash
git add src/api/router.py src/api/main.py
git commit -m "refactor: move FastAPI app to api layer and remove old files"
```
