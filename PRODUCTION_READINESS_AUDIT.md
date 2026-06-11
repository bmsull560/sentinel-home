# Sentinel Home — Production Readiness Audit

**Audit date:** 2026-06-09  
**Target:** `sentinel-home` (commit on `main`)  
**Auditor:** Kimi Code CLI  
**Framework:** Industry best-practice readiness gates derived from Google SRE, AWS Well-Architected, Azure WAF, and Twelve-Factor App methodology.

---

## 1. Executive Summary

Sentinel Home is a full-stack, multi-tenant security dashboard built on Node.js 20+, React 19, Express, tRPC, and MySQL. The codebase demonstrates **above-average production discipline** for a project of this size: it has a unified verification script (`pnpm verify`), GitHub Actions CI, Docker packaging, secure cookie handling, Zod-based env validation, RBAC enforcement, and a documented set of known limitations. However, several gaps remain before the system can be considered **production-hardened** for a security-focused, multi-tenant SaaS.

| Category                     | Status     | Risk     |
| ---------------------------- | ---------- | -------- |
| Build & Release Engineering  | 🟡 Partial | Medium   |
| Code Quality & Testing       | 🟡 Partial | Medium   |
| Security & Compliance        | 🟡 Partial | **High** |
| Observability & Monitoring   | 🔴 Missing | **High** |
| Reliability & Resilience     | 🟡 Partial | Medium   |
| Scalability & Performance    | 🟡 Partial | Medium   |
| Operational Runbooks         | 🟡 Partial | Medium   |
| Data Integrity & Persistence | 🔴 Missing | **High** |
| Deployment & Infrastructure  | 🟡 Partial | Medium   |
| External Dependencies        | 🟡 Partial | Medium   |

**Overall verdict:** The application is _functionally_ deployable, but it does not yet meet the bar for a security-oriented production SaaS. The highest-priority fixes are: (1) add structured logging, metrics, and alerting; (2) commit and automate database migrations; (3) harden rate limiting and session management for multi-instance deployments; and (4) add an incident response / rollback runbook.

---

## 2. Readiness Gate Framework

The following gates are derived from industry standards (Google SRE, AWS Well-Architected Reliability & Security pillars, Azure WAF, Twelve-Factor App). Each gate is scored:

- **PASS** — Requirement is met with evidence.
- **PARTIAL** — Implementation exists but has gaps or documented limitations.
- **FAIL** — Requirement is not met or not implemented.
- **N/A** — Not applicable to this system.

---

## 3. Gate-by-Gate Assessment

### 3.1 Build & Release Engineering

| Gate                             | Standard                                      | Evidence                                             | Score |
| -------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ----- |
| Source control                   | All code in Git, trunk-based development      | `.git/`, `main` branch                               | PASS  |
| Package manager pinning          | Lockfile + `packageManager` field             | `pnpm-lock.yaml`, `packageManager: "pnpm@10.4.1..."` | PASS  |
| Engine constraints               | `engines.node` and `engines.pnpm` declared    | `package.json`                                       | PASS  |
| CI/CD pipeline                   | Automated build/test/deploy on PR/push        | `.github/workflows/ci.yml`                           | PASS  |
| Reproducible builds              | `pnpm install --frozen-lockfile` in CI/Docker | `ci.yml:41`, `Dockerfile:14,40`                      | PASS  |
| Artifact signing / SBOM          | Signed container images or dependency SBOMs   | Not present                                          | FAIL  |
| Automated deployment             | CD to staging/production                      | Not present                                          | FAIL  |
| Semantic versioning / changelogs | Versioned releases with change records        | `version: "1.0.0"`, no `CHANGELOG.md`                | FAIL  |

**Findings:**

- CI runs `pnpm verify`, which is an excellent single-command quality gate.
- Docker build is multi-stage and uses `node:20-slim`, but the production stage still installs via `pnpm` instead of copying a pre-built node_modules from the builder. This slightly reduces reproducibility and increases attack surface.
- There is no automated promotion pipeline (staging → prod), signed artifacts, or SBOM generation.

