output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.app_repo.repository_url
}

output "app_runner_service_url" {
  description = "The URL of the App Runner service"
  value       = "https://${aws_apprunner_service.app_service.service_url}"
}

