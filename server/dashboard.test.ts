import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard.overview", () => {
  it("returns overview statistics for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.overview();

    expect(result).toHaveProperty("urgentAlerts");
    expect(result).toHaveProperty("totalVulnerabilities");
    expect(result).toHaveProperty("monitoredDevices");
    expect(result).toHaveProperty("secureDevices");
    expect(result).toHaveProperty("atRiskDevices");
    expect(result).toHaveProperty("threatSources");

    expect(typeof result.urgentAlerts).toBe("number");
    expect(typeof result.totalVulnerabilities).toBe("number");
    expect(typeof result.monitoredDevices).toBe("number");
    expect(result.urgentAlerts).toBeGreaterThanOrEqual(0);
  });
});

describe("devices", () => {
  it("lists devices for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const devices = await caller.devices.list();

    expect(Array.isArray(devices)).toBe(true);
  });

  it("creates a new device", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newDevice = {
      name: "Test Smart Lock",
      category: "smart_home" as const,
      manufacturer: "Test Brand",
      model: "Model X",
      firmwareVersion: "1.0.0",
    };

    const result = await caller.devices.create(newDevice);

    expect(result).toHaveProperty("id");
    expect(result.name).toBe(newDevice.name);
    expect(result.category).toBe(newDevice.category);
    expect(result.manufacturer).toBe(newDevice.manufacturer);
  });
});

describe("vulnerabilities", () => {
  it("lists all vulnerabilities", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const vulnerabilities = await caller.vulnerabilities.list();

    expect(Array.isArray(vulnerabilities)).toBe(true);
    expect(vulnerabilities.length).toBeGreaterThan(0);

    if (vulnerabilities.length > 0) {
      const vuln = vulnerabilities[0];
      expect(vuln).toHaveProperty("id");
      expect(vuln).toHaveProperty("title");
      expect(vuln).toHaveProperty("description");
      expect(vuln).toHaveProperty("severity");
      expect(["calm", "be_aware", "action_recommended", "immediate_attention"]).toContain(vuln.severity);
    }
  });

  it("gets a specific vulnerability by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const vulnerabilities = await caller.vulnerabilities.list();
    if (vulnerabilities.length === 0) {
      console.log("No vulnerabilities to test with");
      return;
    }

    const firstVuln = vulnerabilities[0];
    const result = await caller.vulnerabilities.get({ id: firstVuln!.id });

    expect(result).toBeDefined();
    expect(result?.id).toBe(firstVuln!.id);
    expect(result?.title).toBe(firstVuln!.title);
  });

  it("generates AI explanation for vulnerability", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const vulnerabilities = await caller.vulnerabilities.list();
    if (vulnerabilities.length === 0) {
      console.log("No vulnerabilities to test with");
      return;
    }

    const firstVuln = vulnerabilities[0];
    const result = await caller.vulnerabilities.explain({
      vulnerabilityId: firstVuln!.id,
      technicalLevel: "simple",
    });

    expect(result).toHaveProperty("explanation");
    expect(typeof result.explanation).toBe("string");
    expect(result.explanation.length).toBeGreaterThan(0);
  }, 30000); // Increase timeout for LLM call
});

describe("alerts", () => {
  it("lists alerts for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const alerts = await caller.alerts.list();

    expect(Array.isArray(alerts)).toBe(true);
  });

  it("updates alert status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create an alert
    const vulnerabilities = await db.getAllVulnerabilities();
    if (vulnerabilities.length === 0) {
      console.log("No vulnerabilities to create alert with");
      return;
    }

    const alert = await db.createAlert({
      userId: ctx.user.id,
      vulnerabilityId: vulnerabilities[0]!.id,
      status: "new",
    });

    // Now update it
    const result = await caller.alerts.updateStatus({
      id: alert.id,
      status: "acknowledged",
    });

    expect(result.success).toBe(true);
  });
});

describe("notifications", () => {
  it("lists notifications for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const notifications = await caller.notifications.list();

    expect(Array.isArray(notifications)).toBe(true);
  });

  it("marks notification as read", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test notification
    const notification = await db.createNotification({
      userId: ctx.user.id,
      title: "Test Notification",
      message: "This is a test",
      type: "info",
      read: false,
    });

    const result = await caller.notifications.markRead({ id: notification.id });

    expect(result.success).toBe(true);
  });
});
