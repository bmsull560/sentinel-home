# RDS module — creates a MySQL database in private subnets with encryption and backups.

locals {
  db_name     = replace("${var.project_name}_${var.environment}", "-", "_")
  common_tags = merge(var.tags, {
    ManagedBy = "terraform"
    Project   = var.project_name
  })
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = local.common_tags
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS MySQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MySQL from EKS worker nodes"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    description = "No outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = local.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%*&-_"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/${var.environment}/rds-password"
  description             = "RDS master password for ${local.db_name}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.project_name}-${var.environment}"

  engine         = "mysql"
  engine_version = var.mysql_version
  instance_class = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage

  db_name  = local.db_name
  username = "admin"
  port     = "3306"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Encryption and maintenance.
  storage_encrypted = true
  multi_az          = var.environment == "prod"

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Disable public access; use parameter group for sane defaults.
  publicly_accessible = false

  # Do not create a final snapshot in dev; keep them in prod.
  skip_final_snapshot = var.environment != "prod"

  deletion_protection = var.environment == "prod"

  tags = local.common_tags
}
