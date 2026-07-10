# Sentinel Home — Release Process

This document describes how to cut, deploy, and roll back releases of Sentinel Home.

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** — incompatible API or schema changes requiring operator action
- **MINOR** — new features, backwards compatible
- **PATCH** — bug fixes, security patches, backwards compatible

## Release Checklist

Before tagging a release, ensure:

1. `pnpm verify` passes locally.
2. `CHANGELOG.md` is updated with the new version and release date.
3. `package.json` version is bumped.
4. Required environment variables are documented in `.env.example`.
5. Database migrations are committed and tested.
6. The Docker image builds successfully.

## Cutting a Release

1. Create a release branch:

   ```bash
   git checkout -b release/v1.2.3
   ```

2. Update version and changelog:

   ```bash
   # Edit package.json and CHANGELOG.md
   ```

3. Open a pull request. CI must pass before merging.

4. Merge to `main`.

5. Tag the release:

   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

6. The `.github/workflows/docker-publish.yml` workflow builds and pushes the
   image to `ghcr.io/<owner>/sentinel-home:v1.2.3`.

7. Create a GitHub Release from the tag and paste the relevant section from
   `CHANGELOG.md` into the release notes.

## Deploying a Release

Pull and run the new image:

```bash
docker pull ghcr.io/<owner>/sentinel-home:v1.2.3
docker run -d -p 3000:3000 --env-file .env --name sentinel-home ghcr.io/<owner>/sentinel-home:v1.2.3
```

The container automatically runs database migrations before starting the server.

## Rolling Back

If a release causes problems:

1. Stop the running container:

   ```bash
   docker stop sentinel-home
   docker rm sentinel-home
   ```

2. Start the previous version:

   ```bash
   docker pull ghcr.io/<owner>/sentinel-home:v1.2.2
   docker run -d -p 3000:3000 --env-file .env --name sentinel-home ghcr.io/<owner>/sentinel-home:v1.2.2
   ```

3. If a database migration from the bad release was applied, restore from a
   backup before the failed deploy. See `RUNBOOKS.md` for backup/restore steps.

4. Communicate the rollback in your incident channel.

## Upgrade Notes

### v1.x → v1.y (minor)

- Review `CHANGELOG.md` for new required environment variables.
- Run `pnpm db:migrate` before starting the new version if not using the Docker
  image (the Docker image runs this automatically).
- Verify `/health` returns `200` before routing traffic.

### v1.x → v2.x (major)

- Read the upgrade guide in the release notes.
- Test in a non-production environment first.
- Plan a maintenance window for schema migrations if required.
