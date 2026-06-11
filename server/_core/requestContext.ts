import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import type { Logger } from "pino";
import { getRequestLogger } from "./logger";

/**
 * AsyncLocalStorage for request-scoped context.
 * Holds requestId and logger so they are available anywhere in the call stack
 * without passing them through every function signature.
 */
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  logger: Logger;
}>();

/**
 * Express middleware that assigns a trace ID to every request and stores
 * a child logger in AsyncLocalStorage.
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId =
    (req.headers["x-request-id"] as string) ??
    req.get("x-request-id") ??
    nanoid(12);

  // Expose requestId on the request object for convenience
  (req as any).requestId = requestId;

  // Set response header so clients can correlate logs
  res.setHeader("x-request-id", requestId);

  const logger = getRequestLogger(requestId, {
    method: req.method,
    url: req.url,
    ip: req.ip ?? req.socket.remoteAddress,
  });

  requestContext.run({ requestId, logger }, () => {
    next();
  });
}
