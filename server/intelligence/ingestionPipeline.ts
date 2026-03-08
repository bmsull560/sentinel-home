/**
 * Ingestion Pipeline Orchestrator
 *
 * Coordinates the full data flow:
 *   1. Fetch CISA KEV catalog → upsert kev_catalog table
 *   2. Fetch NVD CVEs (incremental delta or full range)
 *   3. Enrich each CVE with KEV status
 *   4. Upsert into nvd_cve_cache
 *   5. For every org, match CVEs to devices using cpeMatchEngine
 *   6. Upsert device_cve_matches
 *   7. Create org vulnerabilities + alerts for high-risk new matches
 *   8. Update device status (secure / at_risk / critical)
 *   9. Log the ingestion run to ingestion_runs table
 */

import { getDb } from "../db";
import {
  nvdCveCache,
  kevCatalog,
  deviceCveMatches,
  ingestionRuns,
  devices,
  vulnerabilities,
  alerts,
  organizations,
  orgMembers,
} from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { fetchNvdCvesByLastModified, fetchNvdRecentCves, type NvdCveItem } from "./nvdClient";
import { fetchKevCatalog, buildKevLookupMap, type KevEntry } from "./kevFetcher";
import {
  matchCveToDevices,
  calculateSentinelRiskScore,
  sentinelRiskToSeverity,
} from "./cpeMatchEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestionOptions {
  /** "incremental" uses lastModified delta; "recent" fetches last N days; "full" fetches a wide range */
  mode: "incremental" | "recent" | "full";
  /** For "recent" mode: how many days back to fetch */
  daysBack?: number;
  /** For "incremental" mode: start date for delta */
  sinceDate?: Date;
  /** Callback for progress reporting */
  onProgress?: (stage: string, detail: string) => void;
}

export interface IngestionResult {
  runId: number;
  cvesFetched: number;
  cvesInserted: number;
  cvesUpdated: number;
  kevEntriesUpserted: number;
  matchesCreated: number;
  alertsGenerated: number;
  durationMs: number;
}

// ─── KEV Ingestion ────────────────────────────────────────────────────────────

async function ingestKevCatalog(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  onProgress?: (stage: string, detail: string) => void
): Promise<{ upserted: number; kevMap: Map<string, KevEntry> }> {
  onProgress?.("kev", "Fetching CISA KEV catalog...");
  const catalog = await fetchKevCatalog();
  const kevMap = new Map<string, KevEntry>();

  let upserted = 0;
  const BATCH = 100;

  for (let i = 0; i < catalog.vulnerabilities.length; i += BATCH) {
    const batch = catalog.vulnerabilities.slice(i, i + BATCH);

    for (const entry of batch) {
      kevMap.set(entry.cveId, entry);
      await db.insert(kevCatalog).values({
        cveId: entry.cveId,
        vendorProject: entry.vendorProject,
        product: entry.product,
        vulnerabilityName: entry.vulnerabilityName,
        dateAdded: entry.dateAdded,
        shortDescription: entry.shortDescription,
        requiredAction: entry.requiredAction,
        dueDate: entry.dueDate,
        knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse,
        notes: entry.notes,
      }).onDuplicateKeyUpdate({
        set: {
          vendorProject: entry.vendorProject,
          product: entry.product,
          vulnerabilityName: entry.vulnerabilityName,
          requiredAction: entry.requiredAction,
          dueDate: entry.dueDate,
          knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse,
          notes: entry.notes,
        },
      });
      upserted++;
    }
  }

  onProgress?.("kev", `KEV catalog: ${upserted} entries upserted`);
  return { upserted, kevMap };
}

// ─── NVD CVE Ingestion ────────────────────────────────────────────────────────

