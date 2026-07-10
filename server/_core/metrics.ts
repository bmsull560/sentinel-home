import {
  Counter,
  Histogram,
  register,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Prometheus metrics registry and helpers.
 *
 * Exposes:
 *   - http_requests_total{method, route, status}
 *   - http_request_duration_seconds{method, route, status}
 *   - scheduler_runs_total{result}
 *   - ingestion_pipeline_runs_total{result}
 *
 * Mount /metrics before rate limiting so scrapers can reach it cheaply.
 */

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const schedulerRunsTotal = new Counter({
  name: "scheduler_runs_total",
  help: "Total number of ingestion scheduler runs",
  labelNames: ["result"],
});

export const ingestionPipelineRunsTotal = new Counter({
  name: "ingestion_pipeline_runs_total",
  help: "Total number of ingestion pipeline runs triggered via API",
  labelNames: ["result"],
});

export { register };
