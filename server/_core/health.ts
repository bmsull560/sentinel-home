import { getDb } from "../db";
import { getRedis } from "./redis";
import { getSchedulerState } from "../intelligence/scheduler";

export interface HealthStatus {
  status: "ok" | "degraded" | "unhealthy";
  db: "connected" | "unavailable";
  redis: "connected" | "unavailable" | "not_configured";
  scheduler: {
    started: boolean;
    isRunning: boolean;
    lastRunError: string | null;
  };
  timestamp: string;
}

/**
 * Collect system health. Returns:
 *   - "ok" if the database is reachable
 *   - "degraded" if DB is up but Redis is configured and unreachable
 *   - "unhealthy" if the database is unreachable
 */
export async function collectHealthStatus(): Promise<HealthStatus> {
  const dbClient = await getDb();
  const dbHealthy = dbClient !== null;

  let redisStatus: HealthStatus["redis"] = "not_configured";
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await redisClient.ping();
      redisStatus = "connected";
    } catch {
      redisStatus = "unavailable";
    }
  }

  const schedulerState = getSchedulerState();

  let status: HealthStatus["status"] = "ok";
  if (!dbHealthy) {
    status = "unhealthy";
  } else if (redisStatus === "unavailable") {
    status = "degraded";
  }

  return {
    status,
    db: dbHealthy ? "connected" : "unavailable",
    redis: redisStatus,
    scheduler: {
      started: schedulerState.startedAt !== null,
      isRunning: schedulerState.isRunning,
      lastRunError: schedulerState.lastRunError,
    },
    timestamp: new Date().toISOString(),
  };
}
