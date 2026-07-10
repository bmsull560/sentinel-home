output "app_irsa_role_arn" {
  description = "ARN of the application IRSA role"
  value       = aws_iam_role.app_irsa.arn
}

output "app_irsa_role_name" {
  description = "Name of the application IRSA role"
  value       = aws_iam_role.app_irsa.name
}

output "cicd_role_arn" {
  description = "ARN of the CI/CD role (if created)"
  value       = var.create_cicd_role ? aws_iam_role.cicd[0].arn : ""
}
