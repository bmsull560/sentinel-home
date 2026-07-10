# Changelog

All notable changes to Sentinel Home are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Production-ready Docker image with non-root user and builder-stage `node_modules` copy.
- Committed Drizzle migrations under `drizzle/migrations/` with metadata snapshots.
- Automatic migration step in the Docker entrypoint (`node scripts/migrate.js`).
- Structured Pino logging with request trace IDs and sensitive-field redaction.
- Prometheus `/metrics` endpoint with request duration/counter metrics and scheduler/ingestion counters.
- Enhanced `/health` endpoint reporting database, Redis, and scheduler status.
- Redis-backed rate limiting when `REDIS_URL` is configured.
- Exponential-backoff retry helper for external API calls (NVD, OAuth, Forge).
- Operational runbooks (`RUNBOOKS.md`) for incident response, rollback, secrets rotation, and backups.
- Performance targets and load-testing instructions (`PERFORMANCE.md`).
- Dependabot configuration for npm/pnpm, Docker, and GitHub Actions updates.
- GitHub Actions Docker publish workflow pushing to GitHub Container Registry.

### Changed

- Session cookie lifetime aligned to 24 hours with the DB session TTL.
- `drizzle.config.ts` outputs migrations to `drizzle/migrations/`.
- `getDb()` reads `DATABASE_URL` at call time to support test containers.

### Fixed

- Integration tests now pass against a real MySQL database via Testcontainers.

## [1.0.0] - 2026-07-10

### Added

- Initial multi-tenant security dashboard for connected devices.
- Device inventory with status tracking and risk-aware workflows.
- Vulnerability and alert lifecycle management.
- AI-generated vulnerability explanations with progressive detail levels.
- NVD + CISA KEV ingestion pipeline with device-to-CVE matching.
- Automated ingestion scheduler (every 6 hours, UTC).
- React + tRPC + Drizzle full-stack TypeScript architecture.
- OAuth 2.0 authentication with server-side sessions.
- Role-based access control (owner / admin / viewer).
- API key management with SHA-256 hashed secrets.
- Comprehensive verification script (`pnpm verify`).

[Unreleased]: https://github.com/bmsull560/sentinel-home/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bmsull560/sentinel-home/releases/tag/v1.0.0
