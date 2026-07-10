#!/usr/bin/env node
/**
 * Minimal HTTP load test.
 *
 * Usage:
 *   node scripts/load-test.js [url] [concurrency] [durationSeconds]
 *
 * Defaults:
 *   url = http://localhost:3000/health
 *   concurrency = 10
 *   durationSeconds = 10
 */
import http from "node:http";
import https from "node:https";

const target = process.argv[2] || "http://localhost:3000/health";
const concurrency = parseInt(process.argv[3] || "10", 10);
const durationMs = parseInt(process.argv[4] || "10", 10) * 1000;

const url = new URL(target);
const client = url.protocol === "https:" ? https : http;

const latencies = [];
let completed = 0;
let errors = 0;
let inFlight = 0;
let stop = false;

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function request() {
  if (stop) return;
  inFlight++;
  const start = process.hrtime.bigint();

  const req = client.request(url, { method: "GET", timeout: 10_000 }, res => {
    res.resume();
    res.on("end", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        latencies.push(durationMs);
      } else {
        errors++;
      }
      completed++;
      inFlight--;
      request();
    });
  });

  req.on("error", () => {
    errors++;
    completed++;
    inFlight--;
    request();
  });

  req.on("timeout", () => {
    req.destroy();
    errors++;
    completed++;
    inFlight--;
    request();
  });

  req.end();
}

for (let i = 0; i < concurrency; i++) {
  request();
}

setTimeout(() => {
  stop = true;
  // Wait for in-flight requests to finish
  const finalize = setInterval(() => {
    if (inFlight > 0) return;
    clearInterval(finalize);

    const sorted = latencies.slice().sort((a, b) => a - b);
    const totalSeconds = durationMs / 1000;

    console.log(`\nLoad test results for ${target}`);
    console.log(`Concurrency: ${concurrency}, Duration: ${totalSeconds}s`);
    console.log(`Total requests: ${completed}`);
    console.log(`Errors: ${errors}`);
    console.log(`RPS: ${(completed / totalSeconds).toFixed(2)}`);

    if (sorted.length > 0) {
      console.log(
        `Mean latency: ${(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2)} ms`
      );
      console.log(`p50 latency: ${percentile(sorted, 50).toFixed(2)} ms`);
      console.log(`p95 latency: ${percentile(sorted, 95).toFixed(2)} ms`);
      console.log(`p99 latency: ${percentile(sorted, 99).toFixed(2)} ms`);
      console.log(`Max latency: ${sorted[sorted.length - 1].toFixed(2)} ms`);
    }

    process.exit(errors > 0 ? 1 : 0);
  }, 100);
}, durationMs);
