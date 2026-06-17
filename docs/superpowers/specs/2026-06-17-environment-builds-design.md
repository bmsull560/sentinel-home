# Environment-specific single-command package builds

## Goal
Provide three independent, single-command package builds for the Sentinel Home app:
- `pnpm build:dev`   → dev environment package
- `pnpm build:test`  → test environment package
- `pnpm build:prod`  → production environment package

Each command must produce a complete, runnable bundle (frontend + server) without manual env switching.

## Context
- The app is a single Express server + Vite React SPA.
- The current `build` script always outputs to `dist/public` (frontend) and `dist/index.js` (server).
- Env vars are validated in `server/_core/env.ts` and loaded at runtime via `import "dotenv/config"`.
- The server uses `process.env.NODE_ENV === "development"` to decide whether to mount the Vite dev middleware or serve built static files.

## Design

### 1. Env-specific build outputs
Each environment builds into its own directory so artifacts can coexist:

| Environment | Frontend outDir | Server outDir |
|-------------|-----------------|---------------|
| dev         | `dist/dev/public` | `dist/dev/index.js` |
| test        | `dist/test/public` | `dist/test/index.js` |
| prod        | `dist/prod/public` | `dist/prod/index.js` |

`serveStatic()` in `server/_core/vite.ts` already resolves static assets relative to the server bundle directory, so `node dist/dev/index.js` will correctly serve `dist/dev/public`.

### 2. Vite modes + env files
Use Vite modes `dev`, `test`, `prod` so `vite build --mode <mode>` automatically loads `.env.dev`, `.env.test`, `.env.prod`.

Create the following env files (gitignored) seeded from `.env.example`:
- `.env.dev`
- `.env.test`
- `.env.prod`

Each file sets env-specific values for `DATABASE_URL`, `PORT`, `JWT_SECRET`, `DEV_BYPASS_AUTH`, and `VITE_APP_TITLE`.

### 3. Decouple dev-middleware detection from NODE_ENV
The current check `process.env.NODE_ENV === "development"` makes a built dev package try to mount the Vite dev middleware instead of serving static files.

Change the condition to an explicit `VITE_DEV=true` flag:
- `pnpm dev` becomes `VITE_DEV=true NODE_ENV=development tsx watch server/_core/index.ts`
- Built packages set `NODE_ENV` to the appropriate value in their `start:*` scripts and use `serveStatic()`.

### 4. Build & start scripts
New package scripts:

```json
{
  "build:dev":  "NODE_ENV=development vite build --outDir dist/dev/public --mode dev && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/dev",
  "build:test": "NODE_ENV=test vite build --outDir dist/test/public --mode test && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/test",
  "build:prod": "NODE_ENV=production vite build --outDir dist/prod/public --mode prod && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/prod",
  "start:dev":  "DOTENV_CONFIG_PATH=.env.dev NODE_ENV=development node dist/dev/index.js",
  "start:test": "DOTENV_CONFIG_PATH=.env.test NODE_ENV=test node dist/test/index.js",
  "start:prod": "DOTENV_CONFIG_PATH=.env.prod NODE_ENV=production node dist/prod/index.js"
}
```

The existing `build` and `start` scripts remain unchanged for backward compatibility.

### 5. Documentation & gitignore
- Update `.gitignore` to ignore `.env.dev`, `.env.test`, `.env.prod`.
- Update `AGENTS.md` Build and Development Commands section with the new scripts.

## Validation
- Run each build command and verify the expected files exist under `dist/{dev,test,prod}`.
- Run the production build and confirm `node dist/prod/index.js` starts the server and serves static assets from `dist/prod/public`.
