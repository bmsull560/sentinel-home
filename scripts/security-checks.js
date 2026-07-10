#!/usr/bin/env node
/**
 * Sentinel Home — Automated Security Baseline Checks
 *
 * Run with: pnpm security:checks
 *
 * Performs static checks that do not require a running application:
 *   1. No .env files committed (except .env.example)
 *   2. No obvious plaintext secrets in source
 *   3. Security middleware (helmet) is present
 *   4. Rate limiting is configured
 *   5. Docker image runs as non-root
 *   6. Kubernetes manifests enforce non-root and read-only rootfs
 *   7. Sensitive fields are redacted in logger config
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

let exitCode = 0;

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

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf-8");
}

function has(file, needle) {
  try {
    return read(file).includes(needle);
  } catch {
    return false;
  }
}

console.log("\nSentinel Home Security Baseline Checks\n");

// 1. Committed .env files
let envFiles;
try {
  envFiles = execSync("git ls-files '*.env' '.env.*'", {
    cwd: rootDir,
    encoding: "utf-8",
  })
    .split("\n")
    .filter(f => f && f !== ".env.example");
} catch {
  envFiles = [];
}

if (envFiles.length === 0) {
  pass("No .env files committed (except .env.example)");
} else {
  fail(`Committed .env files detected: ${envFiles.join(", ")}`);
}

// 2. Plaintext secret patterns
const secretPatterns = [
  /password\s*=\s*["'][^"']+["']/i,
  /api[_-]?key\s*=\s*["'][^"']+["']/i,
  /secret\s*=\s*["'][^"']+["']/i,
  /private[_-]?key\s*=\s*["'][^"']+["']/i,
];

const sourceFiles = execSync(
  "git ls-files 'server/**/*.ts' 'client/src/**/*.ts' 'client/src/**/*.tsx'",
  { cwd: rootDir, encoding: "utf-8" }
)
  .split("\n")
  .filter(Boolean);

let secretMatches = 0;
for (const file of sourceFiles) {
  const content = read(file);
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      secretMatches++;
      warn(`Possible plaintext secret in ${file}: ${pattern}`);
    }
  }
}

if (secretMatches === 0) {
  pass("No obvious plaintext secret patterns in source");
} else {
  fail(`${secretMatches} possible plaintext secret pattern(s) found`);
}

// 3. Security middleware
if (has("server/_core/index.ts", "helmet(")) {
  pass("helmet middleware configured");
} else {
  fail("helmet middleware not found");
}

// 4. Rate limiting
if (has("server/_core/index.ts", "rateLimit(")) {
  pass("rate limiting configured");
} else {
  fail("rate limiting not found");
}

// 5. Docker non-root user
const dockerfile = read("Dockerfile");
if (/USER\s+\S+/.test(dockerfile) && !dockerfile.includes("USER root")) {
  pass("Dockerfile runs as non-root user");
} else {
  fail("Dockerfile does not run as a non-root user");
}

// 6. Kubernetes hardening
const deployment = read("infrastructure/kubernetes/base/deployment.yaml");
if (deployment.includes("runAsNonRoot: true")) {
  pass("Kubernetes Deployment enforces runAsNonRoot");
} else {
  fail("Kubernetes Deployment missing runAsNonRoot");
}

if (deployment.includes("readOnlyRootFilesystem: true")) {
  pass("Kubernetes Deployment enforces readOnlyRootFilesystem");
} else {
  fail("Kubernetes Deployment missing readOnlyRootFilesystem");
}

if (deployment.includes("drop:\n                - ALL")) {
  pass("Kubernetes Deployment drops all capabilities");
} else {
  fail("Kubernetes Deployment does not drop all capabilities");
}

// 7. Logger redaction
const logger = read("server/_core/logger.ts");
const requiredRedact = [
  "req.headers.cookie",
  "req.headers.authorization",
  "password",
  "token",
  "databaseUrl",
];
let missingRedact = 0;
for (const field of requiredRedact) {
  if (logger.includes(field)) {
    pass(`Logger redacts ${field}`);
  } else {
    missingRedact++;
    fail(`Logger does not redact ${field}`);
  }
}

console.log("");
if (exitCode === 0) {
  console.log("✅ All security baseline checks passed");
} else {
  console.log("❌ Some security baseline checks failed");
}

process.exit(exitCode);
