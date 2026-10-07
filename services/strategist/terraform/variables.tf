variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "strategist-api"
}

variable "database_url" {
  description = "Database URL for the application"
  type        = string
  default     = "postgresql://postgres@localhost:5432/postgres"
}

variable "knowledge_service_url" {
  description = "Knowledge Service URL"
  type        = string
  default     = "http://localhost:8001"
}

variable "deepseek_api_key" {
  description = "DeepSeek API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "log_level" {
  description = "Log level"
  type        = string
  default     = "INFO"
}
