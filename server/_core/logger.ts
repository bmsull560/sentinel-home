import pino from "pino";
import { ENV } from "./env";

/**
 * Pino logger configuration.
 * - In production: emit JSON with log level from env (default info)
 * - In development: pretty-print for readability
 * - Sensitive fields (cookie, authorization, jwt) are redacted
 */
export const logger = pino({
  level: ENV.isProduction ? (process.env.LOG_LEVEL ?? "info") : "debug",
  transport: ENV.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.headers['x-api-key']",
      "res.headers['set-cookie']",
      "password",
      "keyHash",
      "token",
      "jwt",
      "cookieSecret",
      "databaseUrl",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Child logger factory for request-bound logging.
 * Call once per incoming request and pass the child logger through context.
 */
export function getRequestLogger(
  requestId: string,
  req?: {
    method?: string;
    url?: string;
    ip?: string;
  }
) {
  return logger.child({
    requestId,
    ...(req?.method && { method: req.method }),
    ...(req?.url && { url: req.url }),
    ...(req?.ip && { ip: req.ip }),
  });
}
