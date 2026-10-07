# Chat Model Design Spec

## Overview
The `chat_model` is a FastAPI-based AI service designed to assist human reviewers in the "Bandeja de decisiones" (Decision Inbox) for the Centinela multi-agent system. It allows users to ask natural language questions about specific business alerts, retrieve context about root causes and proposed actions, and confidently approve or reject proposals.

## Architecture
- **Backend Framework:** FastAPI (Python)
- **AI/LLM Orchestration:** LangChain / LangGraph
- **Database:** PostgreSQL (with `pgvector` for RAG)
- **Integration Point:** Acts as the API bridge between the Next.js frontend and the PostgreSQL database representing the multi-agent system's state.

## Core Components & Endpoints

### 1. Alert State & Bitácora Integration
The model expects the following tables in the `centinela` PostgreSQL schema:
- `alertas`: Stores the current state of an anomaly (`id`, `estado`, `causa`, `evidencia`, `propuesta_estratega`, `metadata`).
- `bitacora`: An immutable log table for auditing actions, approvals, and rejections.

### 2. API Endpoints
- `POST /chat`: 
  - **Payload:** `{ "alerta_id": int, "mensaje": str }`
  - **Behavior:** Loads the context of the alert from the database. Injects this into the LLM prompt. The LLM processes the message, optionally calling tools, and streams the response back via Server-Sent Events (SSE).
- `POST /alertas/{id}/decision`: 
  - **Payload:** `{ "decision": "aprobar" | "rechazar" | "editar", "motivo": str }`
  - **Behavior:** Updates the alert's state in the `alertas` table and appends a record to the `bitacora`.

### 3. AI Agent & Tools
The LLM adheres to the strict "Golden Rule": it does not invent numbers; it retrieves them via controlled tools.
- **ConsultarPoliticas (RAG Tool):** Executes vector similarity searches over `pgvector` to find company policies (credit, discounts, inventory).
- **ConsultarMetricas (SQL Tool):** Executes read-only SQL queries restricted strictly to the semantic views (`v_*` prefix, e.g., `v_ventas`, `v_cobertura_inventario`). It is prohibited from querying raw tables.

## Data Flow
1. User submits a question via `POST /chat` with the `alerta_id`.
2. The system fetches the corresponding row from the `alertas` table (fetching Watchman, Analyst, and Strategist data).
3. The LLM analyzes the query. If policy rules are needed, it invokes `ConsultarPoliticas`. If historical or specific business metrics are needed, it invokes `ConsultarMetricas`.
4. The LLM synthesizes the tool outputs into a natural language response, citing its sources and data.
5. The response is streamed to the frontend via SSE.

## Error Handling & Robustness
- **Tool Failures:** If a SQL query fails or is out-of-bounds, the tool returns a graceful error to the LLM, prompting it to re-attempt or inform the user.
- **Timeouts:** LLM calls and database queries will have explicit timeouts to maintain predictable latency.

## Security & Constraints
- **Read-only SQL:** The database connection used by the `ConsultarMetricas` tool must be granted read-only permissions exclusively to the `v_*` views.
- **No External Actions:** The chat model never executes the proposed actions; it only persists the human's decision. Execution is handled by a separate Executor (Ejecutor) agent.
