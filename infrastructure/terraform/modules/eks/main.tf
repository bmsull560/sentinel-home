# EKS module — creates a managed Kubernetes cluster with least-privilege IAM.
# Worker nodes run in private subnets and use IRSA for AWS API access.

locals {
  cluster_name = "${var.project_name}-${var.environment}"
  common_tags  = merge(var.tags, {
    ManagedBy = "terraform"
    Project   = var.project_name
  })
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.cluster_name
  cluster_version = var.kubernetes_version

  cluster_endpoint_public_access  = var.cluster_public_access
  cluster_endpoint_private_access = true

  vpc_id                    = var.vpc_id
  subnet_ids                = var.private_subnet_ids
  control_plane_subnet_ids  = var.private_subnet_ids

  # EKS managed node groups for general workloads.
  eks_managed_node_groups = {
    general = {
      desired_size = var.node_desired_size
      min_size     = var.node_min_size
      max_size     = var.node_max_size

      instance_types = var.node_instance_types
      capacity_type  = var.environment == "prod" ? "ON_DEMAND" : "SPOT"

      # Force IMDSv2 for metadata security.
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 1
      }

      labels = {
        workload = "general"
      }

      tags = local.common_tags
    }
  }

  # Enable IRSA so workloads can assume AWS roles with least privilege.
  enable_irsa = true

  # Managed addons.
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Restrict public access to known CIDRs when enabled.
  cluster_endpoint_public_access_cidrs = var.cluster_public_access_cidrs

  tags = local.common_tags
}

# OIDC provider for IRSA.
data "tls_certificate" "eks" {
  url = module.eks.cluster_oidc_issuer_url
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = module.eks.cluster_oidc_issuer_url
}