**Recommendations:**

1. Use `COPY --from=builder /app/node_modules ./node_modules` in the Dockerfile instead of running `pnpm install --prod` in the runner stage.
2. Add a GitHub Actions job to build and push the Docker image on merges to `main`.
3. Add `CHANGELOG.md` and tag releases with semantic versions.

---

### 3.2 Code Quality & Testing

| Gate                  | Standard                           | Evidence                                 | Score   |
| --------------------- | ---------------------------------- | ---------------------------------------- | ------- |
| Type safety           | Strict TypeScript                  | `tsconfig.json`, `strict: true` observed | PASS    |
| Linting               | ESLint configured and enforced     | `eslint.config.js` exists                | PASS    |
| Formatting            | Prettier configured and enforced   | `.prettierrc`, `pnpm format`             | PASS    |
| Unit tests            | Backend business logic unit-tested | `server/**/*.test.ts` (5 suites)         | PASS    |
| Frontend tests        | React component tests              | None                                     | FAIL    |
| Integration tests     | DB/API/integration tests           | None                                     | FAIL    |
| Test coverage targets | Enforced coverage threshold        | Not configured                           | FAIL    |
| Static analysis       | SAST or type-aware lint in CI      | `pnpm verify` runs types/lint/tests      | PARTIAL |

**Findings:**

- The backend has focused unit tests for auth gates, org access, scheduler behavior, dashboard queries, and logout. Tests use mocked DB/LLM/scheduler, so they are fast but do not exercise real integrations.
- `vitest.config.ts` only includes `server/**/*.test.ts`; there are no frontend tests.
- The project acknowledges this limitation in `LIMITATIONS.md` and classifies it as intentional.
- ESLint dependencies are noted as optional in `LIMITATIONS.md` (not installed by default), so `pnpm lint` may fail on a fresh clone.

**Recommendations:**

1. Add at least smoke-level frontend tests (e.g., `App.tsx` renders, navigation works) before claiming production readiness.
2. Add a minimal integration test that spins up a local MySQL/Testcontainers instance and exercises the tRPC caller against real DB state.
3. Configure Vitest coverage thresholds (e.g., 70% functions) and enforce them in CI.
4. Move ESLint peer dependencies into `devDependencies` so linting works out of the box.

---

### 3.3 Security & Compliance

| Gate                              | Standard                               | Evidence                                              | Score   |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------- | ------- |
| HTTPS in production               | TLS termination configured             | `secure` cookie flag tied to `isSecureRequest(req)`   | PASS    |
| Secure session cookies            | `httpOnly`, `secure`, `sameSite`, path | `server/_core/cookies.ts:43-47`                       | PASS    |
| Security headers                  | Helmet applied with CSP                | `server/_core/index.ts:45-68`                         | PASS    |
| Input validation                  | All inputs validated (Zod)             | `routers.ts`, `env.ts` use Zod                        | PASS    |
| Rate limiting                     | Per-IP limits on general + auth routes | `express-rate-limit` 200/15min general, 20/15min auth | PARTIAL |
| RBAC / authorization              | Org-scoped role checks                 | `requireOrgAccess()` in `routers.ts`                  | PASS    |
| Secrets management                | Secrets in env only, not committed     | `.env.example` has placeholders, no secrets in source | PASS    |
| Dependency vulnerability scanning | `pnpm audit` in CI                     | `scripts/verify.js:188-215`                           | PASS    |
| Penetration testing / SAST        | Automated security scanning            | Not present                                           | FAIL    |
| Audit logging                     | Security events logged centrally       | Console-only logs                                     | FAIL    |
| Session rotation / expiration     | Short-lived sessions with refresh      | `ONE_YEAR_MS` cookie lifetime (`shared/const.ts`)     | FAIL    |
| Content Security Policy           | Strict CSP                             | `'unsafe-inline'` allowed for scripts/styles          | PARTIAL |
| Multi-instance rate limiting      | Redis/shared store for limits          | In-memory only                                        | FAIL    |

