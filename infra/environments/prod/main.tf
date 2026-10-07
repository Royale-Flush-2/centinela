terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# Example instantiation for Lookout Agent
module "lookout_agent" {
  source         = "../../modules/apprunner_service"
  app_name       = "lookout-agent"
  container_port = 8000
  cpu            = "1024"
  memory         = "2048"
  
  env_variables = {
    CENTINELA_ENV            = "prod"
    CENTINELA_LOG_LEVEL      = "INFO"
    CENTINELA_CLUSTERING_URL = "http://clustering.centinela.internal:8000/analyze"
  }
  
  secrets_map = {
    CENTINELA_DEEPSEEK_API_KEY = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:/centinela/prod/global/deepseek_api_key"
  }
}

