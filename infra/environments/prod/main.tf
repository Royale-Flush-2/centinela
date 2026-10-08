terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.5" }
  }
}

provider "aws" { region = var.aws_region }
data "aws_caller_identity" "current" {}

data "aws_vpc" "default" { default = true }
data "aws_subnets" "default" { filter { name = "vpc-id" values = [data.aws_vpc.default.id] } }

resource "random_password" "db_password" { length = 16; special = false }

resource "aws_db_subnet_group" "default" {
  name       = "centinela-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "db_sg" {
  name   = "centinela-db-sg"
  vpc_id = data.aws_vpc.default.id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  egress  { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier      = "centinela-db-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.3"
  database_name           = "centinela"
  master_username         = "postgres"
  master_password         = random_password.db_password.result
  db_subnet_group_name    = aws_db_subnet_group.default.name
  vpc_security_group_ids  = [aws_security_group.db_sg.id]
  skip_final_snapshot     = true
  serverlessv2_scaling_configuration { min_capacity = 0.5; max_capacity = 1.0 }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version
}

resource "aws_secretsmanager_secret" "db_url" {
  name = "/centinela/prod/global/database_url"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${aws_rds_cluster.aurora.master_username}:${random_password.db_password.result}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${aws_rds_cluster.aurora.database_name}"
}

locals {
  services = [
    "knowledge-service", "orchestrator", "lookout-agent", 
    "analyzer-agent", "clustering-service", "postgres-mcp", 
    "strategist", "chat-model", "gateway"
  ]
}

module "apprunner_services" {
  for_each       = toset(local.services)
  source         = "../../modules/apprunner_service"
  app_name       = each.key
  container_port = 8000
  cpu            = "1024"
  memory         = "2048"
  
  env_variables = {
    CENTINELA_ENV                   = "prod"
    CENTINELA_LOG_LEVEL             = "INFO"
    CENTINELA_KNOWLEDGE_SERVICE_URL = var.knowledge_service_url
    CENTINELA_ORCHESTRATOR_URL      = var.orchestrator_url
    CENTINELA_VIGIA_URL             = var.vigia_url
    CENTINELA_ANALYZER_URL          = var.analyzer_url
    CENTINELA_CLUSTERING_URL        = var.clustering_url
    CENTINELA_MCP_SERVER_URL        = var.mcp_server_url
    CENTINELA_STRATEGIST_URL        = var.strategist_url
    CENTINELA_EMBEDDING_MODEL       = var.embedding_model
  }
  
  secrets_map = {
    CENTINELA_DATABASE_URL     = aws_secretsmanager_secret.db_url.arn
    CENTINELA_DEEPSEEK_API_KEY = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:/centinela/prod/global/deepseek_api_key"
  }
}
