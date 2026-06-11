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

   Then fill in the required values (see [Environment Variables](#environment-variables) below).

3. **Run database migrations:**

   ```bash
   pnpm db:push
   ```

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
- `pnpm test` — Run Vitest test suites
- `pnpm check` — Run TypeScript type-checking
- `pnpm format` — Run Prettier formatting
- `pnpm verify` — Run the full verification suite (setup, build, tests, security, production)
- `pnpm db:push` — Generate and apply Drizzle migrations

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

### Optional: Web Analytics (Umami)

Sentinel Home uses **[Umami](https://umami.is)** for privacy-first, cookie-free web analytics. Google Analytics is intentionally **not** used by default to align with the product's security and privacy positioning.

The analytics script is **only injected** when both environment variables below are configured. If either is empty, no tracking code is loaded — this is the default for local development.

| Variable                    | Description                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `VITE_ANALYTICS_ENDPOINT`   | Umami instance base URL (e.g. `https://cloud.umami.is` or your self-hosted domain) |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website ID (UUID shown in your Umami site settings)                          |

**To enable traffic tracking in production:**

1. Create an account at [Umami Cloud](https://cloud.umami.is) or [self-host Umami](https://umami.is/docs/install).
2. Add a new site and copy the **Website ID**.
3. Set the two env vars in your production environment:
   ```bash
   VITE_ANALYTICS_ENDPOINT=https://cloud.umami.is
   VITE_ANALYTICS_WEBSITE_ID=<your-umami-website-id>
   ```
4. Rebuild and deploy. The script is injected automatically at runtime — no code changes required.

Umami collects only anonymized page views, referrers, devices, and geography. No cookies, no cross-site tracking, and no personal data is gathered.

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

Build and run with Docker:

```bash
docker build -t sentinel-home .
docker run -p 3000:3000 --env-file .env sentinel-home
```

## CI / GitHub Actions

A GitHub Actions workflow is included at `.github/workflows/ci.yml`. It runs `pnpm verify` on every push and pull request to `main`.

## Security

- Session cookies are `httpOnly`, `secure` (when HTTPS), `sameSite: "none"`
- Helmet security headers are applied in production
- API rate limiting is configured (200 req/15min general, 20 req/15min auth)
- CORS is configured for development
- API keys are hashed with SHA-256
- Org access is enforced at the tRPC procedure level with role checks
- `DEV_BYPASS_AUTH` must never be enabled in production
- NVD API rate limits are respected (6.5s delay between pages when no API key)

## Known Limitations

See [`LIMITATIONS.md`](LIMITATIONS.md) for a complete list of known non-blocking limitations, including testing strategy, external dependencies, and deployment trade-offs.

## Troubleshooting

- **Build script approval warning during install:**
  - Run `pnpm approve-builds` and approve `@tailwindcss/oxide` and `esbuild`.
- **Database connection errors:**
  - Verify `DATABASE_URL`, network access, and database credentials.
- **OAuth callback failures:**
  - Verify `VITE_APP_ID`, `OAUTH_SERVER_URL`, and cookie/session secrets.
- **Type errors after pulling updates:**
  - Run `pnpm install` to ensure dependencies match `pnpm-lock.yaml`.

## License

MIT
