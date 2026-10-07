variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "centinela-gateway"
}

variable "database_url" {
  description = "Database URL for the application"
  type        = string
  sensitive   = true
  default     = ""
}

variable "deepseek_api_key" {
  description = "API Key for DeepSeek LLM"
  type        = string
  sensitive   = true
  default     = ""
}

variable "strategist_url" {
  description = "Strategist URL"
  type        = string
  default     = "https://bmnmbkeinq.us-east-2.awsapprunner.com/api/v1/strategist/analyze"
}

variable "mcp_server_url" {
  description = "MCP Server URL"
  type        = string
  default     = "https://jk3v3ufmrk.us-east-2.awsapprunner.com/sse"
}

variable "log_level" {
  description = "Log level"
  type        = string
  default     = "INFO"
}
