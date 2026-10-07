# Infrastructure Standardization & Monorepo Consolidation Design

## 1. Overview
The current architecture consists of 10 disparate microservices (9 backend Python services + 1 React frontend) functioning as an AI-driven operations anomaly detection platform. Currently, each microservice manages its own repository-like folder, individual Terraform configuration, and duplicated data contracts.

This design outlines the migration to a **Monorepo Architecture** coupled with a **Centralized Infrastructure-as-Code (IaC) Module Strategy** to eliminate boilerplate, enforce production-grade explicitly configured parameters, establish a unified AWS Secrets hierarchy, and simplify local development and deployment.

## 2. Monorepo Directory Layout

The workspace will be transformed into a single unified monorepo.

```
.
├── apps/                        # End-User Applications
│   └── frontend/                # React + Vite UI (Currently: Royale-Flush-Frontend)
│
├── services/                    # Backend Microservices & Agents
│   ├── gateway/                 # API Gateway
│   ├── orchestrator/            # LangGraph Orchestrator
│   ├── lookout-agent/           # Vigía Anomaly Detector
│   ├── clustering-service/      # ML Isolation Forest & KNN
│   ├── analyzer-agent/          # Root Cause ReAct Agent
│   ├── strategist/              # Strategy Generator
│   ├── knowledge-service/       # RAG Vector Store & Audit Ingestion
│   ├── postgres-mcp/            # FastMCP Database Server
│   └── chat-model/              # Streaming Chat Assistant
│
├── packages/                    # Shared Code & Contracts
│   ├── python/
│   │   ├── shared-models/       # Common Pydantic models (IngestPayload, AnalysisCompleteEvent)
│   │   └── common-logging/      # Unified structured logger setup
│   └── typescript/
│       └── api-contracts/       # TS interfaces reflecting backend schemas
│
├── infra/                       # Unified Infrastructure as Code
│   ├── modules/
│   │   └── apprunner_service/   # Reusable AWS AppRunner + ECR + IAM + Secrets module
│   └── environments/
│       ├── dev/                 # Dev environment Terraform root
│       └── prod/                # Prod environment Terraform root
│
├── .github/
│   └── workflows/               # Scoped CI/CD pipelines via path filtering
├── docker-compose.yml           # Unified local dev stack
└── pyproject.toml               # Python Workspace definition (e.g., uv workspace)
```

## 3. Infrastructure Module Strategy

### 3.1. Reusable Terraform Module (`infra/modules/apprunner_service`)
A single, highly-parameterized Terraform module will replace the ~85% duplicated IaC code across the current repositories.

**Production Principles Applied:**
- **No Silent Defaults:** All infrastructure parameters critical for production (e.g., `aws_region`, `cpu`, `memory`, `container_port`, `vpc_connector_arn`) MUST be explicitly provided by the calling environment. No silent default values are allowed to avoid false positives and hidden drift.
- **Explicit Schema Wiring:** The module expects an exact mapping of `env_variables` and `secrets_map`.

### 3.2. Standardized Secrets Management
Secrets will strictly follow a predefined path hierarchy in AWS Secrets Manager:
`/centinela/{environment}/{category}/{secret_key}`

**Examples:**
- Global API Keys: `/centinela/prod/global/deepseek_api_key`
- DB Credentials: `/centinela/prod/database/postgres_url`
- Service specific: `/centinela/prod/services/gateway/auth_token`

The reusable Terraform module will take a `secrets_map` and dynamically construct the IAM Policy allowing `secretsmanager:GetSecretValue` and `kms:Decrypt` ONLY for the specified ARNs, ensuring least-privilege access per service.

### 3.3. Environment Configuration Standardization
Every service will adopt uniform environment variable schemas prefixed with `CENTINELA_`.
Key mappings:
- `CENTINELA_ENV`: Deployment environment (`dev` | `prod`).
- `CENTINELA_LOG_LEVEL`: Log verbosity.
- **Inter-Service Networking:** All service discovery URLs will point to internal DNS endpoints (e.g., `http://orchestrator.centinela.internal:8004/orchestrate`) rather than public AppRunner URLs, leveraging AppRunner VPC Connectors and Route 53 Private Hosted Zones.

## 4. Scoped CI/CD Workflows
To prevent the "deploy everything" monorepo anti-pattern, deployment actions will rely on strict path filtering.

**Example Matrix/Filter Strategy:**
- Changes in `services/lookout-agent/**` trigger ONLY the `lookout-agent` test and deploy pipelines.
- Changes in `packages/python/shared-models/**` trigger unit tests for all dependent services, but deployments only proceed if tests pass globally.

## 5. Security & Isolation
- All services will reside within a private VPC.
- Internal communication occurs via VPC Connectors (`aws_apprunner_vpc_connector`), removing public ingress exposure.
- Gateway will act as the single entrypoint from public interfaces to internal subnets.

## 6. Migration Plan
1. **Repository Structure Migration**: Relocate directories into `apps/`, `services/`, and `infra/`. Initialize root configuration files (`pyproject.toml`, `.github`).
2. **Module Authoring**: Implement the `apprunner_service` Terraform module in `infra/modules/`.
3. **Configuration Audit**: Scrub hardcoded endpoints and legacy `API_KEY` names. Standardize all `.env.example` configurations.
4. **Secrets Provisioning**: Map out and create the AWS Secrets Manager paths.
5. **Terraform Integration**: Apply the centralized terraform roots in `infra/environments/prod` using the new module.

