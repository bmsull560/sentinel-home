import { describe, it, expect, vi, beforeEach } from "vitest";
import { collectHealthStatus } from "./health";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./redis", () => ({
  getRedis: vi.fn(),
}));

vi.mock("../intelligence/scheduler", () => ({
  getSchedulerState: vi.fn(),
}));

import { getDb } from "../db";
import { getRedis } from "./redis";
import { getSchedulerState } from "../intelligence/scheduler";

const mockedGetDb = vi.mocked(getDb);
const mockedGetRedis = vi.mocked(getRedis);
const mockedGetSchedulerState = vi.mocked(getSchedulerState);

describe("collectHealthStatus", () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
    mockedGetRedis.mockReset();
    mockedGetSchedulerState.mockReset();

    mockedGetSchedulerState.mockReturnValue({
      isRunning: false,
      lastRunAt: null,
      lastRunResult: null,
      lastRunError: null,
      nextRunAt: null,
      totalRuns: 0,
      totalErrors: 0,
      startedAt: new Date(),
    });
  });

  it("returns ok when database is reachable and redis is not configured", async () => {
    mockedGetDb.mockResolvedValue({} as any);
    mockedGetRedis.mockReturnValue(null);

    const health = await collectHealthStatus();

    expect(health.status).toBe("ok");
    expect(health.db).toBe("connected");
    expect(health.redis).toBe("not_configured");
    expect(health.scheduler.started).toBe(true);
  });

  it("returns degraded when database is reachable but redis ping fails", async () => {
    mockedGetDb.mockResolvedValue({} as any);
    const redisClient = {
      ping: vi.fn().mockRejectedValue(new Error("timeout")),
    };
    mockedGetRedis.mockReturnValue(redisClient as any);

    const health = await collectHealthStatus();

    expect(health.status).toBe("degraded");
    expect(health.db).toBe("connected");
    expect(health.redis).toBe("unavailable");
  });

  it("returns unhealthy when database is unreachable", async () => {
    mockedGetDb.mockResolvedValue(null);
    mockedGetRedis.mockReturnValue(null);

    const health = await collectHealthStatus();

    expect(health.status).toBe("unhealthy");
    expect(health.db).toBe("unavailable");
  });
});
