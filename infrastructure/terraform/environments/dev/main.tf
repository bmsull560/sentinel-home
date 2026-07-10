terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Configure remote backend separately (e.g. S3 + DynamoDB).
  backend "local" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"

  project_name   = var.project_name
  environment    = var.environment
  vpc_cidr       = var.vpc_cidr
  az_count       = var.az_count
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
}

module "eks" {
  source = "../../modules/eks"

  project_name        = var.project_name
  environment         = var.environment
  kubernetes_version  = var.kubernetes_version
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  node_desired_size   = var.node_desired_size
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size
  node_instance_types = var.node_instance_types

  cluster_public_access       = true
  cluster_public_access_cidrs = var.cluster_public_access_cidrs
}

module "rds" {
  source = "../../modules/rds"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.eks.eks_managed_node_groups["general"].security_group_id]

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  backup_retention_period = var.db_backup_retention_period
}

module "iam" {
  source = "../../modules/iam"

  project_name         = var.project_name
  environment          = var.environment
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_issuer_url      = module.eks.cluster_oidc_issuer_url
  namespace            = var.namespace
  service_account_name = var.service_account_name
  secret_arns          = [module.rds.db_password_secret_arn]

  create_cicd_role = false
}
