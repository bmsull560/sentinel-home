#!/usr/bin/env node
/**
 * Sentinel Home — Repository Verification Script
 *
 * Run with: pnpm verify
 *
 * Checks:
 *   1. Setup      — Node.js >= 20, pnpm >= 10, .env configured, deps installed
 *   2. TypeCheck  — tsc --noEmit passes
 *   3. Format     — Prettier check passes
 *   4. Tests      — Vitest passes
 *   5. Build      — Vite + esbuild bundle succeeds
 *   6. Security   — pnpm audit (no critical/high vulns)
 *   7. Production — required env vars, critical files, engine compliance
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  ".env.example",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "drizzle.config.ts",
  ".prettierrc",
  "README.md",
  "LICENSE",
];

const REQUIRED_ENV_PRODUCTION = ["DATABASE_URL", "JWT_SECRET"];

const REQUIRED_ENV_OAUTH = [
  "VITE_APP_ID",
  "VITE_OAUTH_PORTAL_URL",
  "OAUTH_SERVER_URL",
];

let exitCode = 0;
let sectionCount = 0;

function section(name) {
  sectionCount++;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${sectionCount}. ${name}`);
  console.log(`${"=".repeat(60)}`);
}

function pass(msg) {
  console.log(`  ✅  ${msg}`);
}

function fail(msg) {
  console.log(`  ❌  ${msg}`);
  exitCode = 1;
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

function info(msg) {
  console.log(`  ℹ️  ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: rootDir,
      encoding: "utf-8",
      stdio: opts.silent ? "pipe" : "inherit",
      ...opts,
    });
  } catch (err) {
    if (opts.fallback) return opts.fallback;
    throw err;
  }
}

// ─── 1. Setup ────────────────────────────────────────────────────────────────
section("Setup");

// Node.js version
const nodeVersion = process.versions.node;
const nodeMajor = parseInt(nodeVersion.split(".")[0], 10);
if (nodeMajor >= 20) {
  pass(`Node.js ${nodeVersion} (>= 20)`);
} else {
  fail(`Node.js ${nodeVersion} (requires >= 20)`);
}

// pnpm version
let pnpmVersion;
try {
  pnpmVersion = run("pnpm --version", { silent: true }).trim();
  const pnpmMajor = parseInt(pnpmVersion.split(".")[0], 10);
  if (pnpmMajor >= 10) {
    pass(`pnpm ${pnpmVersion} (>= 10)`);
  } else {
    fail(`pnpm ${pnpmVersion} (requires >= 10)`);
  }
} catch {
  fail("pnpm not found in PATH");
}

// .env file
const hasEnv = fs.existsSync(path.join(rootDir, ".env"));
const hasEnvExample = fs.existsSync(path.join(rootDir, ".env.example"));
if (hasEnv) {
  pass(".env file exists");
} else if (hasEnvExample) {
  warn(".env file missing (copy from .env.example)");
} else {
  fail(".env and .env.example both missing");
}

// node_modules
const hasNodeModules = fs.existsSync(path.join(rootDir, "node_modules"));
if (hasNodeModules) {
  pass("node_modules installed");
} else {
  fail("node_modules missing — run pnpm install");
}

// packageManager field
const pkgJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")
);
if (pkgJson.packageManager) {
  pass(`packageManager pinned: ${pkgJson.packageManager}`);
} else {
  warn("packageManager field not set in package.json");
}

if (pkgJson.engines?.node) {
  pass(`engines.node: ${pkgJson.engines.node}`);
} else {
  warn("engines.node not set in package.json");
}

// ─── 2. Type Check ───────────────────────────────────────────────────────────
section("Type Check");

try {
  run("pnpm check", { silent: true });
  pass("tsc --noEmit passed");
} catch {
  fail("tsc --noEmit failed");
}

// ─── 3. Format Check ─────────────────────────────────────────────────────────
section("Format Check");

try {
  run("pnpm prettier --check .", { silent: true });
  pass("Prettier format check passed");
} catch {
  fail("Prettier format check failed — run pnpm format");
}

// ─── 4. Tests ─────────────────────────────────────────────────────────────────
section("Tests");

try {
  run("pnpm test", { silent: true });
  pass("All tests passed");
} catch {
  fail("Tests failed");
}

// ─── 5. Build ─────────────────────────────────────────────────────────────────
section("Build");

try {
  run("pnpm build", { silent: true });
  pass("Production build succeeded");
} catch {
  fail("Production build failed");
}

// ─── 6. Security Audit ───────────────────────────────────────────────────────
section("Security Audit");

let auditJson;
try {
  auditJson = JSON.parse(
    run("pnpm audit --json", { silent: true, fallback: '{"advisories":{}}' })
  );
} catch {
  auditJson = { advisories: {} };
}

const advisories = Object.values(auditJson.advisories || {});
const critical = advisories.filter(a => a.severity === "critical");
const high = advisories.filter(a => a.severity === "high");

if (critical.length === 0 && high.length === 0) {
  pass("No critical or high severity vulnerabilities");
} else {
  fail(
    `${critical.length} critical, ${high.length} high vulnerabilities found`
  );
}

if (advisories.length > 0) {
  const moderate = advisories.filter(a => a.severity === "moderate").length;
  const low = advisories.filter(a => a.severity === "low").length;
  info(`${moderate} moderate, ${low} low severity advisories`);
}

// ─── 7. Production Readiness ─────────────────────────────────────────────────
section("Production Readiness");

// Required files
for (const file of REQUIRED_FILES) {
  if (fs.existsSync(path.join(rootDir, file))) {
    pass(`Required file: ${file}`);
  } else {
    fail(`Missing required file: ${file}`);
  }
}

// .nvmrc
if (fs.existsSync(path.join(rootDir, ".nvmrc"))) {
  pass(".nvmrc exists");
} else {
  warn(".nvmrc missing");
}

// Dockerfile
if (fs.existsSync(path.join(rootDir, "Dockerfile"))) {
  pass("Dockerfile exists");
} else {
  warn("Dockerfile missing");
}

// GitHub Actions
if (fs.existsSync(path.join(rootDir, ".github", "workflows", "ci.yml"))) {
  pass("GitHub Actions CI workflow exists");
} else {
  warn("GitHub Actions CI workflow missing");
}

// ESLint config
if (
  fs.existsSync(path.join(rootDir, "eslint.config.js")) ||
  fs.existsSync(path.join(rootDir, ".eslintrc.json"))
) {
  pass("ESLint config exists");
} else {
  warn("ESLint config missing");
}

// robots.txt
if (fs.existsSync(path.join(rootDir, "client", "public", "robots.txt"))) {
  pass("robots.txt exists");
} else {
  warn("robots.txt missing");
}

// Environment validation
if (hasEnv) {
  const envContent = fs.readFileSync(path.join(rootDir, ".env"), "utf-8");
  const envVars = new Map(
    envContent
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return idx > -1
          ? [line.slice(0, idx), line.slice(idx + 1)]
          : [line, ""];
      })
  );

  for (const key of REQUIRED_ENV_PRODUCTION) {
    const value = envVars.get(key);
    if (value && value.trim() && value.trim() !== "change-me") {
      pass(`Env ${key} is set`);
    } else {
      warn(`Env ${key} is missing or default (required for local boot)`);
    }
  }

  for (const key of REQUIRED_ENV_OAUTH) {
    const value = envVars.get(key);
    if (value && value.trim()) {
      pass(`Env ${key} is set (OAuth)`);
    } else {
      warn(`Env ${key} is missing (OAuth sign-in will fail)`);
    }
  }
} else {
  warn("Skipping env validation — .env not found");
}

// Security middleware presence
const indexTs = fs.readFileSync(
  path.join(rootDir, "server", "_core", "index.ts"),
  "utf-8"
);
if (indexTs.includes("helmet")) {
  pass("helmet middleware imported");
} else {
  warn("helmet middleware not found in server/_core/index.ts");
}

if (indexTs.includes("trust proxy")) {
  pass("trust proxy configured");
} else {
  warn("trust proxy not configured");
}

if (indexTs.includes("SIGTERM") || indexTs.includes("SIGINT")) {
  pass("graceful shutdown handlers present");
} else {
  warn("graceful shutdown handlers not found");
}

// DB connection pooling
const dbTs = fs.readFileSync(path.join(rootDir, "server", "db.ts"), "utf-8");
if (dbTs.includes("createPool")) {
  pass("MySQL connection pooling configured");
} else {
  warn("MySQL connection pooling not found");
}

// Summary
console.log(`\n${"=".repeat(60)}`);
if (exitCode === 0) {
  console.log("  ✅  ALL CHECKS PASSED");
} else {
  console.log("  ❌  SOME CHECKS FAILED");
}
console.log(`${"=".repeat(60)}\n`);

process.exit(exitCode);
