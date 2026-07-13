# Sentinel Home

Sentinel Home is a multi-tenant security dashboard for connected devices. It combines device inventory, vulnerability intelligence, alerting, and AI-assisted explanations in one interface.

## Highlights

- Multi-tenant organization model with member roles and plan metadata
- Device inventory with status tracking and risk-aware workflows
- Vulnerability and alert lifecycle management
- AI-generated vulnerability explanations with progressive detail
- NVD + CISA KEV ingestion pipeline with device-to-CVE matching
- Automated ingestion scheduler (every 6 hours, UTC)
- React + tRPC + Drizzle full-stack TypeScript architecture

## Tech Stack

- Frontend: React 19, Vite, Wouter, TanStack Query, Tailwind CSS
- Backend: Express, tRPC, TypeScript
- Data: MySQL, Drizzle ORM, Drizzle Kit migrations
- Jobs: node-cron scheduler for intelligence ingestion
- Testing: Vitest

## Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL-compatible database reachable via `DATABASE_URL`

## Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

   If pnpm prompts about ignored build scripts, approve them:

   ```bash
   pnpm approve-builds
   ```

2. **Create your local environment file:**

   ```bash
   cp .env.example .env
   ```

   For environment-specific builds, create the matching file (`.env.dev`,
   `.env.test`, or `.env.prod`) instead. All `.env*` files are ignored by git.

   Then fill in the required values (see [Environment Variables](#environment-variables) below).

3. **Run database migrations:**

   Migration files live in `drizzle/migrations/`. Apply them with:

   ```bash
   pnpm db:migrate
   ```

   To generate a new migration after changing `drizzle/schema.ts`:

   ```bash
   pnpm db:push
   ```

   The Docker image runs `pnpm db:migrate` automatically before starting the
   server.

4. **Start development mode:**

   ```bash
   pnpm dev
   ```

   The app runs on port 3000 by default. If 3000 is busy, the server automatically scans nearby ports.

## Verification

Run the comprehensive verification suite to validate setup, types, tests, build, security, and production readiness:

```bash
pnpm verify
```

This single command checks:

1. **Setup** — Node.js >= 20, pnpm >= 10, dependencies installed, `.env` present
2. **Type Check** — TypeScript `tsc --noEmit` passes
3. **Format Check** — Prettier formatting is correct
4. **Tests** — All Vitest suites pass
5. **Build** — Production bundle (Vite + esbuild) succeeds
6. **Security Audit** — No critical or high severity vulnerabilities in dependencies
7. **Production Readiness** — Required files, env validation, security middleware, connection pooling, and graceful shutdown are present

## Available Scripts

- `pnpm dev` — Start the server in development mode with Vite middleware
- `pnpm build` — Build frontend assets and bundle the server into `dist/`
- `pnpm start` — Run the production server from `dist/`
- `pnpm build:dev` — Build a development package into `dist/dev/`
- `pnpm build:test` — Build a test package into `dist/test/`
- `pnpm build:prod` — Build a production package into `dist/prod/`
- `pnpm start:dev` — Run the development package from `dist/dev/`
- `pnpm start:test` — Run the test package from `dist/test/`
- `pnpm start:prod` — Run the production package from `dist/prod/`
- `pnpm test` — Run Vitest test suites
- `pnpm check` — Run TypeScript type-checking
- `pnpm format` — Run Prettier formatting
- `pnpm verify` — Run the full verification suite (setup, build, tests, security, production)
- `pnpm db:push` — Generate a new migration from `drizzle/schema.ts` and apply it
- `pnpm db:migrate` — Apply committed migrations from `drizzle/migrations/`

Environment-specific builds use Vite modes (`dev`, `test`, `prod`) and load the
matching `.env.*` file at runtime. The original `pnpm build` / `pnpm start`
scripts remain available for backward compatibility.

## Environment Variables

### Required for local server boot

| Variable       | Description                                 |
| -------------- | ------------------------------------------- |
| `DATABASE_URL` | MySQL connection string                     |
| `JWT_SECRET`   | Session/cookie signing secret (min 8 chars) |

### Required for OAuth login flow

| Variable                | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `VITE_APP_ID`           | OAuth app identifier                                    |
| `VITE_OAUTH_PORTAL_URL` | OAuth portal base URL used by the frontend sign-in link |
| `OAUTH_SERVER_URL`      | OAuth provider base URL                                 |

If these OAuth values are missing, the server can still start, but sign-in and callback flows will fail.

### Optional for local development

| Variable          | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `PORT`            | Server port override (default 3000)                                                |
| `NODE_ENV`        | `development` or `production`                                                      |
| `OWNER_OPEN_ID`   | Bootstrap owner OpenID value                                                       |
| `DEV_BYPASS_AUTH` | Set to `true` to skip OAuth and auto-provision a local dev user/org for UI testing |

> **Warning:** `DEV_BYPASS_AUTH` must never be enabled in production.

### Optional integrations and intelligence tuning

| Variable                 | Description                                 |
| ------------------------ | ------------------------------------------- |
| `NVD_API_KEY`            | Increases NVD API rate limits for ingestion |
| `BUILT_IN_FORGE_API_URL` | Forge API URL for built-in integrations     |
| `BUILT_IN_FORGE_API_KEY` | Forge API key                               |

### Optional client-side branding

| Variable         | Description                                  |
| ---------------- | -------------------------------------------- |
| `VITE_APP_TITLE` | Browser tab title (default: "Sentinel Home") |
| `VITE_APP_LOGO`  | Favicon and app icon URL                     |

## Project Layout

- `client/` — React frontend application
- `server/` — Express + tRPC backend, auth, ingestion, scheduler
- `drizzle/` — schema and SQL migrations
- `shared/` — shared constants and types across client/server
- `scripts/` — verification and automation scripts
- `patches/` — local dependency patches

## Intelligence Ingestion Pipeline

The ingestion pipeline:

1. Fetches the CISA KEV catalog
2. Fetches CVEs from NVD (incremental/recent/full modes)
3. Enriches CVEs with KEV metadata
4. Upserts CVEs into cache tables
5. Matches CVEs to organization devices
6. Creates vulnerabilities and alerts for qualifying matches
7. Updates device risk posture
8. Records ingestion run metrics

Scheduler behavior:

- Cron expression: `0 */6 * * *`
- Timezone: UTC
- Overlap prevention: mutex guard plus node-cron `noOverlap`
- Manual trigger support via backend intelligence procedure

## Testing

Run all tests:

```bash
pnpm test
```

Run integration tests against a real MySQL container:

```bash
pnpm test:integration
```

Run the end-to-end smoke test against the production bundle:

```bash
pnpm test:e2e
```

The E2E smoke test starts a MySQL container, builds the production bundle,
starts the server, and verifies `/health` and `/metrics`.

Type-check without emitting artifacts:

```bash
pnpm check
```

## Production Build

Build and run:

```bash
pnpm build
pnpm start
```

In production, static client assets are served by the backend.

## Docker

For a detailed local quick-start guide, see [`docs/docker-local.md`](docs/docker-local.md).

Build and run locally:

```bash
docker build -t sentinel-home .
docker run -p 3000:3000 --env-file .env sentinel-home
```

### Local development with Docker Compose

A `docker-compose.yml` is provided for local development. It starts the app,
MySQL, and Redis with `DEV_BYPASS_AUTH=true` so you can test the UI without an
OAuth provider.

```bash
docker compose up --build
```

The app is available at http://localhost:3000.

### Production-like deployment with Docker Compose

`docker-compose.prod.yml` runs the app with a production image, MySQL, and
Redis. Create a `.env.prod` file with the required values (see `.env.example`)
and deploy:

```bash
export APP_IMAGE=ghcr.io/<owner>/sentinel-home:v1.2.3
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Deploying from GitHub Container Registry

The `.github/workflows/docker-publish.yml` workflow builds and pushes images to
`ghcr.io/<owner>/sentinel-home` on every push to `main` and every semver tag
(`v*.*.*`).

Pull and run the latest image:

```bash
docker pull ghcr.io/<owner>/sentinel-home:main
docker run -d -p 3000:3000 --env-file .env --name sentinel-home ghcr.io/<owner>/sentinel-home:main
```

Replace `<owner>` with your GitHub user or organization name. For production,
pin to a specific semantic version tag (e.g. `ghcr.io/<owner>/sentinel-home:1.2.3`)
instead of `main`.

See [`RELEASE.md`](RELEASE.md) for the full release, deployment, and rollback
process.

## CI / GitHub Actions

A GitHub Actions workflow is included at `.github/workflows/ci.yml`. It runs `pnpm verify` on every push and pull request to `main`.

Dependabot is configured in `.github/dependabot.yml` to open weekly pull requests for npm/pnpm, Docker, and GitHub Actions updates.

## Security

- Session cookies are `httpOnly`, `secure` (when HTTPS), `sameSite: "none"`
- Helmet security headers are applied in production
- API rate limiting is configured (200 req/15min general, 20 req/15min auth)
- CORS is configured for development
- API keys are hashed with SHA-256
- Org access is enforced at the tRPC procedure level with role checks
- `DEV_BYPASS_AUTH` must never be enabled in production
- NVD API rate limits are respected (6.5s delay between pages when no API key)
- CodeQL static analysis runs on every push/PR and weekly

## Monitoring

The server exposes production metrics in Prometheus format:

- `GET /health` — liveness/readiness probe; checks database connectivity
- `GET /metrics` — Prometheus metrics (request counts/latency, scheduler runs,
  ingestion pipeline runs, Node.js default metrics)

Both endpoints are served outside the rate limiter so load balancers and
scrapers can reach them without consuming quota.

See [`RUNBOOKS.md`](RUNBOOKS.md) for the incident response checklist and
monitoring quick reference.

See [`LIMITATIONS.md`](LIMITATIONS.md) for a complete list of known non-blocking limitations, including testing strategy, external dependencies, and deployment trade-offs.

## Performance & SLOs

See [`PERFORMANCE.md`](PERFORMANCE.md) for service level objectives, resource
expectations, scalability constraints, and load-testing instructions.

## Troubleshooting

- **Build script approval warning during install:**
  - Run `pnpm approve-builds` and approve `@tailwindcss/oxide` and `esbuild`.
- **Database connection errors:**
  - Verify `DATABASE_URL`, network access, and database credentials.
- **OAuth callback failures:**
  - Verify `VITE_APP_ID`, `OAUTH_SERVER_URL`, and cookie/session secrets.
- **Type errors after pulling updates:**
  - Run `pnpm install` to ensure dependencies match `pnpm-lock.yaml`.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development workflow, code quality
expectations, testing requirements, and release procedures.

## License

MIT
