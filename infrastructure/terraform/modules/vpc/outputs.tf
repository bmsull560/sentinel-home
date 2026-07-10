output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

output "intra_subnet_ids" {
  description = "IDs of the intra subnets (if created)"
  value       = module.vpc.intra_subnets
}

output "azs" {
  description = "Availability zones used"
  value       = module.vpc.azs
}
