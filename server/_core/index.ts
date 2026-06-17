import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startScheduler, stopScheduler } from "../intelligence/scheduler";
import { ENV } from "./env";
import { logger } from "./logger";
import { requestContextMiddleware } from "./requestContext";
import { getDb } from "../db";
import { getRedis } from "./redis";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy when behind a reverse proxy in production
  if (ENV.isProduction) {
    app.set("trust proxy", 1);
  }

  // Request context / trace ID (must be early)
  app.use(requestContextMiddleware);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://forge.manus.im"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: ENV.isProduction ? false : true,
      credentials: true,
    })
  );

  // Health check (before rate limiting so load balancers can always reach it)
  app.get("/health", async (_req, res) => {
    const db = await getDb();
    if (db) {
      res.status(200).json({
        status: "ok",
        db: "connected",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "unhealthy",
        db: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Rate limiting — use Redis store when available, otherwise memory
  const redisClient = getRedis();
  let limiterStore: any = undefined;
  if (redisClient) {
    const { RedisStore } = await import("rate-limit-redis");
    limiterStore = new RedisStore({
      sendCommand: (...args: string[]) => (redisClient as any).call(...args),
    });
    logger.info("[RateLimit] Using Redis store");
  } else {
    logger.info(
      "[RateLimit] Using in-memory store (consider REDIS_URL for multi-instance deployments)"
    );
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: limiterStore,
    skip: req =>
      req.path === "/api/trpc/system.health" || req.path === "/health",
  });
  app.use(limiter);

  // Stricter rate limit for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    store: limiterStore,
  });
  app.use("/api/oauth", authLimiter);

  // Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Development: Vite dev middleware
  // Production: static files from dist/public/
  if (process.env.VITE_DEV === "true") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.info(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const httpServer = server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    // Start the NVD/CISA KEV ingestion cron scheduler after the server is ready
    startScheduler();
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`[Server] ${signal} received, shutting down gracefully...`);
    stopScheduler();
    httpServer.close(() => {
      logger.info("[Server] HTTP server closed");
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error("[Server] Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(err => {
  logger.error({ err }, "[Server] Fatal error starting server");
  process.exit(1);
});