**Findings:**

- Session cookies use `sameSite: "none"`, which is necessary for cross-domain OAuth flows but increases CSRF risk. The application relies on `httpOnly` + `secure` + OAuth state parameter for protection.
- Rate limiting is in-memory. Behind a load balancer with multiple instances, an attacker can distribute requests across instances and evade limits.
- Cookie lifetime is **one year** with no rotation or sliding expiration. A stolen cookie is usable for a year.
- CSP allows `'unsafe-inline'` scripts and styles, weakening XSS defense.
- No structured audit log for security events (logins, failed auth, role changes, API key creation).
- `DEV_BYPASS_AUTH` defaults to `"false"` and the README warns against production use, which is good.

**Recommendations:**

1. Reduce session cookie lifetime to 24 hours with a refresh mechanism, or implement explicit session IDs stored in DB with revocation support.
2. Replace in-memory rate limiter with a Redis-backed store (e.g., `rate-limit-redis`) or enforce rate limits at the reverse proxy/load balancer.
3. Tighten CSP by using Vite’s CSP nonce/hash support; at minimum add `script-src` hashes for any inline scripts.
4. Add a security audit log channel (separate from application logs) for auth events, org membership changes, and API key lifecycle.
5. Add automated SAST (e.g., Semgrep, CodeQL) to CI.

---

### 3.4 Observability & Monitoring

| Gate                | Standard                               | Evidence                  | Score   |
| ------------------- | -------------------------------------- | ------------------------- | ------- |
| Health endpoint     | Liveness/readiness probe               | `/api/trpc/system.health` | PARTIAL |
| Structured logging  | JSON logs with correlation IDs         | `console.log/error` only  | FAIL    |
| Application metrics | Latency/error/throughput metrics       | Not present               | FAIL    |
| Distributed tracing | Trace IDs across requests              | Not present               | FAIL    |
| Alerting rules      | PagerDuty/Slack alerts on SLO breaches | Not present               | FAIL    |
| Log aggregation     | Forwarded to centralized log store     | Not present               | FAIL    |
| Error tracking      | Sentry or equivalent integration       | Not present               | FAIL    |
| Dashboards          | Operational dashboards for SLOs        | Not present               | FAIL    |

**Findings:**

- There is a basic health query in `systemRouter.ts`, but it only returns `{ ok: true }` and does not verify database connectivity or scheduler state.
- The scheduler logs lifecycle events to stdout, which is helpful but not structured.
- The application uses `console.log/warn/error` throughout. There is no log level control, no request correlation IDs, and no redaction of sensitive fields.
- No metrics (Prometheus, StatsD, etc.), no tracing, and no error tracking service are integrated.
- Docker `HEALTHCHECK` calls the tRPC health endpoint, which is good, but it will not detect DB failures.

**Recommendations:**

1. Implement a real health check that validates DB connectivity and reports scheduler state; return appropriate HTTP status codes for readiness vs. liveness.
2. Replace `console.*` with a structured logger (e.g., Pino or Winston) emitting JSON with `trace_id`, `org_id`, `user_id`, and configurable log levels.
3. Add OpenTelemetry or at minimum Prometheus metrics for request count/latency/errors, DB pool saturation, ingestion run outcomes, and external API call latency.
4. Integrate an error tracker (Sentry) to capture unhandled exceptions and tRPC errors with context.
5. Define SLOs (e.g., 99.9% availability, p99 latency < 500ms) and create alerting rules.

---

### 3.5 Reliability & Resilience

