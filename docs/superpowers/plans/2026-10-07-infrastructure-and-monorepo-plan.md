# Infrastructure Standardization & Monorepo Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 10 microservice folders into a unified Monorepo structure, and consolidate their duplicated Terraform AWS AppRunner configurations into a single reusable module.

**Architecture:** A standard Monorepo directory structure (`apps/`, `services/`, `infra/`) combined with a central Terraform module (`infra/modules/apprunner_service`) that provisions AWS AppRunner, IAM roles, ECR, and Secrets Manager integration.

**Tech Stack:** Shell, Terraform (HCL), AWS AppRunner, AWS Secrets Manager

**Spec:** `docs/superpowers/specs/2026-10-07-infrastructure-and-monorepo-design.md`

## Global Constraints
- Target AWS Region is `us-east-2`.
- Base Terraform version requirement: `>= 1.5.0`, AWS provider `~> 5.0`.
- All secrets strictly follow the `/centinela/{env}/{category}/{key}` path schema.
- No silent defaults for CPU, memory, or container port in the AppRunner module.

---

### Task 1: Initialize Monorepo Directory Structure & Relocate Services

**Files:**
- Create: `infra/environments/prod/.keep`
- Modify: Move multiple directories.

**Interfaces:**
- Consumes: Existing repo directories.
- Produces: A unified `services/` and `apps/` layout.

- [ ] **Step 1: Create the base directory structure**

```bash
rm -rf */.git
mkdir -p apps services packages/python/shared-models packages/typescript/api-contracts infra/modules/apprunner_service infra/environments/prod
```

- [ ] **Step 2: Move Frontend application**

```bash
mv Royale-Flush-Frontend apps/frontend
```

- [ ] **Step 3: Move Backend services**

```bash
mv gateway orchestrator lookout_agent clustering_service analyzer_agent strategist knowledge-service postgres-mcp chat_model services/
```

- [ ] **Step 4: Verify structure and commit**

```bash
git init
git add apps/ services/ infra/ packages/
git commit -m "chore: migrate to monorepo structure"
```

---

### Task 2: Implement the Reusable Terraform Module (`apprunner_service`)

**Files:**
- Create: `infra/modules/apprunner_service/variables.tf`
- Create: `infra/modules/apprunner_service/main.tf`
- Create: `infra/modules/apprunner_service/secrets.tf`
- Create: `infra/modules/apprunner_service/outputs.tf`

**Interfaces:**
- Consumes: None
- Produces: A Terraform module expecting `app_name`, `container_port`, `cpu`, `memory`, `vpc_connector_arn`, `env_variables`, and `secrets_map`.

- [ ] **Step 1: Create `variables.tf`**

```hcl
variable "app_name" {
  type = string
}
variable "aws_region" {
  type = string
}
variable "container_port" {
  type = number
}
variable "cpu" {
  type = string
}
variable "memory" {
  type = string
}
variable "vpc_connector_arn" {
  type = string
  default = null
}
variable "env_variables" {
  type = map(string)
  default = {}
}
variable "secrets_map" {
  type = map(string)
  default = {}
}
```

- [ ] **Step 2: Create `main.tf` (ECR, IAM, AppRunner)**

```hcl
resource "aws_ecr_repository" "repo" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-access-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "build.apprunner.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.app_name}-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "tasks.apprunner.amazonaws.com" } }]
  })
}

resource "aws_apprunner_service" "app" {
  service_name = var.app_name
  source_configuration {
    authentication_configuration { access_role_arn = aws_iam_role.apprunner_access_role.arn }
    image_repository {
      image_identifier      = "${aws_ecr_repository.repo.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = tostring(var.container_port)
        runtime_environment_variables = var.env_variables
        runtime_environment_secrets = var.secrets_map
      }
    }
  }
  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
    cpu               = var.cpu
    memory            = var.memory
  }
  dynamic "network_configuration" {
    for_each = var.vpc_connector_arn != null ? [1] : []
    content {
      egress_configuration {
        egress_type       = "VPC"
        vpc_connector_arn = var.vpc_connector_arn
      }
    }
  }
}
```

- [ ] **Step 3: Create `secrets.tf` (IAM logic for explicit secrets mapping)**

```hcl
data "aws_iam_policy_document" "secrets_access" {
  count = length(var.secrets_map) > 0 ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
    resources = values(var.secrets_map)
  }
}

resource "aws_iam_policy" "secrets_policy" {
  count  = length(var.secrets_map) > 0 ? 1 : 0
  name   = "${var.app_name}-secrets-policy"
  policy = data.aws_iam_policy_document.secrets_access[0].json
}

resource "aws_iam_role_policy_attachment" "secrets_attach" {
  count      = length(var.secrets_map) > 0 ? 1 : 0
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.secrets_policy[0].arn
}
```

