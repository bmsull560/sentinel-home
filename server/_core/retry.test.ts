import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: "ECONNRESET" })
      .mockRejectedValueOnce({ code: "ETIMEDOUT" })
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting retries", async () => {
    const error = { code: "ECONNRESET" };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 })
    ).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("bad request"));
    await expect(withRetry(fn)).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