async function ingestNvdCves(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  cves: NvdCveItem[],
  kevMap: Map<string, KevEntry>,
  onProgress?: (stage: string, detail: string) => void
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const cve of cves) {
    const kevEntry = kevMap.get(cve.cveId);
    const isKev = !!kevEntry;

    const row = {
      cveId: cve.cveId,
      cvssV3Score: cve.cvssV3Score,
      cvssV3Vector: cve.cvssV3Vector,
      cvssV3Severity: cve.cvssV3Severity,
      attackVector: cve.attackVector,
      attackComplexity: cve.attackComplexity,
      privilegesRequired: cve.privilegesRequired,
      userInteraction: cve.userInteraction,
      confidentialityImpact: cve.confidentialityImpact,
      integrityImpact: cve.integrityImpact,
      availabilityImpact: cve.availabilityImpact,
      description: cve.description,
      cpeMatches: cve.cpeMatches as any,
      affectedVendors: cve.affectedVendors as any,
      isKev,
      kevDateAdded: kevEntry?.dateAdded ?? null,
      kevDueDate: kevEntry?.dueDate ?? null,
      kevKnownRansomwareUse: kevEntry?.knownRansomwareCampaignUse ?? null,
      kevRequiredAction: kevEntry?.requiredAction ?? null,
      exploitAvailable: false,
      patchAvailable: false,
      nvdPublishedAt: cve.publishedAt,
      nvdLastModifiedAt: cve.lastModifiedAt,
    };

    // Check if exists
    const existing = await db
      .select({ id: nvdCveCache.id })
      .from(nvdCveCache)
      .where(eq(nvdCveCache.cveId, cve.cveId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(nvdCveCache).values(row);
      inserted++;
    } else {
      await db.update(nvdCveCache).set(row).where(eq(nvdCveCache.cveId, cve.cveId));
      updated++;
    }
  }

  onProgress?.("nvd", `NVD: ${inserted} inserted, ${updated} updated`);
  return { inserted, updated };
}

// ─── Device Matching ──────────────────────────────────────────────────────────

