/**
 * Generic retry helper with exponential backoff for transient failures.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryable?: (error: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isNetworkError(error: unknown): boolean {
  if (error == null) return false;
  const e = error as any;
  if (e.code === "ECONNRESET") return true;
  if (e.code === "ETIMEDOUT") return true;
  if (e.code === "ENOTFOUND") return true;
  if (e.code === "ECONNREFUSED") return true;
  if (typeof e.status === "number" && e.status >= 500) return true;
  if (
    typeof e.message === "string" &&
    e.message.toLowerCase().includes("timeout")
  )
    return true;
  return false;
}

/**
 * Execute an async function with exponential backoff retries.
 *
 * Defaults:
 *   - maxRetries: 3
 *   - baseDelayMs: 250
 *   - maxDelayMs: 10_000
 *   - retryable: network/5xx/timeout errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const retryable = options.retryable ?? isNetworkError;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !retryable(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}
