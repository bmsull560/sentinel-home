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
  plan: mysqlEnum("plan", ["free", "starter", "pro", "enterprise"])
    .default("free")
    .notNull(),
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
  role: mysqlEnum("role", ["owner", "admin", "viewer"])
    .default("viewer")
    .notNull(),
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
    "smart_home",
    "iot",
    "mobile",
    "laptop",
    "router",
    "automotive",
    "health",
    "child_pet",
    "other",
  ])
    .default("other")
    .notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }),
  model: varchar("model", { length: 200 }),
  firmwareVersion: varchar("firmwareVersion", { length: 50 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  macAddress: varchar("macAddress", { length: 17 }),
  status: mysqlEnum("status", ["secure", "at_risk", "critical", "unknown"])
    .default("unknown")
    .notNull(),
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
  severity: mysqlEnum("severity", [
    "calm",
    "be_aware",
    "action_recommended",
    "immediate_attention",
  ])
    .default("calm")
    .notNull(),
  cvssScore: varchar("cvssScore", { length: 5 }),
  attackVector: varchar("attackVector", { length: 50 }),
  affectedFirmware: varchar("affectedFirmware", { length: 100 }),
  patchAvailable: boolean("patchAvailable").default(false),
  patchVersion: varchar("patchVersion", { length: 50 }),
  isKev: boolean("isKev").default(false),
  exploitAvailable: boolean("exploitAvailable").default(false),
  status: mysqlEnum("status", ["open", "acknowledged", "resolved", "wont_fix"])
    .default("open")
    .notNull(),
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
  severity: mysqlEnum("severity", ["info", "warning", "critical"])
    .default("info")
    .notNull(),
  status: mysqlEnum("status", ["unread", "read", "acknowledged", "dismissed"])
    .default("unread")
    .notNull(),
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
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"])
    .default("queued")
    .notNull(),
  agentTrace: json("agentTrace"),
  result: text("result"),
  tokensUsed: int("tokensUsed"),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type AgentRun = typeof agentRuns.$inferSelect;

// ─── NVD Raw CVE Cache ────────────────────────────────────────────────────────
// Stores the raw normalized data from NVD API v2 for every CVE we've ingested.
// This is the source of truth before matching to org devices.
export const nvdCveCache = mysqlTable("nvd_cve_cache", {
  id: int("id").autoincrement().primaryKey(),
  cveId: varchar("cveId", { length: 30 }).notNull().unique(),
  // CVSS v3 metrics
  cvssV3Score: varchar("cvssV3Score", { length: 5 }),
  cvssV3Vector: varchar("cvssV3Vector", { length: 100 }),
  cvssV3Severity: varchar("cvssV3Severity", { length: 20 }),
  attackVector: varchar("attackVector", { length: 20 }),
  attackComplexity: varchar("attackComplexity", { length: 20 }),
  privilegesRequired: varchar("privilegesRequired", { length: 20 }),
  userInteraction: varchar("userInteraction", { length: 20 }),
  confidentialityImpact: varchar("confidentialityImpact", { length: 20 }),
  integrityImpact: varchar("integrityImpact", { length: 20 }),
  availabilityImpact: varchar("availabilityImpact", { length: 20 }),
  // Description and metadata
  description: text("description"),
  // CPE matches (raw JSON from NVD)
  cpeMatches: json("cpeMatches"),
  // Affected vendor/product extracted for fast lookup
  affectedVendors: json("affectedVendors"),
  // CISA KEV enrichment
  isKev: boolean("isKev").default(false).notNull(),
  kevDateAdded: varchar("kevDateAdded", { length: 20 }),
  kevDueDate: varchar("kevDueDate", { length: 20 }),
  kevKnownRansomwareUse: varchar("kevKnownRansomwareUse", { length: 10 }),
  kevRequiredAction: text("kevRequiredAction"),
  // Exploit intelligence
  exploitAvailable: boolean("exploitAvailable").default(false).notNull(),
  patchAvailable: boolean("patchAvailable").default(false).notNull(),
  // Timestamps
  nvdPublishedAt: timestamp("nvdPublishedAt"),
  nvdLastModifiedAt: timestamp("nvdLastModifiedAt"),
  ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NvdCveCache = typeof nvdCveCache.$inferSelect;
export type InsertNvdCveCache = typeof nvdCveCache.$inferInsert;

// ─── CISA KEV Catalog ─────────────────────────────────────────────────────────
// Full CISA Known Exploited Vulnerabilities catalog snapshot.
export const kevCatalog = mysqlTable("kev_catalog", {
  id: int("id").autoincrement().primaryKey(),
  cveId: varchar("cveId", { length: 30 }).notNull().unique(),
  vendorProject: varchar("vendorProject", { length: 200 }),
  product: varchar("product", { length: 200 }),
  vulnerabilityName: varchar("vulnerabilityName", { length: 300 }),
  dateAdded: varchar("dateAdded", { length: 20 }),
  shortDescription: text("shortDescription"),
  requiredAction: text("requiredAction"),
  dueDate: varchar("dueDate", { length: 20 }),
  knownRansomwareCampaignUse: varchar("knownRansomwareCampaignUse", {
    length: 10,
  }),
  notes: text("notes"),
  ingestedAt: timestamp("ingestedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KevCatalog = typeof kevCatalog.$inferSelect;
export type InsertKevCatalog = typeof kevCatalog.$inferInsert;

// ─── Device CVE Matches ───────────────────────────────────────────────────────
// Junction table: which CVEs match which devices, with confidence scores.
export const deviceCveMatches = mysqlTable("device_cve_matches", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  orgId: int("orgId").notNull(),
  cveId: varchar("cveId", { length: 30 }).notNull(),
  // Match strategy used
  matchStrategy: mysqlEnum("matchStrategy", [
    "exact_cpe",
    "fuzzy_cpe",
    "fingerprint",
    "vendor_product",
  ]).notNull(),
  // Confidence 0-100
  confidenceScore: int("confidenceScore").notNull(),
  // Sentinel composite risk score 0-100
  sentinelRiskScore: int("sentinelRiskScore").notNull(),
  // Denormalized for fast queries
  cvssScore: varchar("cvssScore", { length: 5 }),
  isKev: boolean("isKev").default(false).notNull(),
  exploitAvailable: boolean("exploitAvailable").default(false).notNull(),
  patchAvailable: boolean("patchAvailable").default(false).notNull(),
  // Alert generated?
  alertGenerated: boolean("alertGenerated").default(false).notNull(),
  alertId: int("alertId"),
  // Vuln record created in org's vulnerabilities table?
  vulnerabilityId: int("vulnerabilityId"),
  matchedAt: timestamp("matchedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeviceCveMatch = typeof deviceCveMatches.$inferSelect;
export type InsertDeviceCveMatch = typeof deviceCveMatches.$inferInsert;

// ─── Ingestion Run Log ────────────────────────────────────────────────────────
// Tracks every ingestion run for observability and debugging.
export const ingestionRuns = mysqlTable("ingestion_runs", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["nvd", "cisa_kev", "full_sync"]).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed"])
    .default("running")
    .notNull(),
  cvesFetched: int("cvesFetched").default(0).notNull(),
  cvesInserted: int("cvesInserted").default(0).notNull(),
  cvesUpdated: int("cvesUpdated").default(0).notNull(),
  matchesCreated: int("matchesCreated").default(0).notNull(),
  alertsGenerated: int("alertsGenerated").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type IngestionRun = typeof ingestionRuns.$inferSelect;
export type InsertIngestionRun = typeof ingestionRuns.$inferInsert;

// ─── Sessions ─────────────────────────────────────────────────────────────────
// Explicit server-side sessions for hardened auth (rotation + revocation).
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: int("userId").notNull(),
  openId: varchar("openId", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