async function matchAndAlert(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  cves: NvdCveItem[],
  kevMap: Map<string, KevEntry>,
  onProgress?: (stage: string, detail: string) => void
): Promise<{ matchesCreated: number; alertsGenerated: number }> {
  let matchesCreated = 0;
  let alertsGenerated = 0;

  // Get all orgs
  const orgs = await db.select({ id: organizations.id }).from(organizations);

  for (const org of orgs) {
    // Get all devices for this org
    const orgDevices = await db
      .select({
        id: devices.id,
        orgId: devices.orgId,
        name: devices.name,
        manufacturer: devices.manufacturer,
        model: devices.model,
        matchedCpeVendor: devices.matchedCpeVendor,
        matchedCpeProduct: devices.matchedCpeProduct,
      })
      .from(devices)
      .where(eq(devices.orgId, org.id));

    if (orgDevices.length === 0) continue;

    for (const cve of cves) {
      const isKev = kevMap.has(cve.cveId);
      const matches = matchCveToDevices(cve, orgDevices, isKev);

      for (const match of matches) {
        // Skip low-confidence matches (< 50)
        if (match.confidenceScore < 50) continue;

        // Check if this match already exists
        const existingMatch = await db
          .select({ id: deviceCveMatches.id, alertGenerated: deviceCveMatches.alertGenerated })
          .from(deviceCveMatches)
          .where(
            and(
              eq(deviceCveMatches.deviceId, match.deviceId),
              eq(deviceCveMatches.cveId, match.cveId)
            )
          )
          .limit(1);

        if (existingMatch.length > 0) {
          // Update risk score if changed
          await db
            .update(deviceCveMatches)
            .set({
              sentinelRiskScore: match.sentinelRiskScore,
              isKev: match.isKev,
              confidenceScore: match.confidenceScore,
            })
            .where(eq(deviceCveMatches.id, existingMatch[0].id));
          continue;
        }

        // Create vulnerability record in org's vulnerabilities table
        const severity = sentinelRiskToSeverity(match.sentinelRiskScore);
        const [vulnResult] = await db.insert(vulnerabilities).values({
          orgId: org.id,
          deviceId: match.deviceId,
          cveId: match.cveId,
          title: `${match.cveId}: ${cve.description?.slice(0, 100) ?? "Vulnerability detected"}`,
          description: cve.description,
          severity,
          cvssScore: match.cvssScore,
          attackVector: cve.attackVector,
          isKev: match.isKev,
          exploitAvailable: match.exploitAvailable,
          patchAvailable: match.patchAvailable,
          publishedAt: cve.publishedAt,
          status: "open",
        });

        const vulnerabilityId = (vulnResult as any).insertId as number;

        // Create device_cve_match record
        const [matchResult] = await db.insert(deviceCveMatches).values({
          deviceId: match.deviceId,
          orgId: org.id,
          cveId: match.cveId,
          matchStrategy: match.matchStrategy,
          confidenceScore: match.confidenceScore,
          sentinelRiskScore: match.sentinelRiskScore,
          cvssScore: match.cvssScore,
          isKev: match.isKev,
          exploitAvailable: match.exploitAvailable,
          patchAvailable: match.patchAvailable,
          alertGenerated: false,
          vulnerabilityId,
        });

        matchesCreated++;

        // Generate alert for action_recommended or immediate_attention
        if (severity === "action_recommended" || severity === "immediate_attention") {
          const alertSeverity = severity === "immediate_attention" ? "critical" : "warning";
          const kevNote = match.isKev ? " (CISA KEV — actively exploited in the wild)" : "";
          const title = severity === "immediate_attention"
            ? `🚨 Critical vulnerability on your device${kevNote}`
            : `⚠️ Action recommended for your device`;

          const device = orgDevices.find(d => d.id === match.deviceId);
          const deviceName = device?.name ?? "Unknown device";

          const [alertResult] = await db.insert(alerts).values({
            orgId: org.id,
            deviceId: match.deviceId,
            vulnerabilityId,
            title,
            message: `${match.cveId} affects your ${deviceName}. CVSS score: ${match.cvssScore ?? "N/A"}. ${cve.description?.slice(0, 200) ?? ""}`,
            severity: alertSeverity,
            status: "unread",
          });

          const alertId = (alertResult as any).insertId as number;

          // Update match with alert ID
          await db
            .update(deviceCveMatches)
            .set({ alertGenerated: true, alertId })
            .where(
              and(
                eq(deviceCveMatches.deviceId, match.deviceId),
                eq(deviceCveMatches.cveId, match.cveId)
              )
            );

          alertsGenerated++;
        }

        // Update device status based on highest severity match
        const newStatus = severity === "immediate_attention"
          ? "critical"
          : severity === "action_recommended"
          ? "at_risk"
          : undefined;

        if (newStatus) {
          await db
            .update(devices)
            .set({ status: newStatus })
            .where(eq(devices.id, match.deviceId));
        }
      }
    }
  }

  onProgress?.("match", `Matching: ${matchesCreated} new matches, ${alertsGenerated} alerts`);
  return { matchesCreated, alertsGenerated };
}

// ─── Main Pipeline Entry Point ────────────────────────────────────────────────

