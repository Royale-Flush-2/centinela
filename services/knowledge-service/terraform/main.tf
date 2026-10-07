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

resource "aws_ecr_repository" "app_repo" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete = true
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-apprunner-access-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "build.apprunner.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.app_name}-apprunner-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "tasks.apprunner.amazonaws.com" } }]
  })
}

resource "time_sleep" "wait_for_iam" {
  depends_on = [aws_iam_role_policy_attachment.apprunner_ecr_access]
  create_duration = "15s"
}

resource "aws_apprunner_service" "app_service" {
  service_name = var.app_name

  source_configuration {
    auto_deployments_enabled = true
    authentication_configuration { access_role_arn = aws_iam_role.apprunner_access_role.arn }
    image_repository {
      image_identifier      = "${aws_ecr_repository.app_repo.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "8000"
        runtime_environment_variables = {
          CENTINELA_DATABASE_URL    = var.database_url
          CENTINELA_EMBEDDING_MODEL = var.embedding_model
          CENTINELA_LOG_LEVEL       = var.log_level
          PORT                      = "8000"
        }
      }
    }
  }
  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
    cpu               = "1024"
    memory            = "2048"
  }
  depends_on = [time_sleep.wait_for_iam]
}