| Gate                       | Standard                                                | Evidence                                                | Score   |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------- | ------- |
| Graceful shutdown          | SIGTERM/SIGINT handlers close HTTP server and scheduler | `server/_core/index.ts:135-150`, `scheduler.ts:190-197` | PASS    |
| Shutdown timeout           | Force-exit after bounded wait                           | 10s timeout in `index.ts:142-146`                       | PASS    |
| Error boundaries           | Unhandled errors do not crash the process               | `startServer().catch(...)` exits on fatal startup error | PARTIAL |
| Retry logic                | Retries with backoff for external calls                 | NVD client has rate-limit delays but no retries         | PARTIAL |
| Circuit breaker            | Fails fast when dependencies are unhealthy              | Not present                                             | FAIL    |
| Database reconnection      | Pool handles reconnections                              | `mysql2` pool with `enableKeepAlive`                    | PARTIAL |
| Dead letter / job queue    | Failed ingestion runs retried / recorded                | Recorded in `ingestion_runs`; no automatic retry        | PARTIAL |
| Backup & disaster recovery | Documented backup/restore procedures                    | Not documented                                          | FAIL    |

**Findings:**

- Graceful shutdown is well implemented: scheduler stops, HTTP server closes, and a 10s timeout prevents indefinite hanging.
- The NVD client respects rate limits but does not appear to implement exponential backoff retries on transient failures.
- The scheduler records errors in state and in `ingestion_runs`, but failed runs are not automatically retried.
- There is no circuit breaker for the OAuth provider, Forge API, or NVD API.
- DB reconnection is delegated to `mysql2` pooling; no explicit reconnect logic or health-aware backoff exists.
- No backup/restore runbook is present.

**Recommendations:**

1. Add idempotency-aware retry logic with exponential backoff for NVD, OAuth, and Forge API calls.
2. Add a simple circuit breaker or degraded-mode behavior for external dependencies (e.g., skip AI explanations if Forge API is down).
3. Implement automatic retry for failed ingestion runs, capped to 3 attempts with exponential backoff.
4. Document backup/restore procedures for MySQL and include RPO/RTO targets.

---

### 3.6 Scalability & Performance

| Gate                       | Standard                        | Evidence                                                  | Score   |
| -------------------------- | ------------------------------- | --------------------------------------------------------- | ------- |
| Connection pooling         | DB connections pooled           | `createPool({ connectionLimit: 10 })`                     | PASS    |
| Pool sizing configurable   | Pool size via env var           | Hard-coded to 10                                          | FAIL    |
| Query optimization         | Indexes, pagination, avoid N+1  | Pagination not consistently used; some N+1 patterns       | PARTIAL |
| Caching strategy           | Redis/memory cache for hot data | Not present                                               | FAIL    |
| CDN / static asset serving | Static files served efficiently | Vite build + Express static in production                 | PASS    |
| Horizontal scaling         | Stateless app, shared-nothing   | Mostly stateless, but in-memory rate limits and scheduler | PARTIAL |
| Load testing               | Documented load test results    | Not present                                               | FAIL    |

**Findings:**

- The DB pool size is hard-coded to 10 and noted as a non-blocking limitation in `LIMITATIONS.md`.
- Several DB functions use N+1 queries (e.g., `getUserOrgs` fetches orgs one by one via `Promise.all`).
- `intelligence.searchCves` uses `LIKE` on description/CVE ID without full-text indexes.
- No caching layer (Redis, etc.) is integrated.
- The cron scheduler is in-process. Running multiple instances will cause duplicate ingestion unless moved to a leader-elected job runner or external scheduler.
- Rate limiting is in-memory, which breaks horizontal scaling.

**Recommendations:**

1. Make `connectionLimit` configurable via env var with a sensible default.
2. Add pagination to list endpoints and refactor N+1 queries to use joins or batched selects.
3. Add a full-text index on `nvd_cve_cache.description` or introduce a dedicated search service.
4. Evaluate Redis for caching, sessions, rate limiting, and distributed job locking before scaling beyond one instance.
5. Document horizontal-scaling constraints in `LIMITATIONS.md` and plan to externalize the scheduler (e.g., AWS EventBridge + Lambda, or a leader-election lock).

---

### 3.7 Operational Runbooks

