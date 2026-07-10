import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestDatabase, stopTestDatabase } from "./setup";
import request from "supertest";
import express from "express";
import { collectHealthStatus } from "../_core/health";

describe("Health Endpoint Integration", () => {
  let connectionString: string;

  beforeAll(async () => {
    const result = await startTestDatabase();
    connectionString = result.connectionString;
    process.env.DATABASE_URL = connectionString;
  }, 120_000);

  afterAll(async () => {
    await stopTestDatabase();
  }, 120_000);

  it("returns 200 with full status when database is reachable", async () => {
    const app = express();
    app.get("/health", async (_req, res) => {
      const health = await collectHealthStatus();
      const statusCode =
        health.status === "ok" ? 200 : health.status === "degraded" ? 503 : 503;
      res.status(statusCode).json(health);
    });

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("connected");
    expect(res.body.redis).toBe("not_configured");
    expect(res.body.scheduler).toEqual(
      expect.objectContaining({
        started: expect.any(Boolean),
        isRunning: expect.any(Boolean),
        lastRunError: null,
      })
    );
  });
});
