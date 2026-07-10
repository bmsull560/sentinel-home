# Sentinel Home — Performance & SLOs

This document defines the performance expectations, scalability constraints, and
load-testing approach for Sentinel Home.

## Service Level Objectives (SLOs)

| SLO                           | Target        | Measurement                                        |
| ----------------------------- | ------------- | -------------------------------------------------- |
| Availability                  | 99.9% monthly | Uptime of the `/health` endpoint                   |
| API p99 latency               | < 500 ms      | tRPC/API requests excluding long-running ingestion |
| Health endpoint p99 latency   | < 100 ms      | `GET /health`                                      |
| Page load (production bundle) | < 2 s         | Time to First Byte + React hydration               |
| Ingestion pipeline            | < 30 min      | Full incremental NVD/KEV sync                      |

## Resource Expectations

| Resource          | Expected baseline | Notes                                            |
| ----------------- | ----------------- | ------------------------------------------------ |
| CPU               | 0.5–1 vCPU        | Spikes during ingestion and builds               |
| Memory            | 512 MB–1 GB       | Depends on Node heap and connection pools        |
| MySQL connections | 10                | Configured pool size; raise for high concurrency |
| Redis connections | 1–2               | Optional; used for shared rate limiting          |
| Disk              | Minimal           | Stateless app; static assets in container        |

## Scalability Constraints

- The application is **stateless** except for:
  - In-memory rate limiting (use `REDIS_URL` for multi-instance deployments)
  - The in-process cron scheduler (only one instance should run the scheduler
    in a multi-instance deployment)
- Horizontal scaling requires:
  - Redis-backed rate limiting (`REDIS_URL`)
  - A single scheduler instance or external job trigger
  - A managed MySQL database with sufficient connection capacity

## Load Testing

A minimal load test is provided in `scripts/load-test.js`. It hits `/health`
concurrently and reports latency percentiles.

### Run against a local server

```bash
pnpm start
# In another terminal
node scripts/load-test.js http://localhost:3000/health
```

### Interpreting results

The script reports:

- Total requests, errors, and requests per second
- Mean, p50, p95, p99, and max latency

Compare results against the SLOs above. If p99 health latency exceeds 100 ms,
investigate database connectivity, connection pool saturation, or CPU/memory
pressure.

## Tuning Guidance

- Increase the MySQL pool size in `server/db.ts` if the app exhausts
  connections under load.
- Enable Redis (`REDIS_URL`) before running more than one instance.
- For large ingestion datasets, set `NVD_API_KEY` to reduce rate-limit delays.
