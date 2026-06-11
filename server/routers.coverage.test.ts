import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  getUserOrgRole: vi.fn().mockResolvedValue("owner"),
  getUserOrgs: vi.fn().mockResolvedValue([]),
  getOrgById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Org",
    slug: "test-org",
    plan: "starter",
    planSeats: 5,
    planDevices: 20,
    billingEmail: null,
    createdAt: new Date(),
  }),
  getOrgBySlug: vi.fn().mockResolvedValue(null),
  createOrg: vi.fn().mockResolvedValue({ id: 2 }),
  addOrgMember: vi.fn().mockResolvedValue(undefined),
  updateOrg: vi.fn().mockResolvedValue(undefined),
  getOrgMembers: vi
    .fn()
    .mockResolvedValue([
      { id: 1, orgId: 1, userId: 1, role: "owner", joinedAt: new Date() },
    ]),
  updateOrgMemberRole: vi.fn().mockResolvedValue(undefined),
  removeOrgMember: vi.fn().mockResolvedValue(undefined),
  getOrgDevices: vi.fn().mockResolvedValue([
    {
      id: 1,
      orgId: 1,
      name: "Test Device",
      category: "smart_home",
      status: "secure",
      manufacturer: "Acme",
      model: "X1",
      firmwareVersion: "1.0.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getDeviceById: vi.fn().mockResolvedValue({
    id: 1,
    orgId: 1,
    name: "Test Device",
    category: "smart_home",
    status: "secure",
    manufacturer: "Acme",
    model: "X1",
    firmwareVersion: "1.0.0",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createDevice: vi.fn().mockResolvedValue({ id: 99 }),
  updateDevice: vi.fn().mockResolvedValue(undefined),
  deleteDevice: vi.fn().mockResolvedValue(undefined),
  getOrgVulnerabilities: vi.fn().mockResolvedValue([]),
  getVulnerabilityById: vi.fn().mockResolvedValue({
    id: 1,
    orgId: 1,
    title: "Test Vuln",
    description: "A test vulnerability",
    severity: "immediate_attention",
    cveId: "CVE-2024-TEST",
    cvssScore: "9.8",
    status: "open",
    isKev: true,
    patchAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createVulnerability: vi.fn().mockResolvedValue({ id: 1 }),
  updateVulnerability: vi.fn().mockResolvedValue(undefined),
  getOrgAlerts: vi.fn().mockResolvedValue([]),
  updateAlert: vi.fn().mockResolvedValue(undefined),
  getOrgAgentRuns: vi.fn().mockResolvedValue([]),
  createAgentRun: vi.fn().mockResolvedValue({ id: 1 }),
  updateAgentRun: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getOrgApiKeys: vi.fn().mockResolvedValue([]),
  createApiKey: vi.fn().mockResolvedValue({ id: 1 }),
  revokeApiKey: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "test explanation" } }],
  }),
}));

