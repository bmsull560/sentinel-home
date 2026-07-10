#!/usr/bin/env node
/**
 * End-to-end smoke test for the production bundle.
 *
 * This test:
 *   1. Starts a real MySQL container
 *   2. Runs database migrations
 *   3. Builds the production bundle
 *   4. Starts the server from dist/index.js
 *   5. Verifies /health and /metrics respond correctly
 *   6. Shuts down the server and container
 *
 * Usage:
 *   node scripts/e2e-smoke.js
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { GenericContainer } from "testcontainers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const REQUEST_TIMEOUT_MS = 5_000;
const SERVER_START_TIMEOUT_MS = 30_000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: REQUEST_TIMEOUT_MS }, res => {
      let body = "";
      res.on("data", chunk => (body += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out`));
    });
  });
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const { statusCode } = await httpGet(`${baseUrl}/health`);
      if (statusCode === 200) return;
    } catch {
      // Server not ready yet
    }
    await sleep(500);
  }
  throw new Error(
    `Server did not become healthy within ${SERVER_START_TIMEOUT_MS}ms`
  );
}

async function main() {
  console.log("[E2E] Starting MySQL container...");
  const container = await new GenericContainer("mysql:8.0")
    .withEnvironment({
      MYSQL_ROOT_PASSWORD: "rootpass",
      MYSQL_DATABASE: "sentinel_e2e",
      MYSQL_USER: "sentinel",
      MYSQL_PASSWORD: "sentinelpass",
    })
    .withExposedPorts(3306)
    .withCommand(["--default-authentication-plugin=mysql_native_password"])
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(3306);
  const databaseUrl = `mysql://sentinel:sentinelpass@${host}:${port}/sentinel_e2e`;

  try {
    console.log("[E2E] Running database migrations...");
    execSync("node scripts/migrate.js", {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    console.log("[E2E] Building production bundle...");
    execSync("pnpm build", {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    console.log("[E2E] Starting server...");
    const server = spawn("node", ["dist/index.js"], {
      cwd: rootDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        JWT_SECRET: "e2e-test-secret-must-be-at-least-32-characters-long",
        NODE_ENV: "production",
        PORT: "3999",
      },
      stdio: "pipe",
    });

    server.stdout.on("data", data => process.stdout.write(data));
    server.stderr.on("data", data => process.stderr.write(data));

    const baseUrl = "http://localhost:3999";

    try {
      await waitForServer(baseUrl);
      console.log("[E2E] Server is healthy");

      const health = await httpGet(`${baseUrl}/health`);
      if (health.statusCode !== 200) {
        throw new Error(`Expected /health 200, got ${health.statusCode}`);
      }
      const healthBody = JSON.parse(health.body);
      if (healthBody.status !== "ok") {
        throw new Error(`Expected health status ok, got ${healthBody.status}`);
      }
      console.log("[E2E] /health OK:", healthBody);

      const metrics = await httpGet(`${baseUrl}/metrics`);
      if (metrics.statusCode !== 200) {
        throw new Error(`Expected /metrics 200, got ${metrics.statusCode}`);
      }
      if (!metrics.body.includes("http_requests_total")) {
        throw new Error("Expected /metrics to contain http_requests_total");
      }
      console.log("[E2E] /metrics OK");
    } finally {
      console.log("[E2E] Stopping server...");
      server.kill("SIGTERM");
      await new Promise(resolve => server.on("exit", resolve));
    }
  } finally {
    console.log("[E2E] Stopping MySQL container...");
    await container.stop();
  }

  console.log("[E2E] Smoke test passed");
}

main().catch(err => {
  console.error("[E2E] Smoke test failed:", err);
  process.exit(1);
});
