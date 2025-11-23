import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Device categories for connected devices
 */
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", [
    "smart_home",
    "iot",
    "mobile",
    "laptop",
    "router",
    "automotive",
    "health",
    "child_pet"
  ]).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  firmwareVersion: varchar("firmwareVersion", { length: 100 }),
  status: mysqlEnum("status", ["secure", "at_risk", "unknown"]).default("unknown").notNull(),
  lastChecked: timestamp("lastChecked").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Vulnerabilities and CVE tracking
 */
export const vulnerabilities = mysqlTable("vulnerabilities", {
  id: int("id").autoincrement().primaryKey(),
  cveId: varchar("cveId", { length: 50 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  severity: mysqlEnum("severity", ["calm", "be_aware", "action_recommended", "immediate_attention"]).notNull(),
  affectedDevices: text("affectedDevices"), // JSON array of device categories or models
  manufacturer: varchar("manufacturer", { length: 255 }),
  discoveredAt: timestamp("discoveredAt").notNull(),
  patchAvailable: boolean("patchAvailable").default(false).notNull(),
  patchDetails: text("patchDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = typeof vulnerabilities.$inferInsert;

/**
 * Alerts for users about specific vulnerabilities affecting their devices
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: int("deviceId"),
  vulnerabilityId: int("vulnerabilityId").notNull(),
  status: mysqlEnum("status", ["new", "acknowledged", "resolved", "dismissed"]).default("new").notNull(),
  actionTaken: text("actionTaken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Notifications for gentle nudges and updates
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "action_required", "resolved"]).notNull(),
  read: boolean("read").default(false).notNull(),
  relatedAlertId: int("relatedAlertId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Action plans for remediation steps
 */
export const actionPlans = mysqlTable("actionPlans", {
  id: int("id").autoincrement().primaryKey(),
  vulnerabilityId: int("vulnerabilityId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  steps: text("steps").notNull(), // JSON array of step objects
  difficulty: mysqlEnum("difficulty", ["easy", "moderate", "advanced"]).notNull(),
  estimatedTime: varchar("estimatedTime", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = typeof actionPlans.$inferInsert;
