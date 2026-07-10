# VPC module — creates a multi-AZ network with public and private subnets.
# Private subnets are used for EKS worker nodes and RDS; public subnets host NAT gateways.

locals {
  common_tags = merge(var.tags, {
    ManagedBy = "terraform"
    Project   = var.project_name
  })
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-${var.environment}"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "prod"
  one_nat_gateway_per_az = var.environment == "prod"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Tag subnets so that the AWS Load Balancer Controller and Karpenter can discover them.
  public_subnet_tags = {
    "kubernetes.io/role/elb"                      = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"             = "1"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}" = "shared"
  }

  tags = local.common_tags
}