- [ ] **Step 4: Create `outputs.tf`**

```hcl
output "service_url" {
  value = aws_apprunner_service.app.service_url
}
output "service_arn" {
  value = aws_apprunner_service.app.arn
}
output "ecr_repository_url" {
  value = aws_ecr_repository.repo.repository_url
}
```

- [ ] **Step 5: Run tests (Validation)**

```bash
cd infra/modules/apprunner_service
terraform init
terraform validate
cd ../../../
```

- [ ] **Step 6: Commit module**

```bash
git add infra/modules/apprunner_service/
git commit -m "feat(infra): create reusable apprunner_service module"
```

---

### Task 3: Centralized Production Environment Setup

**Files:**
- Create: `infra/environments/prod/main.tf`
- Create: `infra/environments/prod/variables.tf`
- Delete: Old standalone terraform directories.

**Interfaces:**
- Consumes: `apprunner_service` module.
- Produces: Centralized state execution root.

- [ ] **Step 1: Write `infra/environments/prod/main.tf` skeleton**

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

# Example instantiation for Lookout Agent
module "lookout_agent" {
  source         = "../../modules/apprunner_service"
  app_name       = "lookout-agent"
  aws_region     = var.aws_region
  container_port = 8000
  cpu            = "1024"
  memory         = "2048"
  
  env_variables = {
    CENTINELA_ENV            = "prod"
    CENTINELA_LOG_LEVEL      = "INFO"
    CENTINELA_CLUSTERING_URL = "http://clustering.centinela.internal:8000/analyze"
  }
  
  secrets_map = {
    CENTINELA_DEEPSEEK_API_KEY = "arn:aws:secretsmanager:${var.aws_region}:ACCOUNT_ID:secret:/centinela/prod/global/deepseek_api_key"
  }
}
```

- [ ] **Step 2: Create `infra/environments/prod/variables.tf`**

```hcl
variable "aws_region" {
  type    = string
  default = "us-east-2"
}
```

- [ ] **Step 3: Cleanup legacy Terraform directories**

```bash
rm -rf services/*/terraform
```

- [ ] **Step 4: Run validate**

```bash
cd infra/environments/prod
terraform init
terraform validate
cd ../../../
```

- [ ] **Step 5: Commit changes**

```bash
git add infra/environments/prod/ services/
git commit -m "refactor(infra): migrate services to centralized terraform environment"
```

---

### Task 4: Standardize Service Environment Configurations

**Files:**
- Modify: `services/lookout_agent/.env.example`
- Modify: `services/gateway/.env`
- Modify: `services/analyzer_agent/.env`

**Interfaces:**
- Consumes: None
- Produces: Clean configuration templates.

- [ ] **Step 1: Standardize `services/lookout_agent/.env.example`**

```bash
cat << 'EOF' > services/lookout_agent/.env.example
CENTINELA_ENV=dev
CENTINELA_LOG_LEVEL=INFO
CENTINELA_CLUSTERING_URL=http://clustering.centinela.internal:8000/analyze
CENTINELA_DEEPSEEK_API_KEY=your_api_key_here
EOF
```

- [ ] **Step 2: Standardize `services/analyzer_agent/.env.example`**

```bash
cat << 'EOF' > services/analyzer_agent/.env.example
CENTINELA_ENV=dev
CENTINELA_LOG_LEVEL=INFO
CENTINELA_MCP_SERVER_URL=http://postgres-mcp.centinela.internal:8006/sse
CENTINELA_KNOWLEDGE_SERVICE_URL=http://knowledge.centinela.internal:8007/api/v1/knowledge/search
CENTINELA_DEEPSEEK_API_KEY=your_api_key_here
EOF
```

- [ ] **Step 3: Standardize `services/gateway/.env.example`**

```bash
cat << 'EOF' > services/gateway/.env.example
CENTINELA_ENV=dev
CENTINELA_LOG_LEVEL=INFO
CENTINELA_ORCHESTRATOR_URL=http://orchestrator.centinela.internal:8004/orchestrate
CENTINELA_DATABASE_URL=postgresql://postgres@localhost:5432/postgres
EOF
```

- [ ] **Step 4: Commit standardized configs**

```bash
git add services/*/.env.example
git commit -m "chore(config): standardize environment variable schemas"
```

