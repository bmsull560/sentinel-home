variable "project_name" {
  description = "Name of the project, used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
}

variable "oidc_issuer_url" {
  description = "URL of the EKS OIDC issuer"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "sentinel-home"
}

variable "service_account_name" {
  description = "Kubernetes service account name for the application"
  type        = string
  default     = "sentinel-home"
}

variable "secret_arns" {
  description = "ARNs of Secrets Manager secrets the app may read"
  type        = list(string)
}

variable "ecr_repository_arns" {
  description = "ARNs of ECR repositories CI/CD may access"
  type        = list(string)
  default     = []
}

variable "create_cicd_role" {
  description = "Whether to create a CI/CD IAM role"
  type        = bool
  default     = true
}

variable "cicd_trust_policy" {
  description = "Trust policy JSON for the CI/CD role"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
