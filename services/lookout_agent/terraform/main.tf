terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

resource "aws_ecr_repository" "repo" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-access-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "build.apprunner.amazonaws.com" } }
    ]
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
    Statement = [
      { Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "tasks.apprunner.amazonaws.com" } }
    ]
  })
}

resource "aws_secretsmanager_secret" "deepseek_api_key" {
  count                   = 1
  name                    = "${var.app_name}-api-key"
  recovery_window_in_days = 0
}
resource "aws_secretsmanager_secret_version" "deepseek_api_key" {
  count         = 1
  secret_id     = aws_secretsmanager_secret.deepseek_api_key[0].id
  secret_string = var.deepseek_api_key
}


resource "aws_iam_policy" "apprunner_secrets" {
  name        = "${var.app_name}-secrets"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt"
        ]
        Effect   = "Allow"
        Resource = [aws_secretsmanager_secret.deepseek_api_key[0].arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_secrets_attach" {
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.apprunner_secrets.arn
}

resource "aws_apprunner_service" "app" {
  service_name = var.app_name

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.repo.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "8000"
        runtime_environment_variables = {
PORT = "8000"
          CLUSTERING_URL = "https://5urpykmh6a.us-east-2.awsapprunner.com/analyze"
        }
        runtime_environment_secrets = {
          CENTINELA_DEEPSEEK_API_KEY = aws_secretsmanager_secret.deepseek_api_key[0].arn
        }

      }
    }
  }
  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
    cpu               = "1024"
    memory            = "2048"
  }
  depends_on = ["aws_iam_role_policy_attachment.apprunner_ecr", aws_iam_role_policy_attachment.apprunner_secrets_attach]
}
