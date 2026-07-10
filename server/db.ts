import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  InsertUser,
  users,
  organizations,
  Organization,
  InsertOrganization,
  orgMembers,
  OrgMember,
  devices,
  Device,
  InsertDevice,
  vulnerabilities,
  Vulnerability,
  InsertVulnerability,
  alerts,
  Alert,
  agentRuns,
  AgentRun,
  apiKeys,
  sessions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  // Allow tests and runtime to override DATABASE_URL after module load.
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL || "";
  if (!_db && databaseUrl) {
    try {
      const pool = createPool({
        uri: databaseUrl,
        connectionLimit: 10,
        ssl: ENV.isProduction ? { rejectUnauthorized: false } : undefined,
        enableKeepAlive: true,
      });
      _db = drizzle(pool as any);
    } catch (error) {
      logger.warn({ err: error }, "[Database] Failed to connect");
      _db = null;
    }
  }
  return _db;
}

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function mutateDb<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return fn(db);
}

async function queryDb<T>(
  fallback: T,
  fn: (db: DbClient) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) return fallback;
  return fn(db);
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0)
      updateSet.lastSignedIn = new Date();
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    logger.error({ err: error }, "[Database] Failed to upsert user");
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    return result[0];
  });
}

// ─── Organizations ────────────────────────────────────────────────────────────
export async function createOrg(
  org: InsertOrganization
): Promise<Organization> {
  return mutateDb(async db => {
    const result = await db.insert(organizations).values(org);
    return { ...org, id: Number(result[0].insertId) } as Organization;
  });
}

export async function getOrgById(
  orgId: number
): Promise<Organization | undefined> {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    return result[0];
  });
}

export async function getOrgBySlug(
  slug: string
): Promise<Organization | undefined> {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return result[0];
  });
}

export async function updateOrg(
  orgId: number,
  updates: Partial<InsertOrganization>
): Promise<void> {
  return mutateDb(async db => {
    await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, orgId));
  });
}

export async function getUserOrgs(userId: number) {
  return queryDb([], async db => {
    const members = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId));
    if (!members.length) return [];
    const orgIds = members.map(m => m.orgId);
    const orgs = await Promise.all(orgIds.map(id => getOrgById(id)));
    return orgs.filter(Boolean) as Organization[];
  });
}

// ─── Org Members ──────────────────────────────────────────────────────────────
export async function addOrgMember(
  orgId: number,
  userId: number,
  role: OrgMember["role"] = "viewer"
): Promise<void> {
  return mutateDb(async db => {
    await db.insert(orgMembers).values({ orgId, userId, role });
  });
}

export async function getOrgMembers(orgId: number) {
  return queryDb([], async db => {
    const members = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));
    const withUsers = await Promise.all(
      members.map(async m => {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, m.userId))
          .limit(1);
        return { ...m, user: user[0] };
      })
    );
    return withUsers;
  });
}

export async function getUserOrgRole(
  orgId: number,
  userId: number
): Promise<OrgMember["role"] | null> {
  return queryDb(null, async db => {
    const result = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);
    return result[0]?.role ?? null;
  });
}

export async function removeOrgMember(
  orgId: number,
  userId: number
): Promise<void> {
  return mutateDb(async db => {
    await db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  });
}

export async function updateOrgMemberRole(
  orgId: number,
  userId: number,
  role: OrgMember["role"]
): Promise<void> {
  return mutateDb(async db => {
    await db
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  });
}

// ─── Devices ──────────────────────────────────────────────────────────────────
export async function getOrgDevices(orgId: number): Promise<Device[]> {
  return queryDb([], async db => {
    return db
      .select()
      .from(devices)
      .where(eq(devices.orgId, orgId))
      .orderBy(desc(devices.createdAt));
  });
}

export async function getDeviceById(
  deviceId: number
): Promise<Device | undefined> {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);
    return result[0];
  });
}

export async function createDevice(device: InsertDevice): Promise<Device> {
  return mutateDb(async db => {
    const result = await db.insert(devices).values(device);
    return { ...device, id: Number(result[0].insertId) } as Device;
  });
}

