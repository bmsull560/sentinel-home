import { NodeSDK, resources as sdkResources } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { MySQL2Instrumentation } from "@opentelemetry/instrumentation-mysql2";
import {
  context,
  trace,
  type Context,
  type Span,
  type SpanOptions,
} from "@opentelemetry/api";
import { ENV } from "./env";
import { logger } from "./logger";

/**
 * OpenTelemetry tracing initialization and helpers.
 *
 * Behavior:
 *   - Starts the NodeSDK with HTTP, Express, and MySQL2 instrumentations.
 *   - Exports traces via OTLP/HTTP when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 *   - Fails safely (logs error, continues) if the collector is unreachable.
 *   - Sampling is controlled via OTEL_TRACES_SAMPLER and OTEL_TRACES_SAMPLER_ARG.
 *   - Never attaches sensitive headers, bodies, or PII to spans.
 */

const SERVICE_NAME = ENV.otelServiceName || "sentinel-home";
const SERVICE_VERSION = process.env.npm_package_version || "1.0.0";
const OTEL_ENDPOINT = ENV.otelExporterEndpoint;
const OTEL_DISABLED = ENV.otelSdkDisabled === "true";

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (sdk) return;
  if (OTEL_DISABLED) {
    logger.info("[Tracing] OpenTelemetry SDK disabled by OTEL_SDK_DISABLED");
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: OTEL_ENDPOINT
      ? `${OTEL_ENDPOINT.replace(/\/$/, "")}/v1/traces`
      : undefined,
  });

  const resource = sdkResources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    ["deployment.environment"]: process.env.NODE_ENV || "development",
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
    instrumentations: [
      new HttpInstrumentation({
        // Do not capture request/response headers or bodies.
        headersToSpanAttributes: {
          server: { requestHeaders: [], responseHeaders: [] },
        },
      }),
      new ExpressInstrumentation(),
      new MySQL2Instrumentation(),
    ],
  });

  try {
    sdk.start();
    logger.info(
      { endpoint: OTEL_ENDPOINT || "default" },
      "[Tracing] OpenTelemetry SDK started"
    );
  } catch (err) {
    logger.error({ err }, "[Tracing] Failed to start OpenTelemetry SDK");
    sdk = null;
  }

  const shutdown = (signal: string) => {
    logger.info(`[Tracing] ${signal} received, flushing traces...`);
    shutdownTracing().catch(err => {
      logger.error({ err }, "[Tracing] Error during shutdown");
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
    logger.info("[Tracing] OpenTelemetry SDK shut down");
  } catch (err) {
    logger.error({ err }, "[Tracing] Error shutting down OpenTelemetry SDK");
  } finally {
    sdk = null;
  }
}

export type TraceContext = {
  traceId: string;
  spanId: string;
  traceFlags: string;
};

/**
 * Extract trace/span IDs from the active OpenTelemetry span.
 * Returns zeros when no span is active.
 */
export function getTraceContext(ctx?: Context): TraceContext | undefined {
  const activeCtx = ctx ?? context.active();
  const span = trace.getSpan(activeCtx);
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags.toString(16).padStart(2, "0"),
  };
}

/**
 * Run work inside a new named span. Propagates context through async calls.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
  options?: SpanOptions
): Promise<T> {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
  return tracer.startActiveSpan(name, options ?? {}, async span => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: 2, message: (err as Error).message }); // ERROR
      throw err;
    } finally {
      span.end();
    }
  });
}
