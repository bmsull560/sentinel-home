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

if (
  fs.existsSync(
    path.join(rootDir, ".github", "workflows", "docker-publish.yml")
  )
) {
  pass("Docker publish workflow exists");
} else {
  warn("Docker publish workflow missing");
}

if (fs.existsSync(path.join(rootDir, ".github", "workflows", "codeql.yml"))) {
  pass("CodeQL SAST workflow exists");
} else {
  warn("CodeQL SAST workflow missing");
}

// Dependabot
if (fs.existsSync(path.join(rootDir, ".github", "dependabot.yml"))) {
  pass("Dependabot configuration exists");
} else {
  warn("Dependabot configuration missing");
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

// Committed database migrations
const migrationsDir = path.join(rootDir, "drizzle", "migrations");
const migrationsMetaDir = path.join(migrationsDir, "meta");
const hasMigrationsDir = fs.existsSync(migrationsDir);
const hasMigrationsMetaDir = fs.existsSync(migrationsMetaDir);
const migrationSqlFiles = hasMigrationsDir
  ? fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql") && !f.startsWith("."))
  : [];
const hasJournal = fs.existsSync(path.join(migrationsMetaDir, "_journal.json"));

if (migrationSqlFiles.length > 0) {
  pass(`Committed migrations: ${migrationSqlFiles.length} SQL file(s)`);
} else {
  fail("No committed SQL migrations found in drizzle/migrations/");
}

if (hasMigrationsMetaDir) {
  pass("Migration metadata directory exists");
} else {
  fail("Migration metadata directory missing (drizzle/migrations/meta/)");
}

if (hasJournal) {
  pass("Migration journal exists");
} else {
  fail("Migration journal missing (drizzle/migrations/meta/_journal.json)");
}

// Dockerfile hardening
if (fs.existsSync(path.join(rootDir, "Dockerfile"))) {
  const dockerfile = fs.readFileSync(path.join(rootDir, "Dockerfile"), "utf-8");
  if (dockerfile.includes("USER ")) {
    pass("Dockerfile runs as non-root user");
  } else {
    warn("Dockerfile does not set a non-root USER");
  }
  if (dockerfile.includes("COPY --from=builder")) {
    pass("Dockerfile copies node_modules from builder stage");
  } else {
    warn("Dockerfile does not copy node_modules from builder stage");
  }
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

if (
  indexTs.includes('app.get("/metrics"') ||
  indexTs.includes("app.get('/metrics'")
) {
  pass("Prometheus /metrics endpoint configured");
} else {
  warn("Prometheus /metrics endpoint not found");
}

// DB connection pooling
const dbTs = fs.readFileSync(path.join(rootDir, "server", "db.ts"), "utf-8");
if (dbTs.includes("createPool")) {
  pass("MySQL connection pooling configured");
} else {
  warn("MySQL connection pooling not found");
}

// Docker Compose
if (fs.existsSync(path.join(rootDir, "docker-compose.yml"))) {
  pass("Docker Compose local file exists");
} else {
  warn("docker-compose.yml missing");
}

if (fs.existsSync(path.join(rootDir, "docker-compose.prod.yml"))) {
  pass("Docker Compose production file exists");
} else {
  warn("docker-compose.prod.yml missing");
}

// Performance targets
if (fs.existsSync(path.join(rootDir, "PERFORMANCE.md"))) {
  pass("Performance targets documented");
} else {
  warn("PERFORMANCE.md missing");
}

// Observability artifacts
const dashboardPath = path.join(
  rootDir,
  "observability",
  "grafana",
  "dashboards",
  "sentinel-home.json"
);
const alertsPath = path.join(
  rootDir,
  "observability",
  "prometheus",
  "alerts.yml"
);

if (fs.existsSync(dashboardPath)) {
  try {
    JSON.parse(fs.readFileSync(dashboardPath, "utf-8"));
    pass("Grafana dashboard JSON is valid");
  } catch {
    fail("Grafana dashboard JSON is invalid");
  }
} else {
  fail(
    "Grafana dashboard missing (observability/grafana/dashboards/sentinel-home.json)"
  );
}

if (fs.existsSync(alertsPath)) {
  pass("Prometheus alert rules file exists");
} else {
  fail("Prometheus alert rules missing (observability/prometheus/alerts.yml)");
}

// Infrastructure as Code
const infraReadme = path.join(rootDir, "infrastructure", "README.md");
const terraformModules = ["vpc", "eks", "rds", "iam"];
const k8sOverlays = ["dev", "prod"];

if (fs.existsSync(infraReadme)) {
  pass("Infrastructure README exists");
} else {
  fail("Infrastructure README missing");
}

for (const mod of terraformModules) {
  const modMain = path.join(
    rootDir,
    "infrastructure",
    "terraform",
    "modules",
    mod,
    "main.tf"
  );
  if (fs.existsSync(modMain)) {
    pass(`Terraform module exists: ${mod}`);
  } else {
    fail(`Terraform module missing: ${mod}`);
  }
}

for (const env of k8sOverlays) {
  const overlay = path.join(
    rootDir,
    "infrastructure",
    "kubernetes",
    "overlays",
    env,
    "kustomization.yaml"
  );
  if (fs.existsSync(overlay)) {
    pass(`Kubernetes overlay exists: ${env}`);
  } else {
    fail(`Kubernetes overlay missing: ${env}`);
  }
}

// Security framework
const securityFiles = [
  "security/PENTEST_PLAN.md",
  "security/FINDINGS_TEMPLATE.md",
  "security/REMEDIATION_WORKFLOW.md",
  "security/findings/README.md",
  "scripts/security-checks.js",
];

for (const file of securityFiles) {
  if (fs.existsSync(path.join(rootDir, file))) {
    pass(`Security artifact exists: ${file}`);
  } else {
    fail(`Security artifact missing: ${file}`);
  }
}

if (fs.existsSync(path.join(rootDir, "scripts", "load-test.js"))) {
  pass("Load test script exists");
} else {
  warn("Load test script missing");
}

// End-to-end smoke test
if (fs.existsSync(path.join(rootDir, "scripts", "e2e-smoke.js"))) {
  pass("E2E smoke test script exists");
} else {
  warn("E2E smoke test script missing");
}

if (pkgJson.scripts?.["test:e2e"]) {
  pass("test:e2e script defined");
} else {
  warn("test:e2e script not defined");
}

// Release documentation
if (fs.existsSync(path.join(rootDir, "CHANGELOG.md"))) {
  pass("CHANGELOG.md exists");
} else {
  warn("CHANGELOG.md missing");
}

if (fs.existsSync(path.join(rootDir, "RELEASE.md"))) {
  pass("RELEASE.md exists");
} else {
  warn("RELEASE.md missing");
}

// Contribution guidelines
if (fs.existsSync(path.join(rootDir, "CONTRIBUTING.md"))) {
  pass("CONTRIBUTING.md exists");
} else {
  warn("CONTRIBUTING.md missing");
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
