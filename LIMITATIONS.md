# Known Limitations (Non-Blocking)

This document lists known behaviors and gaps that are **intentional and non-blocking** for production use. Every item includes the rationale and whether it is on the roadmap.

## 1. External Service Dependencies

### OAuth Provider

- **What:** Sign-in requires an external OAuth 2.0 provider (configured via `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `VITE_APP_ID`).
- **Impact:** Local development can use `DEV_BYPASS_AUTH=true` to skip OAuth entirely. Without it, sign-in flows fail.
- **Status:** By design. The app is built for a specific OAuth portal.

### Forge API (LLM)

- **What:** AI explanations and agent runs require `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`.
- **Impact:** Without these, the `vulnerabilities.explain` and `agentRuns.trigger` endpoints throw errors.
- **Status:** By design. Optional integration.

### NVD API Key

- **What:** CVE ingestion works without an NVD API key, but rate limits are lower (6.5s delay between pages).
- **Impact:** Slower ingestion for large datasets.
- **Status:** By design. Optional optimization.

## 2. Testing Strategy

### Unit Tests Only

- **What:** The test suite uses mocked DB and external services. There are no integration tests against a real MySQL instance, NVD API, or OAuth provider.
- **Impact:** Network failures, rate limits, or DB schema edge cases may not be caught in CI.
- **Mitigation:** All business logic is unit-tested; the intelligence pipeline scheduler and matching engine have dedicated test coverage.
- **Status:** Intentional for fast CI. Integration tests can be added later.

### No Frontend Component Tests

- **What:** Tests cover the backend tRPC routers and core modules only. React components are not unit-tested.
- **Impact:** UI regressions require manual verification.
- **Mitigation:** The app uses TypeScript strict mode and build-time checks.
- **Status:** Intentional. The project prioritizes backend correctness.

## 3. Database

### SSL Certificate Verification

- **What:** In production, the MySQL connection pool uses `ssl: { rejectUnauthorized: false }`.
- **Impact:** Accepts any server certificate. Suitable for managed cloud databases (RDS, Cloud SQL) but less strict than custom CA verification.
- **Mitigation:** Set `DATABASE_URL` with `sslca` parameter if your provider issues a custom CA.
- **Status:** Documented trade-off for managed DB compatibility.

### Connection Pool Size

- **What:** Fixed connection limit of 10.
- **Impact:** May bottleneck under very high concurrent load.
- **Mitigation:** Tune via environment if needed (requires code change today).
- **Status:** Acceptable for typical workloads.

## 4. Security

### Rate Limiting

- **What:** Rate limits are in-memory per process (200 req/15min general, 20 req/15min auth).
- **Impact:** Not shared across multiple server instances behind a load balancer.
- **Mitigation:** Use a reverse proxy (nginx, AWS ALB) or Redis-backed rate limiter for multi-instance deployments.
- **Status:** Documented. Sufficient for single-instance deployments.

### Content Security Policy

- **What:** The CSP allows `'unsafe-inline'` for scripts and styles to support the current frontend build.
- **Impact:** Slightly weaker CSP than strict nonce-based policies.
- **Mitigation:** Vite can be configured to emit nonces if required.
- **Status:** Acceptable for the current threat model.

## 5. Build & Assets

### Placeholder Env Variables in HTML

- **What:** If `VITE_APP_TITLE` or `VITE_APP_LOGO` are unset, Vite leaves the raw placeholders (`%VITE_APP_TITLE%`) in the built HTML.
- **Impact:** Browser tab shows the placeholder text; favicon request may 404.
- **Mitigation:** `.env.example` documents these variables with sensible defaults.
- **Status:** Non-blocking. Defaults are provided.

### Analytics Script

- **What:** The analytics script is only injected when both `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` are set.
- **Impact:** No tracking if unset.
- **Status:** By design. Optional feature.

## 6. Intelligence Pipeline

### Background Ingestion

- **What:** `intelligence.triggerIngestion` starts the pipeline in the background (not awaited).
- **Impact:** The mutation returns immediately; failures are logged to stderr but not returned to the caller.
- **Mitigation:** Monitor `intelligence.schedulerStatus` and `intelligence.runs` for outcomes.
- **Status:** By design. Prevents HTTP timeouts for long-running ingestion.

### CVE Search

- **What:** `intelligence.searchCves` uses a `LIKE` query on description and CVE ID.
- **Impact:** Full table scan on large cache tables; no full-text search index.
- **Mitigation:** MySQL full-text indexes or dedicated search (Meilisearch, Algolia) can be added.
- **Status:** Acceptable for current dataset sizes.

## 7. Tooling

### ESLint

- **What:** An ESLint config (`eslint.config.js`) is provided, but the required peer dependencies (`typescript-eslint`, `eslint-plugin-react`, etc.) are **not installed by default**.
- **Impact:** `pnpm lint` will fail until dev dependencies are installed.
- **Mitigation:** Run `pnpm add -D typescript-eslint eslint-plugin-react eslint-plugin-react-hooks @eslint/js globals` if you want linting.
- **Status:** Config is ready; dependencies are optional to keep install fast.

## 8. Not on the Roadmap

The following are explicitly out of scope for this repository:

- Multi-region deployment manifests (Kubernetes, Terraform)
- Real-time WebSocket updates for alerts
- SAML/SSO authentication
- Automated penetration testing in CI
- Mobile native apps
- Public API documentation (OpenAPI/Swagger)
