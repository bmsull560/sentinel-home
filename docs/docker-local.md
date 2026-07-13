# Run Sentinel Home locally with Docker

This guide gets the full Sentinel Home stack running in Docker for local UI development and testing. It uses the existing `docker-compose.yml`, which starts MySQL, Redis, and the app server together, and enables `DEV_BYPASS_AUTH` so you can use the dashboard without configuring an OAuth provider.

## Prerequisites

- Docker Desktop (Windows) or Docker Engine with Compose v2.
- Free ports on your machine:
  - `3000` — web app
  - `3306` — MySQL
  - `6379` — Redis
- A clone of this repository.

## Quick start

1. **Open a terminal in the repository root.**

2. **(Optional) Create an environment file.**

   The compose file already sets sensible defaults for the quick-start, so this step is optional. If you want to override anything, copy the example file and edit it:

   ```bash
   cp .env.example .env
   ```

3. **Build and start the stack.**

   ```bash
   docker compose up --build
   ```

   This command will:

   - Pull the MySQL 8 and Redis 7 images.
   - Build the app image from the `Dockerfile`.
   - Start all three services with health checks.
   - Wait for MySQL and Redis to be healthy before starting the app.
   - Run database migrations automatically via `scripts/migrate.js`.

   The first build can take several minutes while `pnpm` installs dependencies and Vite bundles the frontend.

4. **Open the app.**

   - App: http://localhost:3000
   - Health check: http://localhost:3000/health

   Because `DEV_BYPASS_AUTH=true` is set in `docker-compose.yml`, the server creates a local dev user and organization automatically. You should arrive at the dashboard already signed in as an admin.

## Stop and reset

- Stop the stack:

  ```bash
  docker compose down
  ```

- Stop the stack and delete the persisted MySQL data:

  ```bash
  docker compose down -v
  ```

  Use this when you want to start completely fresh. The MySQL data lives in a Docker named volume called `db_data`.

## Changing the port

If `3000` is already in use, edit the `app` service in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"
```

Then open http://localhost:3001.

## Next steps

- For production-like deployments, see `docker-compose.prod.yml` and `RELEASE.md`.
- To run without Docker, follow the `README.md` quick-start.