| Gate                      | Standard                              | Evidence                     | Score |
| ------------------------- | ------------------------------------- | ---------------------------- | ----- |
| README / onboarding       | Clear setup instructions              | `README.md` is thorough      | PASS  |
| Environment documentation | All env vars documented with examples | `.env.example`, README table | PASS  |
| Known limitations doc     | Non-blocking gaps documented          | `LIMITATIONS.md`             | PASS  |
| Incident response runbook | Steps for common outages              | Not present                  | FAIL  |
| Rollback procedure        | How to rollback a bad deploy          | Not present                  | FAIL  |
| Escalation policy         | On-call rotation / contacts           | Not present                  | FAIL  |
| Dependency status page    | Third-party status monitoring         | Not present                  | FAIL  |
| Secrets rotation guide    | How to rotate DB/OAuth/JWT secrets    | Not present                  | FAIL  |

**Findings:**

- Documentation is strong for a project of this size. `README.md`, `AGENTS.md`, and `LIMITATIONS.md` provide good context.
- There is no incident response, rollback, or secrets-rotation runbook.

**Recommendations:**

1. Create `RUNBOOKS.md` with:
   - How to respond to a production outage (checklist).
   - How to rollback a bad Docker image deploy.
   - How to rotate `JWT_SECRET`, `DATABASE_URL`, and API keys.
   - Who to contact / escalation path.
2. Add links to dependency status pages (NVD, OAuth provider, Forge API).

---

### 3.8 Data Integrity & Persistence

| Gate                         | Standard                             | Evidence                                       | Score    |
| ---------------------------- | ------------------------------------ | ---------------------------------------------- | -------- |
| Schema defined in code       | ORM/schema-as-code                   | `drizzle/schema.ts`                            | PASS     |
| Migration tool configured    | Drizzle Kit configured               | `drizzle.config.ts`                            | PASS     |
| Migrations committed         | SQL migrations in version control    | `drizzle/migrations/` only contains `.gitkeep` | **FAIL** |
| Migrations run automatically | Migrations applied on deploy startup | Not present                                    | FAIL     |
| Migration rollback tested    | Down-migrations or rollback scripts  | Not present                                    | FAIL     |
| Database backups             | Automated backups configured         | Not documented                                 | FAIL     |
| Data retention policy        | Defined retention for logs/events    | Not documented                                 | FAIL     |
| Transaction safety           | Critical operations in transactions  | Not consistently used                          | PARTIAL  |

**Findings:**

- This is a **critical gap**. The repository uses `drizzle-kit generate && drizzle-kit migrate` via `pnpm db:push`, but the generated migration files are not committed (`drizzle/migrations/.gitkeep` is the only file). A fresh clone cannot reproduce the database schema history.
- There is no automatic migration step in the Docker entrypoint or startup sequence.
- No transaction wrappers are visible in the DAL functions; multi-step operations (e.g., create org + add member) are not atomic.
- No backup/retention policy is documented.

**Recommendations:**

1. **Immediately** run `pnpm db:push` and commit the generated migration files to `drizzle/migrations/`.
2. Add an idempotent migration step to the Docker entrypoint (e.g., `node scripts/migrate.js && pnpm start`) or run migrations as a Kubernetes init container / GitHub Action.
3. Wrap multi-step domain operations in database transactions.
4. Configure automated database backups (managed DB snapshots + logical dumps) and document RPO/RTO.
5. Define a data retention policy for `ingestion_runs`, `agent_runs`, and audit logs.

---

### 3.9 Deployment & Infrastructure

| Gate                          | Standard                            | Evidence                                             | Score   |
| ----------------------------- | ----------------------------------- | ---------------------------------------------------- | ------- |
| Containerization              | Dockerfile present and builds       | `Dockerfile` multi-stage                             | PASS    |
| Health check in container     | Docker `HEALTHCHECK`                | `Dockerfile:44-45`                                   | PASS    |
| Non-root execution            | Container runs as non-root          | `node:20-slim` defaults to root; no `USER` directive | FAIL    |
| CI builds container image     | Image built in CI                   | Not present                                          | FAIL    |
| Infrastructure as Code        | Terraform/CDK/CloudFormation        | Not present                                          | FAIL    |
| Environment separation        | `development`/`production` NODE_ENV | `ENV.isProduction` checks                            | PARTIAL |
| Secrets injection at runtime  | Env vars, not baked into image      | Dockerfile does not bake secrets                     | PASS    |
| Reverse proxy / load balancer | Documented target architecture      | Not documented                                       | FAIL    |

