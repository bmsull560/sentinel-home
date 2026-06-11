/**
 * Ingestion Scheduler
 *
 * Runs the NVD/CISA KEV ingestion pipeline on a recurring cron schedule.
 * Default cadence: every 6 hours at UTC 00:00, 06:00, 12:00, 18:00.
 *
 * Design principles:
 *  - Mutex guard: only one run at a time via `isRunning` flag
 *  - noOverlap: node-cron built-in overlap protection as a second safety net
 *  - Graceful shutdown: stops the task on SIGTERM / SIGINT
 *  - Exposes runtime state for the Intelligence UI (next-run time, last result)
 *  - Every lifecycle event is logged with ISO timestamps for observability
 */

import { schedule, type ScheduledTask } from "node-cron";
import {
  runIngestionPipeline,
  type IngestionResult,
} from "./ingestionPipeline";

// ─── State ────────────────────────────────────────────────────────────────────

export interface SchedulerState {
  isRunning: boolean;
  lastRunAt: Date | null;
  lastRunResult: IngestionResult | null;
  lastRunError: string | null;
  nextRunAt: Date | null;
  totalRuns: number;
  totalErrors: number;
  startedAt: Date | null;
}

const state: SchedulerState = {
  isRunning: false,
  lastRunAt: null,
  lastRunResult: null,
  lastRunError: null,
  nextRunAt: null,
  totalRuns: 0,
  totalErrors: 0,
  startedAt: null,
};

let scheduledTask: ScheduledTask | null = null;

// ─── Cron Expression ──────────────────────────────────────────────────────────

/**
 * Standard 5-field cron: minute hour day month weekday
 * "0 * /6 * * *" — at minute 0, every 6th hour, every day
 */
const CRON_EXPRESSION = "0 */6 * * *";

/** Compute the wall-clock time of the next 6-hour boundary in UTC. */
function computeNextRunAt(): Date {
  const now = new Date();
  const currentHourUtc = now.getUTCHours();
  const hoursUntilNext = 6 - (currentHourUtc % 6);
  const next = new Date(now);
  next.setUTCHours(currentHourUtc + hoursUntilNext, 0, 0, 0);
  return next;
}

// ─── Core Runner ──────────────────────────────────────────────────────────────

async function executeIngestion(): Promise<void> {
  if (state.isRunning) {
    console.log("[Scheduler] Skipping — previous run still in progress");
    return;
  }

  state.isRunning = true;
  state.lastRunAt = new Date();
  state.lastRunError = null;
  state.totalRuns++;

  console.log(
    `[Scheduler] ▶ Run #${state.totalRuns} started at ${state.lastRunAt.toISOString()}`
  );

  try {
    const result = await runIngestionPipeline({
      mode: "incremental",
      onProgress: (stage: string, detail: string) => {
        console.log(`[Scheduler]   ${stage}: ${detail}`);
      },
    });

    state.lastRunResult = result;
    state.nextRunAt = computeNextRunAt();

    console.log(
      `[Scheduler] ✓ Run #${state.totalRuns} complete — ` +
        `CVEs fetched: ${result.cvesFetched}, ` +
        `inserted: ${result.cvesInserted}, ` +
        `updated: ${result.cvesUpdated}, ` +
        `KEV entries: ${result.kevEntriesUpserted}, ` +
        `matches: ${result.matchesCreated}, ` +
        `alerts: ${result.alertsGenerated}, ` +
        `duration: ${(result.durationMs / 1000).toFixed(1)}s`
    );
    console.log(`[Scheduler] ⏰ Next run at ${state.nextRunAt.toISOString()}`);
  } catch (err) {
    state.totalErrors++;
    const message = err instanceof Error ? err.message : String(err);
    state.lastRunError = message;
    console.error(`[Scheduler] ✗ Run #${state.totalRuns} failed: ${message}`);
  } finally {
    state.isRunning = false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the cron scheduler. Safe to call multiple times — duplicate calls
 * are silently ignored if the task is already running.
 */
export function startScheduler(): void {
  if (scheduledTask) {
    console.log("[Scheduler] Already running — ignoring duplicate start");
    return;
  }

  state.startedAt = new Date();
  state.nextRunAt = computeNextRunAt();

  console.log(
    `[Scheduler] Initializing — expression: "${CRON_EXPRESSION}" (every 6 hours UTC)`
  );
  console.log(
    `[Scheduler] First automatic run at ${state.nextRunAt.toISOString()}`
  );

  scheduledTask = schedule(CRON_EXPRESSION, executeIngestion, {
    timezone: "UTC",
    noOverlap: true,
  });

  console.log("[Scheduler] ✓ Cron task registered");
}

/**
 * Stop the cron scheduler gracefully.
 */
export function stopScheduler(): void {
  if (!scheduledTask) return;
  scheduledTask.stop();
  scheduledTask = null;
  console.log("[Scheduler] Stopped");
}

/**
 * Trigger an immediate ingestion run outside the cron schedule.
 * Called by the tRPC `intelligence.triggerIngestion` procedure so the user
 * can kick off a run from the Intelligence UI without waiting for the cron.
 */
export async function triggerManualRun(): Promise<IngestionResult | null> {
  await executeIngestion();
  return state.lastRunResult;
}

/**
 * Return a snapshot of the current scheduler state.
 * Called by the tRPC `intelligence.schedulerStatus` procedure.
 */
export function getSchedulerState(): SchedulerState {
  return { ...state };
}

/**
 * Reset all scheduler state to initial values.
 * Exported for test isolation only — do not call in production code.
 */
export function _resetSchedulerStateForTests(): void {
  state.isRunning = false;
  state.lastRunAt = null;
  state.lastRunResult = null;
  state.lastRunError = null;
  state.nextRunAt = null;
  state.totalRuns = 0;
  state.totalErrors = 0;
  state.startedAt = null;
  scheduledTask = null;
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("[Scheduler] SIGTERM — stopping cron task");
  stopScheduler();
});

process.on("SIGINT", () => {
  console.log("[Scheduler] SIGINT — stopping cron task");
  stopScheduler();
});
