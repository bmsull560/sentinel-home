import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const [devices, alerts, vulnerabilities] = await Promise.all([
        db.getUserDevices(userId),
        db.getUserAlerts(userId),
        db.getAllVulnerabilities(),
      ]);

      const urgentAlerts = alerts.filter(a => a.status === "new").length;
      const secureDevices = devices.filter(d => d.status === "secure").length;
      const atRiskDevices = devices.filter(d => d.status === "at_risk").length;

      return {
        urgentAlerts,
        totalVulnerabilities: vulnerabilities.length,
        monitoredDevices: devices.length,
        secureDevices,
        atRiskDevices,
        threatSources: 5, // Mock data for now
      };
    }),
  }),

  devices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDevices(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getDeviceById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum(["smart_home", "iot", "mobile", "laptop", "router", "automotive", "health", "child_pet"]),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        firmwareVersion: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createDevice({
          ...input,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        firmwareVersion: z.string().optional(),
        status: z.enum(["secure", "at_risk", "unknown"]).optional(),
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

  vulnerabilities: router({
    list: protectedProcedure.query(async () => {
      return db.getAllVulnerabilities();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getVulnerabilityById(input.id);
      }),

    explain: protectedProcedure
      .input(z.object({
        vulnerabilityId: z.number(),
        technicalLevel: z.enum(["simple", "moderate", "technical"]).default("simple"),
      }))
      .mutation(async ({ input }) => {
        const vuln = await db.getVulnerabilityById(input.vulnerabilityId);
        if (!vuln) throw new Error("Vulnerability not found");

        const systemPrompt = `You are a calm, empowering security expert. Explain vulnerabilities in a way that is:
- Clear and honest, but never alarming
- Appropriate for a ${input.technicalLevel} technical level
- Focused on what the user should do, not fear
- Using everyday metaphors when helpful

Follow this structure:
1. What happened (simple explanation)
2. Why it matters (risk framing)
3. Who is affected (devices, firmware, vendor)
4. What you should do (clear action steps)
${input.technicalLevel === "technical" ? "5. Technical details (for advanced users)" : ""}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Explain this vulnerability:\n\nTitle: ${vuln.title}\nDescription: ${vuln.description}\nSeverity: ${vuln.severity}\nCVE: ${vuln.cveId || "N/A"}` },
          ],
        });

        return {
          explanation: response.choices[0]?.message?.content || "Unable to generate explanation",
        };
      }),
  }),

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAlerts(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "acknowledged", "resolved", "dismissed"]),
        actionTaken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateAlert(id, updates);
        return { success: true };
      }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
