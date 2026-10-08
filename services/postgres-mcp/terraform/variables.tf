variable "aws_region" { default = "us-east-2" }
variable "app_name" { default = "postgres-mcp" }
variable "database_url" { default = "" }
variable "statement_timeout" { default = "5000" }
variable "log_level" { default = "INFO" }

variable "image_tag" {
  description = "The tag of the Docker image to deploy"
  type        = string
}
