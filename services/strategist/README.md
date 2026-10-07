# Centinela - El Estratega (The Strategist)

This directory contains the microservice for the **Strategist** agent of the Centinela autonomous system.

## Role

The Strategist consumes root cause analysis events (`AnalysisComplete`), evaluates financial impact in COP, and formulates actionable, specific proposals for human review (`ProposalReady`).

## Architecture & Code Structure

- **Framework**: FastAPI
- **Data Models**: Pydantic models enforcing event payloads and contracts.
- **Project Structure**:
  - `src/core/models.py`: Pydantic definitions for event payloads (`AnalysisCompleteEvent`, `ProposalReadyEvent`, `Proposal`, `FinancialBaseline`).
  - `src/core/agent.py`: Core Strategist agent coordinating memory checks, LLM generation, and deterministic DB impact calculations.
  - `src/core/ports/`: Interfaces/contracts (`IDatabase`, `ILLMProvider`, `IVectorStore`).
  - `src/adapters/`: Concrete implementations (`PostgresAdapter`, `KnowledgeServiceAdapter`, `NotImplementedLLMProvider`).
  - `src/core/config.py`: Environment configuration via `pydantic-settings`.
  - `src/core/logging.py`: Structured JSON logger.
  - `src/api/main.py`: FastAPI application exposing endpoints and dependency injection.

## Setup & Running Locally

### 1. Environment & Dependencies

Using `uv`:

```bash
uv sync
```

Or activate the virtual environment:

```bash
source .venv/bin/activate
```

Copy the example environment file if needed:

```bash
cp .env.example .env
```

### 2. Run the FastAPI Server

You can run the server using either `uvicorn` (recommended) or `python`:

**Option A (Recommended with uvicorn):**

```bash
uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

or if the virtualenv is activated:

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Option B (Direct python script or module):**

```bash
uv run python src/api/main.py
```

or:

```bash
uv run python -m src.api.main
```

*The server will start at `http://127.0.0.1:8000`.*

## Docker & AWS Deployment (ECS / App Runner)

The Docker image uses a multi-stage `uv` build and runs a minimal, non-root Debian container running standard Uvicorn. This is ideal for persistent connection pooling and direct HTTP routing between services in AWS ECS or AWS App Runner.

### Build the Docker Image
```bash
docker build -t strategist:latest .
```

### Run Locally with Docker
```bash
docker run -p 8000:8000 \
  -e CENTINELA_DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e CENTINELA_KNOWLEDGE_SERVICE_URL="http://host.docker.internal:8001" \
  strategist:latest
```

### Deploy to AWS (ECR + ECS / App Runner)
1. Authenticate Docker with Amazon ECR:
   ```bash
   aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
   ```
2. Tag and push the image:
   ```bash
   docker tag strategist:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/strategist:latest
   docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/strategist:latest
   ```
3. Deploy the container on AWS ECS (Fargate), AWS App Runner, or EKS passing environment variables (`CENTINELA_DATABASE_URL`, `CENTINELA_KNOWLEDGE_SERVICE_URL`, `CENTINELA_LOG_LEVEL`).

## API Endpoints

- **POST `/api/v1/strategist/analyze`**: Submit an `AnalysisComplete` payload. Returns a `ProposalReady` payload.
- **GET `/health`**: Returns the health status of the microservice and its downstream dependencies (Postgres database and Knowledge Service).
- **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