vi.mock("./intelligence/ingestionPipeline", () => ({
  runIngestionPipeline: vi.fn().mockResolvedValue({
    cvesFetched: 10,
    cvesInserted: 5,
    cvesUpdated: 2,
    kevEntriesUpserted: 1,
    matchesCreated: 3,
    alertsGenerated: 1,
    durationMs: 1000,
  }),
  getIngestionRuns: vi.fn().mockResolvedValue([]),
  getLastIngestionDate: vi.fn().mockResolvedValue(null),
  getOrgCveMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock("./intelligence/nvdClient", () => ({
  fetchNvdCveById: vi.fn().mockResolvedValue(null),
}));

vi.mock("./intelligence/scheduler", () => ({
  getSchedulerState: vi.fn().mockReturnValue({
    isRunning: false,
    lastRunAt: null,
    lastRunError: null,
    nextRunAt: new Date("2026-06-08T00:00:00Z"),
    totalRuns: 5,
    totalErrors: 0,
    startedAt: new Date(),
    lastRunResult: {
      cvesFetched: 42,
      cvesInserted: 10,
      cvesUpdated: 5,
      matchesCreated: 7,
      alertsGenerated: 2,
      durationMs: 1234,
    },
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Context Helper ───────────────────────────────────────────────────────────

function makeCtx(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── System ───────────────────────────────────────────────────────────────────

describe("system", () => {
  it("health returns ok", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.system.health({ timestamp: 0 });
    expect(result.ok).toBe(true);
  });

  it("notifyOwner is admin-gated and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.system.notifyOwner({
      title: "Test Notification",
      content: "This is a test",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Org ──────────────────────────────────────────────────────────────────────

describe("org.update", () => {
  it("updates org name and billing email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.org.update({
      orgId: 1,
      name: "Updated Org",
      billingEmail: "billing@example.com",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Members ──────────────────────────────────────────────────────────────────

describe("members.updateRole", () => {
  it("updates a member's role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.members.updateRole({
      orgId: 1,
      userId: 2,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Devices ──────────────────────────────────────────────────────────────────

describe("devices.get and devices.update", () => {
  it("gets a single device by id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const device = await caller.devices.get({ id: 1 });
    expect(device?.id).toBe(1);
    expect(device?.name).toBe("Test Device");
  });

  it("updates device fields", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.devices.update({
      id: 1,
      status: "at_risk",
      notes: "Firmware outdated",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Vulnerabilities ──────────────────────────────────────────────────────────

describe("vulnerabilities.get", () => {
  it("gets a single vulnerability by id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const vuln = await caller.vulnerabilities.get({ id: 1 });
    expect(vuln?.id).toBe(1);
    expect(vuln?.cveId).toBe("CVE-2024-TEST");
  });
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

describe("apiKeys", () => {
  it("lists API keys for an org", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserOrgRole).mockResolvedValue("owner");
    vi.mocked(db.getOrgApiKeys).mockResolvedValue([
      {
        id: 1,
        orgId: 1,
        name: "Production Key",
        keyHash: "hashed-value",
        keyPrefix: "sk_prod",
        createdBy: 1,
        createdAt: new Date(),
        revokedAt: null,
      } as any,
    ]);

    const caller = appRouter.createCaller(makeCtx());
    const keys = await caller.apiKeys.list({ orgId: 1 });
    expect(keys.length).toBe(1);
    expect(keys[0]?.name).toBe("Production Key");
  });

  it("creates a new API key", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserOrgRole).mockResolvedValue("owner");

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.apiKeys.create({ orgId: 1, name: "New Key" });

    expect(result.key).toBeDefined();
    expect(result.key.startsWith("sk_")).toBe(true);
    expect(result.prefix).toBeDefined();
  });

  it("revokes an API key", async () => {
    const db = await import("./db");
    vi.mocked(db.getUserOrgRole).mockResolvedValue("owner");

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.apiKeys.revoke({ orgId: 1, keyId: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Billing ──────────────────────────────────────────────────────────────────

describe("billing.get", () => {
  it("returns plan limits and usage counts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const billing = await caller.billing.get({ orgId: 1 });
    expect(billing.plan).toBe("starter");
    expect(billing.planSeats).toBe(5);
    expect(billing.planDevices).toBe(20);
    expect(typeof billing.usedSeats).toBe("number");
    expect(typeof billing.usedDevices).toBe("number");
  });
});

// ─── Intelligence ─────────────────────────────────────────────────────────────

describe("intelligence.schedulerStatus", () => {
  it("returns scheduler state snapshot", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const status = await caller.intelligence.schedulerStatus();
    expect(status.isRunning).toBe(false);
    expect(status.totalRuns).toBe(5);
    expect(status.totalErrors).toBe(0);
    expect(status.nextRunAt).toBeDefined();
    expect(status.lastResult).toBeDefined();
    expect(status.lastResult?.cvesFetched).toBe(42);
  });
});
