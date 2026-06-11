import Redis from "ioredis";
import { ENV } from "./env";
import { logger } from "./logger";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!_redis && ENV.redisUrl) {
    try {
      _redis = new Redis(ENV.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      _redis.on("error", err => {
        logger.warn({ err }, "[Redis] Connection error");
      });

      _redis.on("connect", () => {
        logger.info("[Redis] Connected");
      });

      logger.info("[Redis] Client initialized");
    } catch (err) {
      logger.error({ err }, "[Redis] Failed to initialize client");
      _redis = null;
    }
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    logger.info("[Redis] Connection closed");
  }
}
