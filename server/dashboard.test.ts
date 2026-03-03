import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserOrgRole: vi.fn().mockResolvedValue("owner"),
  getUserOrgs: vi.fn().mockResolvedValue([
    { id: 1, name: "Test Org", slug: "test-org", plan: "free", planSeats: 3, planDevices: 10, billingEmail: null, createdAt: new Date() }
  ]),
  getOrgById: vi.fn().mockResolvedValue(
    { id: 1, name: "Test Org", slug: "test-org", plan: "free", planSeats: 3, planDevices: 10, billingEmail: null, createdAt: new Date() }
  ),
  getOrgBySlug: vi.fn().mockResolvedValue(null),
  createOrg: vi.fn().mockResolvedValue({ id: 2, name: "New Org", slug: "new-org", plan: "free", planSeats: 1, planDevices: 3 }),
  addOrgMember: vi.fn().mockResolvedValue(undefined),
  updateOrg: vi.fn().mockResolvedValue(undefined),
  getOrgMembers: vi.fn().mockResolvedValue([
    { id: 1, orgId: 1, userId: 1, role: "owner", joinedAt: new Date() }
  ]),
  updateOrgMemberRole: vi.fn().mockResolvedValue(undefined),
  removeOrgMember: vi.fn().mockResolvedValue(undefined),
  getOrgDevices: vi.fn().mockResolvedValue([
    { id: 1, orgId: 1, name: "Ring Doorbell Pro 2", category: "smart_home", status: "at_risk", manufacturer: "Ring", model: "Pro 2", firmwareVersion: "1.2.3", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, orgId: 1, name: "Nest Cam Indoor", category: "smart_home", status: "secure", manufacturer: "Google", model: "Nest Cam", firmwareVersion: "2.0.0", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getOrgAlerts: vi.fn().mockResolvedValue([
    { id: 1, orgId: 1, title: "Critical CVE detected on Ring Doorbell", severity: "critical", status: "unread", message: "CVE-2024-1234 affects your device.", createdAt: new Date() },
    { id: 2, orgId: 1, title: "Firmware update available", severity: "warning", status: "read", message: "Update to patch known vulnerabilities.", createdAt: new Date() },
  ]),
  getOrgVulnerabilities: vi.fn().mockResolvedValue([
    { id: 1, orgId: 1, title: "Remote Code Execution in Ring Doorbell", severity: "immediate_attention", status: "open", isKev: true, patchAvailable: true, cveId: "CVE-2024-1234", cvssScore: "9.8", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, orgId: 1, title: "Information Disclosure in Nest Cam", severity: "be_aware", status: "acknowledged", isKev: false, patchAvailable: false, cveId: "CVE-2024-5678", cvssScore: "4.3", createdAt: new Date(), updatedAt: new Date() },
  ]),
  createDevice: vi.fn().mockImplementation(async (data: any) => ({ id: 99, ...data, status: "unknown", createdAt: new Date(), updatedAt: new Date() })),
  updateDevice: vi.fn().mockResolvedValue(undefined),
  deleteDevice: vi.fn().mockResolvedValue(undefined),
  getVulnerabilityById: vi.fn().mockResolvedValue({
    id: 1, orgId: 1, title: "Remote Code Execution in Ring Doorbell", description: "A critical RCE vulnerability affecting Ring Doorbell Pro 2 firmware versions below 1.3.0.",
    severity: "immediate_attention", cveId: "CVE-2024-1234", cvssScore: "9.8", attackVector: "NETWORK",
    userInteraction: "NONE", privilegesRequired: "NONE", status: "open", isKev: true, patchAvailable: true,
  }),
  updateVulnerability: vi.fn().mockResolvedValue(undefined),
  updateAlert: vi.fn().mockResolvedValue(undefined),
  getOrgAgentRuns: vi.fn().mockResolvedValue([
    { id: 1, orgId: 1, intent: "What are my critical vulnerabilities?", status: "completed", result: "You have 1 critical vulnerability.", durationMs: 2500, tokensUsed: 450, agentTrace: [], createdAt: new Date() }
  ]),
  createAgentRun: vi.fn().mockResolvedValue({ id: 2, orgId: 1, intent: "test intent", status: "running", createdAt: new Date() }),
  updateAgentRun: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: "This vulnerability allows a remote attacker to execute arbitrary code on your Ring Doorbell without any user interaction. Update your firmware immediately."
      }
    }]
  }),
}));

// ─── Context Factory ──────────────────────────────────────────────────────────
function makeCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe("auth", () => {
  it("returns the current user from auth.me", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const user = await caller.auth.me();
    expect(user?.id).toBe(1);
    expect(user?.email).toBe("test@example.com");
  });

  it("clears session cookie on logout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect((ctx.res.clearCookie as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });
});

