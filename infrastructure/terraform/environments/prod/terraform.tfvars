# Production environment defaults.
# These values are intentionally conservative; review and adjust for actual load.

aws_region = "us-east-1"

node_desired_size = 3
node_min_size     = 2
node_max_size     = 10
node_instance_types = ["t3.medium", "t3.large"]

db_instance_class        = "db.t3.small"
db_allocated_storage     = 50
db_max_allocated_storage = 500

# Production should disable public cluster access or restrict to known IPs.
cluster_public_access_cidrs = []
