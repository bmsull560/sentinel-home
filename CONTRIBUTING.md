# Contributing to Sentinel Home

Thank you for contributing to Sentinel Home. This document describes how to
propose changes, report issues, and maintain production readiness.

## Ownership

- **Primary maintainer:** Platform / SRE team
- **Security issues:** Security team
- **Frontend:** Client team
- **Backend / data:** Platform team

For escalation contacts, see [`RUNBOOKS.md`](RUNBOOKS.md).

## Development Workflow

1. Fork the repository and create a feature branch from `main`.
2. Run `pnpm install` to install dependencies.
3. Copy `.env.example` to `.env` and fill in required values.
4. Run `pnpm db:push` to apply migrations.
5. Run `pnpm dev` to start the development server.

## Code Quality

Before opening a pull request, run the verification suite:

```bash
pnpm verify
```

This runs:

- TypeScript type checking (`pnpm check`)
- Prettier formatting (`pnpm format`)
- Unit tests (`pnpm test`)
- Integration tests (`pnpm test:integration`)
- Production build (`pnpm build`)
- Security audit (`pnpm audit`)
- Production readiness checks

## Testing

- Add unit tests for new business logic in `server/**/*.test.ts`.
- Add integration tests for database-backed flows in
  `server/**/*.integration.test.ts`.
- Run the E2E smoke test for production-bundle validation:

  ```bash
  pnpm test:e2e
  ```

## Migrations

When changing `drizzle/schema.ts`:

1. Run `pnpm db:push` to generate and apply the migration.
2. Commit the generated files under `drizzle/migrations/`.
3. Test the migration against a fresh database in CI.

## Pull Request Process

1. Fill out the PR template with a clear description and motivation.
2. Ensure CI passes (`pnpm verify`).
3. Request review from the relevant code owner.
4. Squash-merge to `main` once approved.

## Security

- Do not commit secrets, credentials, or `.env` files.
- Report security vulnerabilities privately to the security team, not via public
  issues.
- Follow the secure defaults documented in [`README.md`](README.md).

## Release Process

See [`RELEASE.md`](RELEASE.md) for versioning, tagging, deployment, and rollback
procedures.

## Code of Conduct

Be respectful, constructive, and inclusive. Disagreements are expected; personal
attacks are not tolerated.
