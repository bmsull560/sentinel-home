# Sentinel Home — Infrastructure as Code

This directory contains Terraform modules and Kubernetes manifests for deploying Sentinel Home to AWS.

## Structure

```
infrastructure/
├── terraform/
│   ├── modules/              # Reusable modules
│   │   ├── vpc/              # VPC, subnets, NAT gateways
│   │   ├── eks/              # EKS cluster and managed node groups
│   │   ├── rds/              # MySQL database with encryption/backups
│   │   └── iam/              # Least-privilege IRSA and CI/CD roles
│   └── environments/         # Per-environment root modules
│       ├── dev/
│       └── prod/
└── kubernetes/
    ├── base/                 # Shared Kustomize base
    └── overlays/
        ├── dev/
        └── prod/
```

## Terraform

### Modules

| Module | Purpose                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `vpc`  | Multi-AZ VPC with public and private subnets, NAT gateways, and subnet tagging for load balancer discovery.                  |
| `eks`  | Managed Kubernetes cluster with IRSA, IMDSv2, managed addons, and private endpoint access.                                   |
| `rds`  | MySQL database in private subnets with encryption, backups, multi-AZ in production, and Secrets Manager password management. |
| `iam`  | Least-privilege IAM roles for application pods (IRSA) and CI/CD.                                                             |

### Environments

Each environment is a standalone root module that consumes the reusable modules.

```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan
terraform apply
```

Production notes:

- Configure an S3 + DynamoDB remote backend.
- Restrict `cluster_public_access_cidrs` to known IPs.
- Use `ON_DEMAND` capacity and larger instance classes for reliability.

## Kubernetes

Manifests are organized as Kustomize bases and overlays.

### Base resources

| Resource              | Purpose                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `namespace.yaml`      | `sentinel-home` namespace with restricted Pod Security Standards.                   |
| `serviceaccount.yaml` | Service account annotated for IRSA.                                                 |
| `configmap.yaml`      | Non-sensitive environment variables.                                                |
| `deployment.yaml`     | Application deployment with non-root security context, probes, and resource limits. |
| `service.yaml`        | ClusterIP service.                                                                  |
| `hpa.yaml`            | Horizontal Pod Autoscaler with CPU and memory metrics.                              |
| `pdb.yaml`            | PodDisruptionBudget for zero-downtime disruptions.                                  |

### Security hardening

- Containers run as non-root (`runAsNonRoot: true`, UID/GID 1000).
- Root filesystem is read-only; writable `/tmp` is an `emptyDir` volume.
- All Linux capabilities are dropped.
- `seccompProfile` set to `RuntimeDefault`.
- Pod Security Standards enforced at the `restricted` level.
- Secrets are not committed; use `external-secret.yaml.example` with External Secrets Operator.

### Deploying

```bash
# Development
kubectl apply -k infrastructure/kubernetes/overlays/dev

# Production
kubectl apply -k infrastructure/kubernetes/overlays/prod
```

Update the IRSA annotation in `base/serviceaccount.yaml` with the ARN output by Terraform before applying.

## Validation

```bash
# Kubernetes manifest validation (requires kubectl with built-in kustomize)
kubectl kustomize infrastructure/kubernetes/overlays/dev >/dev/null
kubectl kustomize infrastructure/kubernetes/overlays/prod >/dev/null

# Terraform formatting and validation (requires Terraform)
cd infrastructure/terraform/environments/dev
terraform fmt -recursive
terraform validate
```

## Future work

- Add Terraform backend configuration examples for S3 + DynamoDB.
- Add AWS Load Balancer Controller and Ingress manifests.
- Add ECR repository module and CI/CD trust policies.
- Add PodMonitor/ServiceMonitor manifests for Prometheus Operator.
