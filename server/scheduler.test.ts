/**
 * Tests for the ingestion scheduler module.
 *
 * We mock `runIngestionPipeline` so tests run instantly without
 * hitting the network or database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoist mock variables so vi.mock factories can reference them ─────────────

const { mockStop, mockSchedule, mockResult } = vi.hoisted(() => {
  const mockStop = vi.fn();
  const mockSchedule = vi.fn().mockReturnValue({ stop: mockStop });
  const mockResult = {
    runId: 1,
    cvesFetched: 42,
    cvesInserted: 10,
    cvesUpdated: 5,
    kevEntriesUpserted: 3,
    matchesCreated: 7,
    alertsGenerated: 2,
    durationMs: 1234,
  };
  return { mockStop, mockSchedule, mockResult };
});

// ─── Mock the ingestion pipeline ─────────────────────────────────────────────

vi.mock("./intelligence/ingestionPipeline", () => ({
  runIngestionPipeline: vi.fn().mockResolvedValue(mockResult),
}));

// ─── Mock node-cron so no real timers fire ────────────────────────────────────

vi.mock("node-cron", () => ({
  schedule: mockSchedule,
}));

// ─── Import after mocks are set up ───────────────────────────────────────────

import {
  startScheduler,
  stopScheduler,
  triggerManualRun,
  getSchedulerState,
  _resetSchedulerStateForTests,
} from "./intelligence/scheduler";

import { runIngestionPipeline } from "./intelligence/ingestionPipeline";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Ingestion Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Fully reset module-level state (counters, timestamps, task ref) between tests
    _resetSchedulerStateForTests();
    // Re-apply the default mock return value after clearAllMocks
    (mockSchedule as ReturnType<typeof vi.fn>).mockReturnValue({ stop: mockStop });
    (runIngestionPipeline as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
  });

  afterEach(() => {
    _resetSchedulerStateForTests();
  });

  // ── startScheduler ──────────────────────────────────────────────────────────

  describe("startScheduler()", () => {
    it("registers a cron task with the correct expression", () => {
      startScheduler();
      expect(mockSchedule).toHaveBeenCalledOnce();
      const [expression, , options] = mockSchedule.mock.calls[0];
      expect(expression).toBe("0 */6 * * *");
      expect(options).toMatchObject({ timezone: "UTC", noOverlap: true });
    });

    it("sets startedAt and nextRunAt in state", () => {
      const before = Date.now();
      startScheduler();
      const state = getSchedulerState();
      expect(state.startedAt).not.toBeNull();
      expect(state.startedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(state.nextRunAt).not.toBeNull();
    });

    it("does not register a second cron task if called twice", () => {
      startScheduler();
      startScheduler(); // duplicate call
      expect(mockSchedule).toHaveBeenCalledOnce();
    });
  });

  // ── stopScheduler ───────────────────────────────────────────────────────────

  describe("stopScheduler()", () => {
    it("calls stop() on the scheduled task", () => {
      startScheduler();
      stopScheduler();
      expect(mockStop).toHaveBeenCalledOnce();
    });

    it("is safe to call when no task is running", () => {
      expect(() => stopScheduler()).not.toThrow();
    });

    it("allows startScheduler to create a new task after stop", () => {
      startScheduler();
      stopScheduler();
      startScheduler();
      expect(mockSchedule).toHaveBeenCalledTimes(2);
    });
  });

  // ── triggerManualRun ────────────────────────────────────────────────────────

  describe("triggerManualRun()", () => {
    it("calls runIngestionPipeline with incremental mode", async () => {
      await triggerManualRun();
      expect(runIngestionPipeline).toHaveBeenCalledOnce();
      const [opts] = (runIngestionPipeline as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(opts.mode).toBe("incremental");
    });

    it("returns the pipeline result", async () => {
      const result = await triggerManualRun();
      expect(result).toEqual(mockResult);
    });

    it("updates scheduler state after a successful run", async () => {
      await triggerManualRun();
      const state = getSchedulerState();
      expect(state.totalRuns).toBe(1);
      expect(state.totalErrors).toBe(0);
      expect(state.lastRunResult).toEqual(mockResult);
      expect(state.lastRunError).toBeNull();
      expect(state.lastRunAt).not.toBeNull();
    });

    it("increments totalErrors and sets lastRunError on failure", async () => {
      (runIngestionPipeline as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("NVD API timeout")
      );
      await triggerManualRun();
      const state = getSchedulerState();
      expect(state.totalErrors).toBe(1);
      expect(state.lastRunError).toBe("NVD API timeout");
    });

    it("resets isRunning to false after completion", async () => {
      await triggerManualRun();
      expect(getSchedulerState().isRunning).toBe(false);
    });

    it("resets isRunning to false even after a failure", async () => {
      (runIngestionPipeline as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("timeout")
      );
      await triggerManualRun();
      expect(getSchedulerState().isRunning).toBe(false);
    });
  });

  // ── getSchedulerState ───────────────────────────────────────────────────────

  describe("getSchedulerState()", () => {
    it("returns a snapshot (not a live reference)", async () => {
      await triggerManualRun();
      const snap1 = getSchedulerState();
      await triggerManualRun();
      const snap2 = getSchedulerState();
      // snap1 should still reflect 1 run, snap2 should reflect 2
      expect(snap1.totalRuns).toBe(1);
      expect(snap2.totalRuns).toBe(2);
    });

    it("initial state has sensible zero values", () => {
      const state = getSchedulerState();
      expect(state.isRunning).toBe(false);
      expect(state.totalRuns).toBe(0);
      expect(state.totalErrors).toBe(0);
      expect(state.lastRunAt).toBeNull();
      expect(state.lastRunResult).toBeNull();
      expect(state.lastRunError).toBeNull();
    });
  });

  // ── mutex guard ─────────────────────────────────────────────────────────────

  describe("mutex guard (concurrent run protection)", () => {
    it("skips a second concurrent trigger while one is already running", async () => {
      // Make the first run take a tick
      let resolveFirst!: () => void;
      (runIngestionPipeline as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(
          () => new Promise<typeof mockResult>((res) => {
            resolveFirst = () => res(mockResult);
          })
        );

      // Start first run (don't await yet)
      const first = triggerManualRun();

      // Immediately trigger second — should be skipped
      const second = triggerManualRun();

      // Resolve the first run
      resolveFirst();
      await first;
      await second;

      // Pipeline should only have been called once (second was skipped)
      expect(runIngestionPipeline).toHaveBeenCalledOnce();
    });
  });
});