export async function runIngestionPipeline(
  options: IngestionOptions
): Promise<IngestionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startedAt = new Date();
  const startMs = Date.now();

  // Create ingestion run record
  const [runResult] = await db.insert(ingestionRuns).values({
    source: "full_sync",
    status: "running",
    cvesFetched: 0,
    cvesInserted: 0,
    cvesUpdated: 0,
    matchesCreated: 0,
    alertsGenerated: 0,
  });
  const runId = (runResult as any).insertId as number;

  try {
    // Step 1: Ingest CISA KEV catalog
    const { upserted: kevEntriesUpserted, kevMap } = await ingestKevCatalog(
      db,
      options.onProgress
    );

    // Step 2: Fetch NVD CVEs
    options.onProgress?.("nvd", "Fetching CVEs from NVD...");
    let cves: NvdCveItem[];

    if (options.mode === "incremental" && options.sinceDate) {
      cves = await fetchNvdCvesByLastModified(options.sinceDate, new Date(), options.onProgress
        ? (fetched, total) => options.onProgress!("nvd", `Fetched ${fetched}/${total} CVEs...`)
        : undefined
      );
    } else {
      const daysBack = options.daysBack ?? 7;
      cves = await fetchNvdRecentCves(daysBack, options.onProgress
        ? (fetched, total) => options.onProgress!("nvd", `Fetched ${fetched}/${total} CVEs...`)
        : undefined
      );
    }

    options.onProgress?.("nvd", `Fetched ${cves.length} CVEs total`);

    // Step 3: Ingest CVEs into cache
    const { inserted: cvesInserted, updated: cvesUpdated } = await ingestNvdCves(
      db,
      cves,
      kevMap,
      options.onProgress
    );

    // Step 4: Match CVEs to org devices and generate alerts
    const { matchesCreated, alertsGenerated } = await matchAndAlert(
      db,
      cves,
      kevMap,
      options.onProgress
    );

    const durationMs = Date.now() - startMs;

    // Update ingestion run as completed
    await db.update(ingestionRuns).set({
      status: "completed",
      cvesFetched: cves.length,
      cvesInserted,
      cvesUpdated,
      matchesCreated,
      alertsGenerated,
      completedAt: new Date(),
    }).where(eq(ingestionRuns.id, runId));

    return {
      runId,
      cvesFetched: cves.length,
      cvesInserted,
      cvesUpdated,
      kevEntriesUpserted,
      matchesCreated,
      alertsGenerated,
      durationMs,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await db.update(ingestionRuns).set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    }).where(eq(ingestionRuns.id, runId));
    throw err;
  }
}

/**
 * Get the last successful ingestion run date.
 * Used to determine the delta window for incremental updates.
 */
export async function getLastIngestionDate(): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ completedAt: ingestionRuns.completedAt })
    .from(ingestionRuns)
    .where(eq(ingestionRuns.status, "completed"))
    .orderBy(sql`${ingestionRuns.startedAt} DESC`)
    .limit(1);

  return result[0]?.completedAt ?? null;
}

/**
 * Get all ingestion run history.
 */
export async function getIngestionRuns(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(ingestionRuns)
    .orderBy(sql`${ingestionRuns.startedAt} DESC`)
    .limit(limit);
}

/**
 * Get device CVE matches for an org with full CVE details.
 */
export async function getOrgCveMatches(orgId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      matchId: deviceCveMatches.id,
      deviceId: deviceCveMatches.deviceId,
      cveId: deviceCveMatches.cveId,
      matchStrategy: deviceCveMatches.matchStrategy,
      confidenceScore: deviceCveMatches.confidenceScore,
      sentinelRiskScore: deviceCveMatches.sentinelRiskScore,
      cvssScore: deviceCveMatches.cvssScore,
      isKev: deviceCveMatches.isKev,
      exploitAvailable: deviceCveMatches.exploitAvailable,
      patchAvailable: deviceCveMatches.patchAvailable,
      alertGenerated: deviceCveMatches.alertGenerated,
      matchedAt: deviceCveMatches.matchedAt,
      // Device info
      deviceName: devices.name,
      deviceManufacturer: devices.manufacturer,
      deviceModel: devices.model,
      // CVE details from cache
      cveDescription: nvdCveCache.description,
      cvssV3Severity: nvdCveCache.cvssV3Severity,
      attackVector: nvdCveCache.attackVector,
      nvdPublishedAt: nvdCveCache.nvdPublishedAt,
    })
    .from(deviceCveMatches)
    .leftJoin(devices, eq(deviceCveMatches.deviceId, devices.id))
    .leftJoin(nvdCveCache, eq(deviceCveMatches.cveId, nvdCveCache.cveId))
    .where(eq(deviceCveMatches.orgId, orgId))
    .orderBy(sql`${deviceCveMatches.sentinelRiskScore} DESC`)
    .limit(200);
}
