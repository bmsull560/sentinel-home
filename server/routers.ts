import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import {
  runIngestionPipeline,
  getIngestionRuns,
  getLastIngestionDate,
  getOrgCveMatches,
} from "./intelligence/ingestionPipeline";
import { fetchNvdCveById } from "./intelligence/nvdClient";
import { getSchedulerState } from "./intelligence/scheduler";
import { nvdCveCache, kevCatalog, deviceCveMatches, ingestionRuns } from "../drizzle/schema";
import { eq, desc, sql, and, like } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireOrgAccess(userId: number, orgId: number, minRole?: "admin" | "owner") {
  if (ENV.devBypassAuth) {
    return "owner" as const;
  }

  const role = await db.getUserOrgRole(orgId, userId);
  if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  if (minRole === "owner" && role !== "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  if (minRole === "admin" && role === "viewer") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return role;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Organizations ─────────────────────────────────────────────────────────
  org: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserOrgs(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getOrgBySlug(input.slug);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug already taken" });
        const org = await db.createOrg({ name: input.name, slug: input.slug });
        await db.addOrgMember(org.id, ctx.user.id, "owner");
        return org;
      }),

    get: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgById(input.orgId);
      }),

    update: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string().optional(),
        billingEmail: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        const { orgId, ...updates } = input;
        await db.updateOrg(orgId, updates);
        return { success: true };
      }),
  }),

  // ─── Members ───────────────────────────────────────────────────────────────
  members: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgMembers(input.orgId);
      }),

    updateRole: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        await db.updateOrgMemberRole(input.orgId, input.userId, input.role);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ orgId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        await db.removeOrgMember(input.orgId, input.userId);
        return { success: true };
      }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    overview: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        const [devs, alts, vulns] = await Promise.all([
          db.getOrgDevices(input.orgId),
          db.getOrgAlerts(input.orgId),
          db.getOrgVulnerabilities(input.orgId),
        ]);
        const urgentAlerts = alts.filter(a => a.status === "unread" && a.severity === "critical").length;
        const secureDevices = devs.filter(d => d.status === "secure").length;
        const atRiskDevices = devs.filter(d => d.status === "at_risk" || d.status === "critical").length;
        const criticalVulns = vulns.filter(v => v.severity === "immediate_attention").length;
        return {
          urgentAlerts,
          totalVulnerabilities: vulns.length,
          criticalVulnerabilities: criticalVulns,
          monitoredDevices: devs.length,
          secureDevices,
          atRiskDevices,
          threatSources: 5,
          recentAlerts: alts.slice(0, 5),
          recentVulns: vulns.slice(0, 5),
        };
      }),
  }),

  // ─── Devices ───────────────────────────────────────────────────────────────
  devices: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgDevices(input.orgId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getDeviceById(input.id)),

    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string(),
        category: z.enum(["smart_home", "iot", "mobile", "laptop", "router", "automotive", "health", "child_pet", "other"]),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        firmwareVersion: z.string().optional(),
        ipAddress: z.string().optional(),
        macAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        return db.createDevice(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        firmwareVersion: z.string().optional(),
        status: z.enum(["secure", "at_risk", "critical", "unknown"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateDevice(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDevice(input.id);
        return { success: true };
      }),
  }),

  // ─── Vulnerabilities ───────────────────────────────────────────────────────
  vulnerabilities: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgVulnerabilities(input.orgId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getVulnerabilityById(input.id)),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "acknowledged", "resolved", "wont_fix"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateVulnerability(input.id, { status: input.status });
        return { success: true };
      }),

    explain: protectedProcedure
      .input(z.object({
        vulnerabilityId: z.number(),
        technicalLevel: z.enum(["simple", "moderate", "technical"]).default("simple"),
      }))
      .mutation(async ({ input }) => {
        const vuln = await db.getVulnerabilityById(input.vulnerabilityId);
        if (!vuln) throw new TRPCError({ code: "NOT_FOUND", message: "Vulnerability not found" });

        const systemPrompt = `You are a calm, empowering security expert named Sentinel. Explain vulnerabilities in a way that is:
- Clear and honest, but never alarming
- Appropriate for a ${input.technicalLevel} technical level
- Focused on what the user should do, not fear
- Using everyday metaphors when helpful ("Think of this like keeping your smoke detector updated.")

Follow this structure:
1. What happened (simple explanation, 1-2 sentences)
2. Why it matters (risk framing, calm tone)
3. Who is affected (device, firmware, vendor)
4. What you should do (clear action steps, numbered list)
${input.technicalLevel === "technical" ? "5. Technical details (CVE, attack vector, CVSS)" : ""}

End with a reassuring closing sentence.`;

        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemPrompt as string },
            { role: "user" as const, content: `Explain this vulnerability:\n\nTitle: ${vuln.title}\nDescription: ${vuln.description || "N/A"}\nSeverity: ${vuln.severity}\nCVE: ${vuln.cveId || "N/A"}\nCVSS Score: ${vuln.cvssScore || "N/A"}` as string },
          ],
        });

        const explanation = (response.choices[0]?.message?.content as string) || "Unable to generate explanation at this time.";
        await db.updateVulnerability(input.vulnerabilityId, { aiExplanation: explanation });
        return { explanation };
      }),
  }),

  // ─── Alerts ────────────────────────────────────────────────────────────────
  alerts: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgAlerts(input.orgId);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["unread", "read", "acknowledged", "dismissed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateAlert(input.id, {
          status: input.status,
          ...(input.status === "acknowledged" ? { acknowledgedBy: ctx.user.id, acknowledgedAt: new Date() } : {}),
        });
        return { success: true };
      }),
  }),

  // ─── Agent Runs ────────────────────────────────────────────────────────────
  agentRuns: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return db.getOrgAgentRuns(input.orgId);
      }),

    trigger: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        intent: z.string().min(5).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        const run = await db.createAgentRun({
          orgId: input.orgId,
          triggeredBy: ctx.user.id,
          intent: input.intent,
          status: "running",
        });

        // Run agent loop
        const startTime = Date.now();
        try {
          const agentTrace = [
            { agent: "Orchestrator", action: "Parsing user intent", timestamp: new Date().toISOString() },
            { agent: "Mapper", action: "Identifying relevant devices and CVEs", timestamp: new Date().toISOString() },
            { agent: "Explainer", action: "Generating technical-but-safe description", timestamp: new Date().toISOString() },
            { agent: "Sculptor", action: "Preparing UI experience", timestamp: new Date().toISOString() },
            { agent: "Narrator", action: "Creating human-centric summary", timestamp: new Date().toISOString() },
            { agent: "Guardian", action: "Performing ethical/safety pass", timestamp: new Date().toISOString() },
          ];

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are the Sentinel multi-agent orchestrator. You coordinate a team of agents:
- Orchestrator (The Guide): Parses intent, maintains context, normalizes tone
- Mapper (Device Intelligence): Maps devices to vulnerabilities, classifies severity
- Explainer (Security Expert): Provides safe, responsible technical explanations
- Sculptor (UX Architect): Converts intelligence into visual/interactive structures
- Narrator (Storytelling): Creates human-readable summaries and gentle nudges
- Guardian (Ethics & Safety): Removes alarmism, ensures privacy

Respond in a calm, empowering, non-alarming tone. Structure your response as:
1. Summary (2-3 sentences)
2. Key findings
3. Recommended actions (numbered, simple)
4. Reassurance`,
              },
              { role: "user" as const, content: input.intent as string },
            ],
          });

          const result = (response.choices[0]?.message?.content as string) || "Agent run completed.";
          const durationMs = Date.now() - startTime;

          await db.updateAgentRun(run.id, {
            status: "completed",
            result,
            agentTrace,
            tokensUsed: response.usage?.total_tokens,
            durationMs,
            completedAt: new Date(),
          });

          return { runId: run.id, result, agentTrace };
        } catch (err) {
          await db.updateAgentRun(run.id, { status: "failed", completedAt: new Date() });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Agent run failed" });
        }
      }),
  }),

  // ─── API Keys ──────────────────────────────────────────────────────────────
  apiKeys: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        const keys = await db.getOrgApiKeys(input.orgId);
        return keys.map(k => ({ ...k, keyHash: undefined })); // never expose hash
      }),

    create: protectedProcedure
      .input(z.object({ orgId: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        const rawKey = `sk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
        const prefix = rawKey.slice(0, 12);
        // In production use crypto.createHash('sha256')
        const keyHash = Buffer.from(rawKey).toString("base64");
        await db.createApiKey({
          orgId: input.orgId,
          name: input.name,
          keyHash,
          keyPrefix: prefix,
          createdBy: ctx.user.id,
        });
        return { key: rawKey, prefix }; // only returned once
      }),

    revoke: protectedProcedure
      .input(z.object({ orgId: z.number(), keyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        await db.revokeApiKey(input.keyId);
        return { success: true };
      }),
  }),

  // ─── Billing ───────────────────────────────────────────────────────────────
  // ─── Intelligence / Ingestion ────────────────────────────────────────────
  intelligence: router({
    // Get ingestion run history
    runs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx }) => {
        return getIngestionRuns(20);
      }),

    // Get last ingestion date
    lastIngestion: protectedProcedure
      .query(async () => {
        return getLastIngestionDate();
      }),

    // Trigger a new ingestion run (admin only)
    triggerIngestion: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        mode: z.enum(["recent", "incremental"]).default("recent"),
        daysBack: z.number().min(1).max(30).default(7),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId, "admin");
        // Run in background — don't await
        const progressLog: string[] = [];
        runIngestionPipeline({
          mode: input.mode,
          daysBack: input.daysBack,
          onProgress: (stage, detail) => {
            progressLog.push(`[${stage}] ${detail}`);
            console.log(`[Ingestion] ${stage}: ${detail}`);
          },
        }).catch(err => console.error("[Ingestion] Pipeline failed:", err));
        return { started: true, message: `Ingestion started (${input.mode}, last ${input.daysBack} days)` };
      }),

    // Get CVE matches for an org
    orgMatches: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        return getOrgCveMatches(input.orgId);
      }),

    // Search NVD cache by keyword
    searchCves: protectedProcedure
      .input(z.object({
        query: z.string().min(2),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        return dbConn
          .select({
            cveId: nvdCveCache.cveId,
            description: nvdCveCache.description,
            cvssV3Score: nvdCveCache.cvssV3Score,
            cvssV3Severity: nvdCveCache.cvssV3Severity,
            isKev: nvdCveCache.isKev,
            attackVector: nvdCveCache.attackVector,
            nvdPublishedAt: nvdCveCache.nvdPublishedAt,
          })
          .from(nvdCveCache)
          .where(sql`${nvdCveCache.description} LIKE ${`%${input.query}%`} OR ${nvdCveCache.cveId} LIKE ${`%${input.query}%`}`)
          .orderBy(desc(nvdCveCache.nvdPublishedAt))
          .limit(input.limit);
      }),

    // Get KEV catalog stats
    kevStats: protectedProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) return { total: 0, withRansomware: 0, recentlyAdded: 0 };
        const [total] = await dbConn.select({ count: sql<number>`count(*)` }).from(kevCatalog);
        const [withRansomware] = await dbConn
          .select({ count: sql<number>`count(*)` })
          .from(kevCatalog)
          .where(eq(kevCatalog.knownRansomwareCampaignUse, "Known"));
        return {
          total: total?.count ?? 0,
          withRansomware: withRansomware?.count ?? 0,
        };
      }),

    // Get a single CVE detail (from cache or live NVD)
    getCve: protectedProcedure
      .input(z.object({ cveId: z.string() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (dbConn) {
          const cached = await dbConn
            .select()
            .from(nvdCveCache)
            .where(eq(nvdCveCache.cveId, input.cveId))
            .limit(1);
          if (cached.length > 0) return cached[0];
        }
        // Fall back to live NVD API
        return fetchNvdCveById(input.cveId);
      }),

    // Get live scheduler state (next run, last run, run counts)
    schedulerStatus: protectedProcedure
      .query(() => {
        const s = getSchedulerState();
        return {
          isRunning: s.isRunning,
          lastRunAt: s.lastRunAt,
          lastRunError: s.lastRunError,
          nextRunAt: s.nextRunAt,
          totalRuns: s.totalRuns,
          totalErrors: s.totalErrors,
          startedAt: s.startedAt,
          lastResult: s.lastRunResult
            ? {
                cvesFetched: s.lastRunResult.cvesFetched,
                cvesInserted: s.lastRunResult.cvesInserted,
                cvesUpdated: s.lastRunResult.cvesUpdated,
                matchesCreated: s.lastRunResult.matchesCreated,
                alertsGenerated: s.lastRunResult.alertsGenerated,
                durationMs: s.lastRunResult.durationMs,
              }
            : null,
        };
      }),
  }),

  billing: router({
    get: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireOrgAccess(ctx.user.id, input.orgId);
        const org = await db.getOrgById(input.orgId);
        const devs = await db.getOrgDevices(input.orgId);
        const members = await db.getOrgMembers(input.orgId);
        return {
          plan: org?.plan ?? "free",
          planSeats: org?.planSeats ?? 3,
          planDevices: org?.planDevices ?? 10,
          usedSeats: members.length,
          usedDevices: devs.length,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
