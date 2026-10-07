variable "app_name" {
  type = string
}
variable "container_port" {
  type = number
}
variable "cpu" {
  type = string
}
variable "memory" {
  type = string
}
variable "vpc_connector_arn" {
  type    = string
  default = null
}
variable "env_variables" {
  type    = map(string)
  default = {}
}
variable "secrets_map" {
  type    = map(string)
  default = {}
}

