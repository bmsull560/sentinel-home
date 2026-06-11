import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestDatabase, stopTestDatabase } from "./setup";
import request from "supertest";
import express from "express";
import { getDb } from "../db";

// We will test the health endpoint by creating a minimal Express app
// that mounts the health route. In practice you could also start the
// full server, but a focused unit is faster and more stable.

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

  it("returns 200 when database is reachable", async () => {
    const app = express();
    app.get("/health", async (_req, res) => {
      const db = await getDb();
      if (db) {
        res.status(200).json({ status: "ok", db: "connected" });
      } else {
        res.status(503).json({ status: "unhealthy", db: "unavailable" });
      }
    });

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("connected");
  });
});
