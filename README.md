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
- MySQL-compatible database reachable via DATABASE_URL

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

1. If pnpm prompts about ignored build scripts, approve them:

```bash
pnpm approve-builds
```

1. Create your local environment file:

```bash
cp .env.example .env
```

Then fill in the OAuth and secret values for your environment.

1. Run database migrations:

```bash
pnpm db:push
```

1. Start development mode:

```bash
pnpm dev
```

The app runs on port 3000 by default. If 3000 is busy, the server automatically scans nearby ports.

## Available Scripts

- pnpm dev: Start the server in development mode with Vite middleware
- pnpm build: Build frontend assets and bundle the server into dist
- pnpm start: Run the production server from dist
- pnpm test: Run Vitest test suites
- pnpm check: Run TypeScript type-checking
- pnpm format: Run Prettier formatting
- pnpm db:push: Generate and apply Drizzle migrations

## Environment Variables

### Required for local server boot

- DATABASE_URL: MySQL connection string
- JWT_SECRET: Session/cookie signing secret

### Required for OAuth login flow

- VITE_APP_ID: OAuth app identifier
- VITE_OAUTH_PORTAL_URL: OAuth portal base URL used by the frontend sign-in link
- OAUTH_SERVER_URL: OAuth provider base URL

If these OAuth values are missing, the server can still start, but sign-in and callback flows will fail.

### Optional for local development

- PORT: Server port override (default 3000)
- NODE_ENV: development or production
- OWNER_OPEN_ID: Bootstrap owner OpenID value

### Optional integrations and intelligence tuning

- NVD_API_KEY: Increases NVD API rate limits for ingestion
- BUILT_IN_FORGE_API_URL: Forge API URL for built-in integrations
- BUILT_IN_FORGE_API_KEY: Forge API key

## Project Layout

- client: React frontend application
- server: Express + tRPC backend, auth, ingestion, scheduler
- drizzle: schema and SQL migrations
- shared: shared constants and types across client/server
- patches: local dependency patches

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
- Overlap prevention: mutex guard plus node-cron noOverlap
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

## Troubleshooting

- Build script approval warning during install:
  - Run pnpm approve-builds and approve @tailwindcss/oxide and esbuild.
- Database connection errors:
  - Verify DATABASE_URL, network access, and database credentials.
- OAuth callback failures:
  - Verify VITE_APP_ID, OAUTH_SERVER_URL, and cookie/session secrets.

## License

MIT
