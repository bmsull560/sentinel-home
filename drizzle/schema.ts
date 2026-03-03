import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Organizations (Tenants) ──────────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  logoUrl: text("logoUrl"),
  plan: mysqlEnum("plan", ["free", "starter", "pro", "enterprise"]).default("free").notNull(),
  planSeats: int("planSeats").default(3).notNull(),
  planDevices: int("planDevices").default(10).notNull(),
  billingEmail: varchar("billingEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Organization Members ─────────────────────────────────────────────────────
export const orgMembers = mysqlTable("org_members", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "viewer"]).default("viewer").notNull(),
  invitedBy: int("invitedBy"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
export type OrgMember = typeof orgMembers.$inferSelect;

// ─── Org Invitations ──────────────────────────────────────────────────────────
export const orgInvitations = mysqlTable("org_invitations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "viewer"]).default("viewer").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── API Keys ─────────────────────────────────────────────────────────────────
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

// ─── Devices ──────────────────────────────────────────────────────────────────
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: mysqlEnum("category", [
    "smart_home", "iot", "mobile", "laptop",
    "router", "automotive", "health", "child_pet", "other",
  ]).default("other").notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }),
  model: varchar("model", { length: 200 }),
  firmwareVersion: varchar("firmwareVersion", { length: 50 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  macAddress: varchar("macAddress", { length: 17 }),
  status: mysqlEnum("status", ["secure", "at_risk", "critical", "unknown"]).default("unknown").notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
  matchedCpeVendor: varchar("matchedCpeVendor", { length: 100 }),
  matchedCpeProduct: varchar("matchedCpeProduct", { length: 200 }),
  matchConfidence: int("matchConfidence"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// ─── Vulnerabilities ──────────────────────────────────────────────────────────
export const vulnerabilities = mysqlTable("vulnerabilities", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  deviceId: int("deviceId"),
  cveId: varchar("cveId", { length: 30 }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  plainDescription: text("plainDescription"),
  severity: mysqlEnum("severity", ["calm", "be_aware", "action_recommended", "immediate_attention"]).default("calm").notNull(),
  cvssScore: varchar("cvssScore", { length: 5 }),
  attackVector: varchar("attackVector", { length: 50 }),
  affectedFirmware: varchar("affectedFirmware", { length: 100 }),
  patchAvailable: boolean("patchAvailable").default(false),
  patchVersion: varchar("patchVersion", { length: 50 }),
  isKev: boolean("isKev").default(false),
  exploitAvailable: boolean("exploitAvailable").default(false),
  status: mysqlEnum("status", ["open", "acknowledged", "resolved", "wont_fix"]).default("open").notNull(),
  aiExplanation: text("aiExplanation"),
  actionSteps: json("actionSteps"),
  publishedAt: timestamp("publishedAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = typeof vulnerabilities.$inferInsert;

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  deviceId: int("deviceId"),
  vulnerabilityId: int("vulnerabilityId"),
  title: varchar("title", { length: 300 }).notNull(),
  message: text("message"),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  status: mysqlEnum("status", ["unread", "read", "acknowledged", "dismissed"]).default("unread").notNull(),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Alert = typeof alerts.$inferSelect;

// ─── Agent Runs ───────────────────────────────────────────────────────────────
export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  triggeredBy: int("triggeredBy"),
  intent: text("intent").notNull(),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).default("queued").notNull(),
  agentTrace: json("agentTrace"),
  result: text("result"),
  tokensUsed: int("tokensUsed"),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type AgentRun = typeof agentRuns.$inferSelect;
