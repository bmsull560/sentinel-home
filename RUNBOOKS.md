# Sentinel Home — Operational Runbooks

## Incident Response Checklist

When production is impacted, follow this checklist in order.

### 1. Detect

- Check `/health` endpoint response and status code.
- Review logs (look for `requestId` to trace request chains).
- Check scheduler status via Intelligence UI or `ingestion_runs` table.

### 2. Assess

- **Is the database reachable?** `SELECT 1` from app host.
- **Is Redis reachable?** (if configured for rate limiting)
- **Are external dependencies healthy?**
  - OAuth provider status page
  - NVD API status
  - Forge API status

### 3. Mitigate

- If a bad deploy: rollback to previous Docker image tag (see Rollback below).
- If DB connection issues: verify `DATABASE_URL`, network, and connection pool saturation.
- If ingestion is stuck: check `schedulerStatus` and `ingestion_runs` for failed runs.
- If rate limiting is evaded: ensure `REDIS_URL` is set for multi-instance deployments.

### 4. Communicate

- Post incident summary to team channel.
- Include `requestId` of failing requests for debugging.

### 5. Post-Incident

- Write a short post-mortem within 24h.
- Update this runbook if gaps were found.

---

## Rollback Procedure

### Docker Deployment

```bash
# List available image tags
docker images sentinel-home

# Rollback to previous tag
docker stop sentinel-home
docker rm sentinel-home
docker run -d -p 3000:3000 --env-file .env --name sentinel-home sentinel-home:<previous-tag>
```

### Git-Based Rollback

```bash
git log --oneline -10
git revert <bad-commit-sha>
# Push to trigger CI rebuild
git push origin main
```

---

## Secrets Rotation

### JWT_SECRET (Session Signing)

1. Generate new secret: `openssl rand -base64 32`
2. Update secret in environment (`.env`, Docker secrets, K8s secret, etc.).
3. Restart application instances one by one.
4. **Note:** Existing sessions will be invalidated because the session token verification uses the DB session table, but the cookie itself is just a random token. The old sessions remain in DB; users will need to re-authenticate after cookie expiry or if you explicitly revoke all sessions.
5. To force all users to re-authenticate: run `UPDATE sessions SET revokedAt = NOW();` in MySQL.

### DATABASE_URL

1. Create new DB credentials in your managed database console.
2. Update `DATABASE_URL` in environment.
3. Restart application.
4. Verify connectivity via `/health`.
5. Revoke old credentials after confirming stability.

### OAuth Credentials

1. Rotate credentials in the OAuth provider admin panel.
2. Update `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, and `OAUTH_SERVER_URL`.
3. Restart application.

---

## Database Backup & Restore

### Managed Database (Recommended)

- Enable automated daily snapshots in your cloud provider (RDS, Cloud SQL, etc.).
- Set retention to at least 7 days.
- Test restore procedure quarterly.

### Manual Logical Backup

```bash
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS sentinel_home > backup_$(date +%F).sql
```

### Restore from Dump

```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS sentinel_home < backup_YYYY-MM-DD.sql
```

### RPO / RTO Targets

- **RPO:** 1 hour (daily automated snapshots + optional hourly logical dumps)
- **RTO:** 30 minutes

---

## Monitoring Quick Reference

| Endpoint                      | Purpose                    | Expected                        |
| ----------------------------- | -------------------------- | ------------------------------- |
| `GET /health`                 | Liveness + DB connectivity | `200 OK` with `{"status":"ok"}` |
| `GET /api/trpc/system.health` | tRPC health (shallow)      | `{"ok":true}`                   |

### Log Fields

All production logs are JSON. Key fields:

- `level` — log level
- `requestId` — correlation ID for request tracing
- `method`, `url`, `ip` — request metadata
- `err` — error object (if applicable)

### Redacted Fields

Sensitive data is automatically redacted:

- `req.headers.cookie`
- `req.headers.authorization`
- `password`, `keyHash`, `token`, `jwt`, `cookieSecret`, `databaseUrl`

---

## Escalation

| Severity                | Response Time | Action                 |
| ----------------------- | ------------- | ---------------------- |
| Critical (outage)       | 15 min        | Page on-call engineer  |
| High (degraded)         | 1 hour        | Notify team lead       |
| Medium (partial impact) | 4 hours       | Create ticket, monitor |
| Low (cosmetic)          | 24 hours      | Backlog                |
