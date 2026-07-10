import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { context } from "@opentelemetry/api";
import { withSpan, getTraceContext, shutdownTracing } from "./tracing";

const provider = new BasicTracerProvider();
const memoryExporter = new InMemorySpanExporter();

provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
provider.register();

const contextManager = new AsyncLocalStorageContextManager();
context.setGlobalContextManager(contextManager);
contextManager.enable();

describe("tracing", () => {
  beforeEach(() => {
    memoryExporter.reset();
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  it("propagates trace context through async work", async () => {
    const parentCtx = getTraceContext();
    expect(parentCtx).toBeUndefined();

    await withSpan("parent", async parentSpan => {
      const parentTraceId = parentSpan.spanContext().traceId;
      expect(parentTraceId).toMatch(/^[a-f0-9]{32}$/);

      await withSpan("child", async childSpan => {
        const childCtx = getTraceContext();
        expect(childCtx).toBeDefined();
        expect(childCtx!.traceId).toBe(parentTraceId);
        expect(childCtx!.spanId).toBe(childSpan.spanContext().spanId);
      });
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans).toHaveLength(2);

    const parent = spans.find(s => s.name === "parent")!;
    const child = spans.find(s => s.name === "child")!;

    expect(parent.traceId).toBe(child.traceId);
    expect(child.parentSpanId).toBe(parent.spanContext().spanId);
  });

  it("records errors without throwing away the original exception", async () => {
    await expect(
      withSpan("failing", async () => {
        await Promise.resolve();
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const spans = memoryExporter.getFinishedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.name).toBe("failing");
    expect(span.status.code).toBe(2); // ERROR
    expect(span.events.some(e => e.name === "exception")).toBe(true);
  });
});