export async function updateDevice(
  deviceId: number,
  updates: Partial<InsertDevice>
): Promise<void> {
  return mutateDb(async db => {
    await db.update(devices).set(updates).where(eq(devices.id, deviceId));
  });
}

export async function deleteDevice(deviceId: number): Promise<void> {
  return mutateDb(async db => {
    await db.delete(devices).where(eq(devices.id, deviceId));
  });
}

// ─── Vulnerabilities ──────────────────────────────────────────────────────────
export async function getOrgVulnerabilities(
  orgId: number
): Promise<Vulnerability[]> {
  return queryDb([], async db => {
    return db
      .select()
      .from(vulnerabilities)
      .where(eq(vulnerabilities.orgId, orgId))
      .orderBy(desc(vulnerabilities.createdAt));
  });
}

export async function getVulnerabilityById(
  vulnId: number
): Promise<Vulnerability | undefined> {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(vulnerabilities)
      .where(eq(vulnerabilities.id, vulnId))
      .limit(1);
    return result[0];
  });
}

export async function createVulnerability(
  vuln: InsertVulnerability
): Promise<Vulnerability> {
  return mutateDb(async db => {
    const result = await db.insert(vulnerabilities).values(vuln);
    return { ...vuln, id: Number(result[0].insertId) } as Vulnerability;
  });
}

export async function updateVulnerability(
  vulnId: number,
  updates: Partial<InsertVulnerability>
): Promise<void> {
  return mutateDb(async db => {
    await db
      .update(vulnerabilities)
      .set(updates)
      .where(eq(vulnerabilities.id, vulnId));
  });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getOrgAlerts(orgId: number): Promise<Alert[]> {
  return queryDb([], async db => {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.orgId, orgId))
      .orderBy(desc(alerts.createdAt));
  });
}

export async function updateAlert(
  alertId: number,
  updates: Partial<typeof alerts.$inferInsert>
): Promise<void> {
  return mutateDb(async db => {
    await db.update(alerts).set(updates).where(eq(alerts.id, alertId));
  });
}

// ─── Agent Runs ───────────────────────────────────────────────────────────────
export async function getOrgAgentRuns(orgId: number): Promise<AgentRun[]> {
  return queryDb([], async db => {
    return db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.orgId, orgId))
      .orderBy(desc(agentRuns.createdAt));
  });
}

export async function createAgentRun(
  run: typeof agentRuns.$inferInsert
): Promise<AgentRun> {
  return mutateDb(async db => {
    const result = await db.insert(agentRuns).values(run);
    return { ...run, id: Number(result[0].insertId) } as AgentRun;
  });
}

export async function updateAgentRun(
  runId: number,
  updates: Partial<typeof agentRuns.$inferInsert>
): Promise<void> {
  return mutateDb(async db => {
    await db.update(agentRuns).set(updates).where(eq(agentRuns.id, runId));
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────
export async function getOrgApiKeys(orgId: number) {
  return queryDb([], async db => {
    return db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, orgId)))
      .orderBy(desc(apiKeys.createdAt));
  });
}

export async function createApiKey(key: typeof apiKeys.$inferInsert) {
  return mutateDb(async db => {
    const result = await db.insert(apiKeys).values(key);
    return { ...key, id: Number(result[0].insertId) };
  });
}

export async function revokeApiKey(keyId: number): Promise<void> {
  return mutateDb(async db => {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, keyId));
  });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function createSession(session: typeof sessions.$inferInsert) {
  return mutateDb(async db => {
    const result = await db.insert(sessions).values(session);
    return { ...session, id: Number(result[0].insertId) };
  });
}

export async function getSessionByToken(token: string) {
  return queryDb(undefined, async db => {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);
    return result[0];
  });
}

export async function revokeSession(sessionId: number) {
  return mutateDb(async db => {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  });
}

export async function revokeAllUserSessions(userId: number) {
  return mutateDb(async db => {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, userId));
  });
}
