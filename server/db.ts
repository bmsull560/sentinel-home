import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  devices, Device, InsertDevice,
  vulnerabilities, Vulnerability, InsertVulnerability,
  alerts, Alert, InsertAlert,
  notifications, Notification, InsertNotification,
  actionPlans, ActionPlan, InsertActionPlan
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Device queries
export async function getUserDevices(userId: number): Promise<Device[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId));
}

export async function getDeviceById(deviceId: number): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
  return result[0];
}

export async function createDevice(device: InsertDevice): Promise<Device> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(devices).values(device);
  return { ...device, id: Number(result[0].insertId) } as Device;
}

export async function updateDevice(deviceId: number, updates: Partial<InsertDevice>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(devices).set(updates).where(eq(devices.id, deviceId));
}

export async function deleteDevice(deviceId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(devices).where(eq(devices.id, deviceId));
}

// Vulnerability queries
export async function getAllVulnerabilities(): Promise<Vulnerability[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vulnerabilities).orderBy(desc(vulnerabilities.discoveredAt));
}

export async function getVulnerabilityById(vulnId: number): Promise<Vulnerability | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vulnerabilities).where(eq(vulnerabilities.id, vulnId)).limit(1);
  return result[0];
}

export async function createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vulnerabilities).values(vuln);
  return { ...vuln, id: Number(result[0].insertId) } as Vulnerability;
}

// Alert queries
export async function getUserAlerts(userId: number): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
}

export async function getUrgentAlerts(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(alerts).where(
    and(eq(alerts.userId, userId), eq(alerts.status, "new"))
  );
  return result.length;
}

export async function createAlert(alert: InsertAlert): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(alert);
  return { ...alert, id: Number(result[0].insertId) } as Alert;
}

export async function updateAlert(alertId: number, updates: Partial<InsertAlert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alerts).set(updates).where(eq(alerts.id, alertId));
}

// Notification queries
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function createNotification(notification: InsertNotification): Promise<Notification> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(notification);
  return { ...notification, id: Number(result[0].insertId) } as Notification;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
}

// Action Plan queries
export async function getActionPlansByVulnerability(vulnId: number): Promise<ActionPlan[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(actionPlans).where(eq(actionPlans.vulnerabilityId, vulnId));
}

export async function createActionPlan(plan: InsertActionPlan): Promise<ActionPlan> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(actionPlans).values(plan);
  return { ...plan, id: Number(result[0].insertId) } as ActionPlan;
}
