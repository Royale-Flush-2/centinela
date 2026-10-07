output "service_url" {
  value = aws_apprunner_service.app.service_url
}
output "service_arn" {
  value = aws_apprunner_service.app.arn
}
output "ecr_repository_url" {
  value = aws_ecr_repository.repo.repository_url
}

