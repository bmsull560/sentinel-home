#!/usr/bin/env node
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
const drizzleKitPath = path.join(
  rootDir,
  "node_modules",
  ".bin",
  "drizzle-kit"
);

console.log("[Migrate] Running database migrations...");
try {
  execSync(drizzleKitPath, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
  console.log("[Migrate] Migrations complete.");
} catch (err) {
  console.error("[Migrate] Migration failed:", err);
  process.exit(1);
}
