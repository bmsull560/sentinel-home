<!-- From: /home/bunnyshell/sentinel-home/AGENTS.md -->

# Sentinel Home — Agent Guide

> This file is for AI coding agents. Read it first before making any changes.

## Project Overview

Sentinel Home is a multi-tenant security dashboard for connected devices. It combines device inventory, vulnerability intelligence, alerting, and AI-assisted explanations in one interface.

Key capabilities:

- Multi-tenant organization model with member roles (owner / admin / viewer) and plan metadata (`free` | `starter` | `pro` | `enterprise`)
- Device inventory with status tracking (`secure` | `at_risk` | `critical` | `unknown`) and risk-aware workflows
- Vulnerability and alert lifecycle management
- AI-generated vulnerability explanations with progressive detail levels (`simple` | `moderate` | `technical`)
- NVD + CISA KEV ingestion pipeline with device-to-CVE matching
- Automated ingestion scheduler (every 6 hours, UTC)
- Multi-agent orchestration for security analysis via LLM

## Technology Stack

- **Runtime:** Node.js 20+, ESM modules (`"type": "module"`)
- **Package Manager:** pnpm 10.4.1 (pinned in `packageManager` field)
- **Frontend:** React 19, Vite 7, Wouter 3 (routing), TanStack Query 5, Tailwind CSS v4, shadcn/ui Radix primitives
- **Backend:** Express 4, tRPC 11 (`@trpc/server/adapters/express`), TypeScript 5.9
- **Data:** MySQL (via `mysql2`), Drizzle ORM 0.44, Drizzle Kit 0.31 migrations
- **Jobs:** `node-cron` scheduler for intelligence ingestion
- **Testing:** Vitest 2 (node environment)
- **Auth:** OAuth 2.0 external provider, JWT sessions in `httpOnly` cookies signed with `jose`
- **AI:** LLM via Forge API (OpenAI-compatible chat completions), default model `gemini-2.5-flash`

## Project Layout

```
client/               React frontend
  src/pages/          Route-level page components
  src/components/     Reusable components
    ui/               shadcn/ui primitives (50+ components)
  src/lib/            Utility modules (trpc client, cn helper)
  src/contexts/       React contexts (ThemeContext, etc.)
  src/_core/hooks/    Custom hooks (useAuth)
  src/hooks/          Additional hooks (useMobile, useComposition, etc.)
  public/             Static assets
  index.html          Entry HTML

server/               Express + tRPC backend
  _core/              Infrastructure and cross-cutting concerns
    index.ts          Server bootstrap (Express, Vite middleware, scheduler)
    trpc.ts           tRPC init, router, public/protected/admin procedures
    context.ts        Request context builder (auth, dev bypass)
    env.ts            Centralized env var access
    oauth.ts          OAuth callback route registration
    sdk.ts            OAuth SDK (token exchange, JWT sessions, user sync)
    cookies.ts        Secure cookie option builder
    llm.ts            LLM invocation wrapper (Forge API)
    vite.ts           Vite dev middleware / static file serving
    systemRouter.ts   Internal system endpoints (health, notify)
  intelligence/       Ingestion pipeline
    scheduler.ts      node-cron scheduler state + lifecycle
    ingestionPipeline.ts  Orchestrates KEV → NVD → match → alert flow
    nvdClient.ts      NVD API v2 client with rate-limit handling
    kevFetcher.ts     CISA KEV catalog fetcher
    cpeMatchEngine.ts Device-to-CVE matching with confidence scores
  db.ts               Drizzle DAL (all DB queries)
  routers.ts          tRPC appRouter — all public API procedures
  *.test.ts           Vitest test suites

drizzle/              Database schema and migrations
  schema.ts           Single source of truth for all MySQL tables
  relations.ts        Drizzle relations (currently empty)
  migrations/         SQL migration files

shared/               Code shared between client and server
  const.ts            Shared constants (cookie name, error messages)
  types.ts            Shared type exports (re-exports drizzle schema + errors)
  _core/errors.ts     HttpError class and convenience constructors

patches/              pnpm dependency patches
```

## Path Aliases

| Alias       | Resolves to         |
| ----------- | ------------------- |
| `@/*`       | `client/src/*`      |
| `@shared/*` | `shared/*`          |
| `@assets/*` | `attached_assets/*` |

Used in both Vite (`vite.config.ts`) and Vitest (`vitest.config.ts`) configs.

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Development (Vite HMR + Express + tsx watch)
pnpm dev

# Production build (frontend assets + server bundle)
pnpm build

