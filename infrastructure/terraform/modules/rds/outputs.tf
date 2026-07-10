output "db_endpoint" {
  description = "RDS MySQL endpoint"
  value       = module.rds.db_instance_endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = module.rds.db_instance_name
}

output "db_username" {
  description = "Master username"
  value       = module.rds.db_instance_username
}

output "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the master password"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "db_security_group_id" {
  description = "Security group ID of the RDS instance"
  value       = aws_security_group.rds.id
}
