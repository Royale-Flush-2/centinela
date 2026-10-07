terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # The backend configuration is passed dynamically via GitHub Actions
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

# ECR Repository to store the Docker image
resource "aws_ecr_repository" "app_repo" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# IAM Role for App Runner to access ECR
resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-apprunner-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM Role for App Runner Instance (to access other AWS resources if needed)
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.app_name}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "apprunner_secrets" {
  name        = "${var.app_name}-secrets-policy"
  description = "Allow App Runner to read Secrets Manager"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ]
        Effect   = "Allow"
        Resource = [aws_secretsmanager_secret.app_db_url.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_secrets_attach" {
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.apprunner_secrets.arn
}

# AWS App Runner Service
resource "aws_apprunner_service" "app_service" {
  service_name = var.app_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.app_repo.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8000"
        
        runtime_environment_variables = {
          CENTINELA_KNOWLEDGE_SERVICE_URL = var.knowledge_service_url
          CENTINELA_LOG_LEVEL             = var.log_level
          PORT                            = "8000"
          CENTINELA_DEEPSEEK_API_KEY      = var.deepseek_api_key
        }
        
        runtime_environment_secrets = {
          CENTINELA_DATABASE_URL = aws_secretsmanager_secret.app_db_url.arn
        }
      }
    }
  }

  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
    cpu               = "1024" # 1 vCPU
    memory            = "2048" # 2 GB
  }
  
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.connector.arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr_access,
    aws_iam_role_policy_attachment.apprunner_secrets_attach
  ]
}
