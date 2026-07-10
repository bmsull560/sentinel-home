# IAM module — creates least-privilege IAM roles for Kubernetes service accounts (IRSA).

locals {
  common_tags = merge(var.tags, {
    ManagedBy = "terraform"
    Project   = var.project_name
  })
}

# Role allowing the application to read secrets from AWS Secrets Manager.
# Used by External Secrets Operator or the application init container to fetch DATABASE_URL.
data "aws_iam_policy_document" "app_secret_access" {
  statement {
    sid    = "AllowReadAppSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = var.secret_arns
  }
}

resource "aws_iam_policy" "app_secret_access" {
  name_prefix = "${var.project_name}-${var.environment}-app-secrets-"
  description = "Allows the app to read required secrets from Secrets Manager"
  policy      = data.aws_iam_policy_document.app_secret_access.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "app_irsa_trust" {
  statement {
    effect = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    actions = ["sts:AssumeRoleWithWebIdentity"]
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_issuer_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.namespace}:${var.service_account_name}"]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.oidc_issuer_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app_irsa" {
  name               = "${var.project_name}-${var.environment}-app-irsa"
  assume_role_policy = data.aws_iam_policy_document.app_irsa_trust.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "app_secret_access" {
  role       = aws_iam_role.app_irsa.name
  policy_arn = aws_iam_policy.app_secret_access.arn
}

# Role for CI/CD to push container images to ECR.
data "aws_iam_policy_document" "cicd_ecr" {
  statement {
    sid    = "AllowECRPushPull"
    effect = "Allow"
    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload"
    ]
    resources = var.ecr_repository_arns
  }
}

resource "aws_iam_policy" "cicd_ecr" {
  count       = var.create_cicd_role ? 1 : 0
  name_prefix = "${var.project_name}-${var.environment}-cicd-ecr-"
  description = "Allows CI/CD to push/pull ECR images"
  policy      = data.aws_iam_policy_document.cicd_ecr.json

  tags = local.common_tags
}

resource "aws_iam_role" "cicd" {
  count              = var.create_cicd_role ? 1 : 0
  name               = "${var.project_name}-${var.environment}-cicd"
  assume_role_policy = var.cicd_trust_policy

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "cicd_ecr" {
  count      = var.create_cicd_role ? 1 : 0
  role       = aws_iam_role.cicd[0].name
  policy_arn = aws_iam_policy.cicd_ecr[0].arn
}