# Start production server from dist/
pnpm start

# Environment-specific package builds
pnpm build:dev   # outputs to dist/dev/
pnpm build:test  # outputs to dist/test/
pnpm build:prod  # outputs to dist/prod/

# Start an environment-specific built package
pnpm start:dev   # loads .env.dev
pnpm start:test  # loads .env.test
pnpm start:prod  # loads .env.prod

# Type-check (no emit)
pnpm check

# Run tests
pnpm test

# Format with Prettier
pnpm format

# Generate and apply DB migrations
pnpm db:push
```

**Important:** If pnpm warns about ignored build scripts during install, run `pnpm approve-builds` and approve `@tailwindcss/oxide` and `esbuild`.

## Server Architecture

The server is a single Express app that handles everything:

1. `express.json()` / `express.urlencoded()` body parsers (50mb limit)
2. OAuth callback route at `/api/oauth/callback`
3. tRPC API at `/api/trpc` with context containing `req`, `res`, `user`
4. In development: Vite dev middleware serves the React app
5. In production: static files from `dist/public/` with SPA fallthrough to `index.html`
6. Port defaults to 3000; auto-scans up to 3020 if busy
7. Cron scheduler starts after the HTTP server is listening

### tRPC Procedures

- `publicProcedure` — no auth required
- `protectedProcedure` — requires a valid session user
- `adminProcedure` — requires `user.role === "admin"`

Most org-scoped procedures call `requireOrgAccess(userId, orgId, minRole?)` to enforce membership and role checks. The helper throws `FORBIDDEN` TRPCError if access is denied. In dev bypass mode, it always returns `"owner"`.

### Auth Flow

1. Frontend redirects to OAuth portal (`VITE_OAUTH_PORTAL_URL`) with `appId`, `redirectUri`, `state`
2. User authenticates on portal
3. Portal redirects back to `/api/oauth/callback?code=&state=`
4. Server exchanges code for token, fetches user info, upserts user in DB
5. Server creates a JWT session cookie (`app_session_id`) and redirects to `/`
6. Subsequent requests include the cookie; `sdk.authenticateRequest()` verifies it

### Dev Bypass

Set `DEV_BYPASS_AUTH=true` to skip OAuth entirely. The server auto-provisions a dev user (`sentinel-dev-bypass-openid`) and org (`sentinel-dev-org`) for local UI testing. The dev user gets `role: "admin"`.

## Database Schema

MySQL tables (all defined in `drizzle/schema.ts`):

- `users` — OAuth users with roles (`user` | `admin`)
- `organizations` — tenants with plan metadata (`free` | `starter` | `pro` | `enterprise`)
- `org_members` — many-to-many membership with roles (`owner` | `admin` | `viewer`)
- `org_invitations` — email invitation tokens
- `api_keys` — org-scoped API keys (prefix visible, hash stored)
- `devices` — org devices with CPE match fields and risk status
- `vulnerabilities` — org vulnerability records linked to devices/CVEs
- `alerts` — notifications with severity (`info` | `warning` | `critical`) and lifecycle status
- `agent_runs` — AI agent execution history
- `nvd_cve_cache` — normalized NVD CVE data (source of truth before matching)
- `kev_catalog` — full CISA KEV catalog snapshot
- `device_cve_matches` — junction of matched CVEs to devices with confidence scores
- `ingestion_runs` — observability log for every pipeline run

Migrations are managed by Drizzle Kit (`drizzle.config.ts`).

## Intelligence Ingestion Pipeline

The pipeline runs automatically every 6 hours (UTC) via `node-cron`, or can be triggered manually from the Intelligence UI.

Flow:

1. Fetch CISA KEV catalog → upsert `kev_catalog`
2. Fetch NVD CVEs (incremental delta or recent N days)
3. Enrich each CVE with KEV status
4. Upsert into `nvd_cve_cache`
5. For every org, match CVEs to devices using the CPE match engine
6. Upsert `device_cve_matches` (confidence ≥ 50)
7. Create org `vulnerabilities` + `alerts` for high-risk new matches
8. Update `devices.status` based on highest severity match
9. Record metrics to `ingestion_runs`

Scheduler protections:

- Mutex guard (`isRunning` flag)
- `node-cron` `noOverlap: true`
- Graceful shutdown on `SIGTERM` / `SIGINT`

### Matching Engine

Three strategies (in order):

1. **Exact CPE** — device has pre-discovered CPE vendor/product (confidence 100)
2. **Fuzzy CPE** — Levenshtein similarity ≥ 0.80 on normalized names (confidence 70–90)
3. **Vendor/Product Keyword** — substring match after normalization (confidence 50–70)

**Sentinel Risk Score** (0–100):

- Base: CVSS × 10
- +50 if CISA KEV
- +25 if exploit available
- +20 if no patch
- +15 if attack vector is NETWORK
- +10 if no user interaction required
- Capped at 100

Severity tiers: `calm` (< 30) → `be_aware` (< 55) → `action_recommended` (< 80) → `immediate_attention` (≥ 80)

## Testing Strategy

- **Runner:** Vitest with `environment: "node"`
- **Pattern:** `server/**/*.test.ts`, `server/**/*.spec.ts`
- **Approach:** Unit tests against tRPC routers using `appRouter.createCaller(ctx)`
- **Mocking:**
  - `vi.mock("./db", ...)` to mock the entire DAL
  - `vi.mock("./_core/llm", ...)` to mock AI calls
  - `vi.mock("node-cron", ...)` for scheduler tests
- **Patterns observed:**
  - Context factory functions (`makeCtx()`, `createAuthContext()`) return typed `TrpcContext`
  - Module-level state reset helpers (`_resetSchedulerStateForTests()`) for test isolation
  - `beforeEach` / `afterEach` hooks reset mocks and module state

### Running Tests

```bash
pnpm test
```

## Code Style Guidelines

- **Formatter:** Prettier (config in `.prettierrc`)
  - `semi: true`, `singleQuote: false`, `trailingComma: "es5"`
  - `printWidth: 80`, `tabWidth: 2`, `useTabs: false`
  - `arrowParens: "avoid"`, `endOfLine: "lf"`
- **TypeScript:** Strict mode enabled. Target `ESNext`, module resolution `bundler`.
- **Imports:** Prefer explicit type imports (`import type`).
- **Comments:** Use `// ─── Section Name ──────────────────────────────────` dividers in long files.
- **UI Components:** All shadcn/ui primitives live in `client/src/components/ui/` and follow the Radix + Tailwind pattern.
- **Styling:** Tailwind CSS v4 with custom CSS variables. Strict 3-color palette (black, white, blue accent using `oklab`). Custom utility classes for severity/status badges in `client/src/index.css`.

