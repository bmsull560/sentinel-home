variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "sentinel-home"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"
}

variable "az_count" {
  description = "Number of AZs"
  type        = number
  default     = 3
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "node_desired_size" {
  description = "Desired worker node count"
  type        = number
  default     = 3
}

variable "node_min_size" {
  description = "Minimum worker node count"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum worker node count"
  type        = number
  default     = 10
}

variable "node_instance_types" {
  description = "Worker node instance types"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "cluster_public_access_cidrs" {
  description = "CIDRs allowed to access the public cluster endpoint"
  type        = list(string)
  default     = []
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "RDS initial storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "RDS max storage in GB"
  type        = number
  default     = 500
}

variable "db_backup_retention_period" {
  description = "RDS backup retention in days"
  type        = number
  default     = 30
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "sentinel-home"
}

variable "service_account_name" {
  description = "Kubernetes service account name"
  type        = string
  default     = "sentinel-home"
}
