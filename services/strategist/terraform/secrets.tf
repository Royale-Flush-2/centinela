resource "aws_secretsmanager_secret" "app_db_url" {
  name                    = "${var.app_name}-db-url-secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app_db_url_value" {
  secret_id     = aws_secretsmanager_secret.app_db_url.id
  secret_string = "postgresql://${module.db.db_instance_username}:${random_password.db_password.result}@${module.db.db_instance_endpoint}/${module.db.db_instance_name}"
}