**Findings:**

- Dockerfile is reasonable but could be hardened:
  - Uses `node:20-slim` (good) but does not drop to a non-root user.
  - Installs pnpm in the production stage, increasing image size and attack surface.
  - No `.dockerignore` shown in the file list; verify it excludes `.env`, `.git`, `node_modules`, etc.
- No IaC or orchestration manifests (Kubernetes, Docker Compose for production, Terraform).
- No image build/push in CI.

**Recommendations:**

1. Add `USER node` (or a dedicated user) in the Dockerfile runner stage.
2. Copy `node_modules` from the builder stage instead of re-running `pnpm install --prod`.
3. Add a `.github/workflows/docker-publish.yml` to build, tag, and push images to a registry.
4. Create a `docker-compose.prod.yml` or minimal Kubernetes manifest for production deployment.
5. Add a Terraform/CDK module for managed DB, secrets manager, and container hosting.

---

### 3.10 External Dependencies

| Gate                         | Standard                                 | Evidence                                                    | Score   |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ------- |
| Dependency inventory         | All deps in `package.json` with versions | Present                                                     | PASS    |
| Lockfile committed           | `pnpm-lock.yaml` in source control       | Present                                                     | PASS    |
| Vulnerability scanning       | `pnpm audit` in CI                       | `scripts/verify.js`                                         | PASS    |
| Dependency update policy     | Renovate/Dependabot configured           | Not present                                                 | FAIL    |
| External API timeout         | Timeouts configured                      | `AXIOS_TIMEOUT_MS` in `shared/const.ts`                     | PARTIAL |
| External API retries         | Retries/backoff for transient failures   | Not present                                                 | FAIL    |
| External API fallbacks       | Degraded behavior when deps fail         | Optional features degrade (Supabase in ValueEngine pattern) | PARTIAL |
| Third-party status awareness | Health checks reflect dependency state   | Health endpoint does not check OAuth/Forge/NVD              | FAIL    |

**Findings:**

- Dependencies are pinned and audited.
- No automated dependency update tool (Dependabot/Renovate) is configured.
- OAuth SDK uses a timeout but no retry logic.
- Health endpoint does not probe external dependencies; a deployment could be "healthy" even if OAuth or the DB is unreachable.

**Recommendations:**

1. Enable Dependabot or Renovate for automated security updates.
2. Add retries with backoff for OAuth, Forge API, and NVD API calls.
3. Extend the health endpoint to include shallow dependency checks (DB query, optional Forge API config presence) without making the health check itself a dependency failure vector.

---

## 4. Risk Matrix

| #   | Risk                                                                   | Severity | Likelihood | Owner    | Mitigation Priority |
| --- | ---------------------------------------------------------------------- | -------- | ---------- | -------- | ------------------- |
| 1   | Database migrations are not committed; schema history is unrecoverable | **High** | High       | Platform | P0                  |
| 2   | No structured logging, metrics, or alerting; fly-blind operations      | **High** | High       | SRE      | P0                  |
| 3   | One-year session cookie lifetime with no rotation/revocation           | **High** | Medium     | Security | P0                  |
| 4   | In-memory rate limiting breaks horizontal scaling and is evadable      | Medium   | Medium     | Security | P1                  |
| 5   | No backup/restore or disaster recovery runbook                         | Medium   | Medium     | SRE      | P1                  |
| 6   | No integration tests against real DB / external APIs                   | Medium   | Medium     | QA       | P1                  |
| 7   | In-process scheduler prevents safe horizontal scaling                  | Medium   | Low        | Platform | P2                  |
| 8   | N+1 queries and missing full-text index on CVE search                  | Medium   | Medium     | Backend  | P2                  |
| 9   | CSP allows `'unsafe-inline'` scripts                                   | Medium   | Low        | Security | P2                  |
| 10  | No container image build/push in CI                                    | Low      | Low        | Platform | P3                  |

