#!/usr/bin/env tsx
/**
 * Database Migration Runner
 *
 * Runs drizzle-kit migrate before server startup.
 * Exits with code 1 if migrations fail.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

try {
  console.log("[Migrate] Running database migrations...");
  execSync("drizzle-kit migrate", {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
  console.log("[Migrate] Migrations complete.");
} catch (err) {
  console.error("[Migrate] Migration failed:", err);
  process.exit(1);
}