## Security Considerations

- Session cookies are `httpOnly`, `secure` (when HTTPS), `sameSite: "none"`
- OAuth secrets and JWT signing key must be set via environment variables
- API key hashes are stored; only the prefix and raw key (once, on creation) are exposed
- Org access is enforced at the tRPC procedure level with role checks
- `DEV_BYPASS_AUTH` must never be enabled in production
- NVD API rate limits are respected (6.5s delay between pages when no API key)

## Environment Variables

### Required for local boot

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — Session/cookie signing secret

### Required for OAuth

- `VITE_APP_ID` — OAuth app ID (also used by frontend)
- `VITE_OAUTH_PORTAL_URL` — OAuth portal base URL
- `OAUTH_SERVER_URL` — OAuth provider base URL

### Optional

- `PORT` — Server port (default 3000)
- `NODE_ENV` — `development` | `production`
- `DEV_BYPASS_AUTH` — `true` to skip OAuth for local dev
- `OWNER_OPEN_ID` — Bootstrap owner OpenID
- `NVD_API_KEY` — Increases NVD rate limits
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` — Forge API for LLM

## Common Tasks

### Add a new tRPC endpoint

1. Add the DB function to `server/db.ts` (or reuse existing)
2. Add the router procedure to `server/routers.ts` under the appropriate sub-router
3. Use `protectedProcedure` (or `publicProcedure` / `adminProcedure`) and Zod input validation
4. Call `requireOrgAccess(ctx.user.id, input.orgId)` for org-scoped endpoints
5. Add tests in a `*.test.ts` file near the code under test

### Add a new database table

1. Define the table in `drizzle/schema.ts` using `drizzle-orm/mysql-core`
2. Export `Type` and `InsertType` inferred types
3. Add DAL functions to `server/db.ts`
4. Run `pnpm db:push` to generate and apply the migration
5. Re-export types from `shared/types.ts` if needed

### Add a new page/route

1. Create the page component in `client/src/pages/`
2. Add the `<Route>` to `client/src/App.tsx`
3. Add a nav item to `client/src/components/AppShell.tsx` if it belongs in the dashboard

### Run ingestion manually

Use the Intelligence UI or call the tRPC mutation:

```ts
await trpc.intelligence.triggerIngestion.useMutation({
  orgId: 1,
  mode: "recent",
  daysBack: 7,
});
```
