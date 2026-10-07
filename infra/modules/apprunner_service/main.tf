resource "aws_ecr_repository" "repo" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.app_name}-access-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
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
    Version   = "2012-10-17"
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
        port                          = tostring(var.container_port)
        runtime_environment_variables = var.env_variables
        runtime_environment_secrets   = var.secrets_map
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