// ─── Org ──────────────────────────────────────────────────────────────────────
describe("org", () => {
  it("lists organizations for the current user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const orgs = await caller.org.list();
    expect(Array.isArray(orgs)).toBe(true);
    expect(orgs.length).toBeGreaterThan(0);
    expect(orgs[0]?.name).toBe("Test Org");
  });

  it("gets a specific org by id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const org = await caller.org.get({ orgId: 1 });
    expect(org?.id).toBe(1);
    expect(org?.slug).toBe("test-org");
    expect(org?.plan).toBe("free");
  });

  it("creates a new organization with unique slug", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const org = await caller.org.create({ name: "New Org", slug: "new-org" });
    expect(org?.id).toBe(2);
    expect(org?.name).toBe("New Org");
  });

  it("rejects org creation when slug is already taken", async () => {
    const db = await import("./db");
    vi.mocked(db.getOrgBySlug).mockResolvedValueOnce({ id: 99, slug: "taken" } as any);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.org.create({ name: "Taken", slug: "taken" })).rejects.toThrow();
  });
});

// ─── Dashboard Overview ───────────────────────────────────────────────────────
describe("dashboard.overview", () => {
  it("returns all required overview metrics", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const overview = await caller.dashboard.overview({ orgId: 1 });
    expect(typeof overview.urgentAlerts).toBe("number");
    expect(typeof overview.totalVulnerabilities).toBe("number");
    expect(typeof overview.monitoredDevices).toBe("number");
    expect(typeof overview.secureDevices).toBe("number");
    expect(typeof overview.atRiskDevices).toBe("number");
    expect(typeof overview.threatSources).toBe("number");
  });

  it("correctly counts secure and at-risk devices", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const overview = await caller.dashboard.overview({ orgId: 1 });
    // Mocked data: 1 at_risk, 1 secure
    expect(overview.secureDevices).toBe(1);
    expect(overview.atRiskDevices).toBe(1);
    expect(overview.monitoredDevices).toBe(2);
  });

  it("correctly counts urgent (unread critical) alerts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const overview = await caller.dashboard.overview({ orgId: 1 });
    // Mocked data: 1 unread critical alert
    expect(overview.urgentAlerts).toBe(1);
  });
});

// ─── Devices ──────────────────────────────────────────────────────────────────
describe("devices", () => {
  it("lists all devices for an org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const devices = await caller.devices.list({ orgId: 1 });
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBe(2);
    expect(devices[0]?.name).toBe("Ring Doorbell Pro 2");
  });

  it("creates a new device with required fields", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const device = await caller.devices.create({
      orgId: 1,
      name: "Philips Hue Bridge",
      category: "smart_home",
      manufacturer: "Philips",
      model: "Hue Bridge v2",
    });
    expect(device?.name).toBe("Philips Hue Bridge");
    expect(device?.category).toBe("smart_home");
  });

  it("deletes a device", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.devices.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Vulnerabilities ──────────────────────────────────────────────────────────
describe("vulnerabilities", () => {
  it("lists all vulnerabilities for an org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const vulns = await caller.vulnerabilities.list({ orgId: 1 });
    expect(Array.isArray(vulns)).toBe(true);
    expect(vulns.length).toBe(2);
  });

  it("returns vulnerability with correct severity tiers", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const vulns = await caller.vulnerabilities.list({ orgId: 1 });
    const severities = vulns.map(v => v.severity);
    expect(severities).toContain("immediate_attention");
    expect(severities).toContain("be_aware");
  });

  it("updates vulnerability status to acknowledged", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.vulnerabilities.updateStatus({ id: 1, status: "acknowledged" });
    expect(result.success).toBe(true);
  });

  it("generates a plain-language AI explanation", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.vulnerabilities.explain({ vulnerabilityId: 1 });
    // explain returns { explanation } not { success, explanation }
    expect(typeof result.explanation).toBe("string");
    expect(result.explanation.length).toBeGreaterThan(10);
  }, 30000);
});

// ─── Alerts ───────────────────────────────────────────────────────────────────
describe("alerts", () => {
  it("lists all alerts for an org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const alerts = await caller.alerts.list({ orgId: 1 });
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBe(2);
  });

  it("updates alert status to acknowledged", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.alerts.updateStatus({ id: 1, status: "acknowledged" });
    expect(result.success).toBe(true);
  });

  it("updates alert status to dismissed", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.alerts.updateStatus({ id: 1, status: "dismissed" });
    expect(result.success).toBe(true);
  });
});

// ─── Agent Runs ───────────────────────────────────────────────────────────────
describe("agentRuns", () => {
  it("lists agent run history for an org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const runs = await caller.agentRuns.list({ orgId: 1 });
    expect(Array.isArray(runs)).toBe(true);
    expect(runs[0]?.status).toBe("completed");
  });

  it("triggers a new agent run with valid intent", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.agentRuns.trigger({
      orgId: 1,
      intent: "Summarize my security posture for the last 7 days",
    });
    // trigger returns { runId, result, agentTrace } not { success, runId }
    expect(typeof result.runId).toBe("number");
    expect(typeof result.result).toBe("string");
  });

  it("rejects agent run with intent that is too short", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.agentRuns.trigger({ orgId: 1, intent: "Hi" })
    ).rejects.toThrow();
  });
});

// ─── Members ──────────────────────────────────────────────────────────────────
describe("members", () => {
  it("lists all members of an org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const members = await caller.members.list({ orgId: 1 });
    expect(Array.isArray(members)).toBe(true);
    expect(members[0]?.role).toBe("owner");
  });

  it("removes a member from the org", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.members.remove({ orgId: 1, userId: 2 });
    expect(result.success).toBe(true);
  });
});