---

## 5. Remediation Action Plan

### Immediate (P0) — Before first production customer

1. **Commit database migrations.** Run `pnpm db:push` in a clean environment and commit the generated SQL files under `drizzle/migrations/`.
2. **Add a startup migration step.** Ensure the container runs migrations before starting the server (idempotent, safe to rerun).
3. **Harden sessions.** Reduce cookie lifetime from 1 year to 24h and implement session refresh, or store session records in DB with explicit revocation.
4. **Add structured logging.** Replace `console.*` with Pino/Winston JSON logging, include trace IDs, and redact sensitive fields.
5. **Add real health checks.** Verify DB connectivity and report dependency status in the health endpoint.

### Short-term (P1) — Within 2 weeks of launch

6. **Add operational runbooks** for incident response, rollback, and secrets rotation.
7. **Configure backups.** Use managed DB automated backups + periodic logical dumps; document restore procedure.
8. **Add integration tests** against a real MySQL instance (e.g., Testcontainers or a CI service container).
9. **Move rate limiting to Redis** or enforce at the reverse proxy to support horizontal scaling.
10. **Enable Dependabot** for security updates.

### Medium-term (P2) — Within 4–6 weeks

11. **Externalize the scheduler** or add distributed locking so multiple instances do not duplicate ingestion work.
12. **Add OpenTelemetry / Prometheus metrics** and define SLO dashboards.
13. **Tighten CSP** with nonces or hashes.
14. **Optimize DB queries:** add pagination, replace N+1 selects with joins, and add a full-text index for CVE search.
15. **Add retry/circuit-breaker logic** for external APIs.

### Long-term (P3) — Roadmap

16. **Add SAST/CodeQL** to CI.
17. **Build and push container images** automatically from CI.
18. **Introduce Infrastructure as Code** (Terraform / Pulumi) for production environments.
19. **Add a security audit log** for auth, membership, and API-key events.
20. **Conduct a penetration test** before processing production customer data.

---

## 6. Sign-Off Checklist

Use this checklist to track remediation. The project should not be promoted to production until all P0 items are complete and all P1 items have assigned owners and target dates.

- [ ] P0: Database migrations committed and auto-applied on startup
- [ ] P0: Structured logging with trace IDs
- [ ] P0: Health endpoint checks DB and dependencies
- [ ] P0: Session lifetime reduced + rotation/revocation implemented
- [ ] P1: Incident response / rollback / secrets-rotation runbooks written
- [ ] P1: Database backups configured and restore tested
- [ ] P1: Integration tests in CI
- [ ] P1: Redis-backed or proxy-level rate limiting
- [ ] P1: Automated dependency updates enabled
- [ ] P2: Scheduler externalized or leader-elected
- [ ] P2: Metrics and SLO dashboards
- [ ] P2: CSP hardened
- [ ] P2: DB query optimization completed
- [ ] P2: External API retries + circuit breakers
- [ ] P3: SAST in CI
- [ ] P3: Container image CI/CD
- [ ] P3: Infrastructure as Code
- [ ] P3: Security audit log
- [ ] P3: Penetration test completed

---

## 7. Conclusion

Sentinel Home has a solid foundation: a well-documented codebase, good use of TypeScript, Zod validation, secure cookie defaults, RBAC, and an all-in-one verification script. The current state is appropriate for an internal beta or a single-tenant deployment with forgiving SLOs.

For a security-focused, multi-tenant production SaaS, the project needs investment in **observability**, **data integrity (migrations)**, **session hardening**, and **operational runbooks** before taking on customer data. The remediation plan above prioritizes the highest-risk gaps and provides a clear path to production readiness.
