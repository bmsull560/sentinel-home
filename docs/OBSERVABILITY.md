# Sentinel Home — Observability

This document describes the platform's observability surface: Prometheus metrics and OpenTelemetry traces.

## Prometheus metrics

The server exposes a `/metrics` endpoint (before rate limiting) that returns Prometheus text format.

Available metrics:

| Metric                          | Type      | Labels                      | Description                     |
| ------------------------------- | --------- | --------------------------- | ------------------------------- |
| `http_requests_total`           | Counter   | `method`, `route`, `status` | Total HTTP requests             |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status` | HTTP request latency            |
| `scheduler_runs_total`          | Counter   | `result`                    | Ingestion scheduler runs        |
| `ingestion_pipeline_runs_total` | Counter   | `result`                    | Pipeline runs triggered via API |

Scrape `http://<host>:<port>/metrics` from Prometheus or any compatible collector.

## Grafana dashboards and alerting

Version-controlled dashboards and alert rules live under `observability/`:

- `observability/grafana/dashboards/sentinel-home.json` — platform health, API performance, worker health, and database operations.
- `observability/prometheus/alerts.yml` — Prometheus alerting rules for error rates, latency, worker failures, resource pressure, and database strain.

Each alert specifies `severity`, `team`, `owner`, `runbook_url`, and `dashboard_url`. Import the dashboard into Grafana and apply the alert rules to your Prometheus ruler.

### Dashboard overview

| Section             | Coverage                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| Platform Health     | instance up, memory utilization, current error rate, P95 latency           |
| API Performance     | request rate by route, error rate by route, latency percentiles            |
| Worker Health       | scheduler and pipeline run rates/success                                   |
| Database Operations | notes on MySQL2 trace instrumentation and mysqld_exporter/cloud DB metrics |

### Active alerts

| Alert                                 | Severity | Trigger                        | Owner   |
| ------------------------------------- | -------- | ------------------------------ | ------- |
| `SentinelHomeHighErrorRate`           | critical | 5xx rate > 5% for 5m           | sre     |
| `SentinelHomeHighLatency`             | warning  | P95 latency > 500ms for 5m     | backend |
| `SentinelHomeInstanceDown`            | critical | `up == 0` for 1m               | sre     |
| `SentinelHomeSchedulerFailures`       | warning  | scheduler errors in last 15m   | backend |
| `SentinelHomePipelineFailures`        | warning  | pipeline errors in last 15m    | backend |
| `SentinelHomeHighMemoryUsage`         | warning  | memory > 85% for 5m            | sre     |
| `SentinelHomeEventLoopLag`            | critical | event loop lag > 100ms for 2m  | backend |
| `SentinelHomeDatabaseConnectionsHigh` | warning  | MySQL connections > 80% of max | dba     |
| `SentinelHomeDatabaseSlowQueries`     | warning  | slow query rate > 0.1/s for 5m | dba     |

Update the `dashboard_url` annotations in `observability/prometheus/alerts.yml` to point at your Grafana deployment.

## OpenTelemetry tracing

Distributed tracing is initialized in `server/_core/index.ts` before Express and MySQL are imported, ensuring HTTP requests and database queries are automatically instrumented.

### Instrumented components

- **HTTP** — incoming and outgoing HTTP requests via `@opentelemetry/instrumentation-http`
- **Express** — route handling and middleware via `@opentelemetry/instrumentation-express`
- **MySQL2** — query spans via `@opentelemetry/instrumentation-mysql2`

### Configuration

| Environment variable          | Default         | Description                                                 |
| ----------------------------- | --------------- | ----------------------------------------------------------- |
| `OTEL_SERVICE_NAME`           | `sentinel-home` | Service name attached to every trace                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | —               | OTLP/HTTP collector endpoint (e.g. `http://localhost:4318`) |
| `OTEL_SDK_DISABLED`           | `false`         | Set to `true` to disable the OpenTelemetry SDK entirely     |
| `OTEL_TRACES_SAMPLER`         | —               | Standard sampler name (e.g. `parentbased_traceidratio`)     |
| `OTEL_TRACES_SAMPLER_ARG`     | —               | Sampler argument (e.g. `0.1` for 10% sampling)              |

The SDK reads `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG` automatically. In production, configure a ratio sampler to control cost; in development, leave unset or use `always_on`.

### Trace/log correlation

`server/_core/requestContext.ts` injects `traceId` and `spanId` into every request-bound Pino child logger, so logs can be correlated with traces in your observability backend.

### Manual spans

Use the `withSpan` helper to instrument synchronous or asynchronous work:

```ts
import { withSpan } from "./_core/tracing";

await withSpan("ingestion.enrich", async span => {
  span.setAttribute("cve.count", cveCount);
  await enrichCves(cves);
});
```

Errors are recorded as span exception events and the span status is set to `Error`.

### Sensitive data

The instrumentation is configured to **not** capture request/response bodies, headers, cookies, authorization tokens, or SQL statement text. Only safe metadata such as HTTP method, route, and status code is recorded.

### Fail-safe behavior

If the OTLP collector is unreachable, the exporter logs the failure but the application continues to serve requests. Set `OTEL_SDK_DISABLED=true` to bypass tracing initialization entirely.

### Local verification

```bash
# Run unit tests covering context propagation and error capture
pnpm test -- server/_core/tracing.test.ts

# Type check
pnpm check

# Build production bundle
pnpm build
```

## Future work

- Add trace instrumentation for the `node-cron` scheduler and external API clients (`axios`, `openai`).
- Add OpenTelemetry metrics alongside Prometheus counters/histograms.
- Export logs via OTLP for centralized log/trace correlation.
