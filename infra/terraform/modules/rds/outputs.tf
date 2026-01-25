output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "connection_string" {
  value     = "postgresql://${var.master_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.database_name}"
  sensitive = true
}

output "identifier" {
  value = aws_db_instance.main.identifier
}

output "password_ssm_arn" {
  value = aws_ssm_parameter.db_password.arn
}
