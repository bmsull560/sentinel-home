output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "db_endpoint" {
  value = module.rds.db_endpoint
}

output "app_irsa_role_arn" {
  value = module.iam.app_irsa_role_arn
}
