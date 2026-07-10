# Development environment defaults.
# Override values via CLI or CI/CD variables as needed.

aws_region = "us-east-1"

node_desired_size = 1
node_min_size     = 1
node_max_size     = 3
node_instance_types = ["t3.small"]

db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 50

# Restrict public cluster access in real accounts.
# cluster_public_access_cidrs = ["YOUR_OFFICE_IP/32"]
