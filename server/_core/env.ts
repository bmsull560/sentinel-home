import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().optional().default(""),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  VITE_APP_ID: z.string().optional(),
  VITE_OAUTH_PORTAL_URL: z.string().url().optional().or(z.literal("")),
  OAUTH_SERVER_URL: z.string().url().optional().or(z.literal("")),
  OWNER_OPEN_ID: z.string().optional(),
  DEV_BYPASS_AUTH: z.enum(["true", "false"]).default("false"),
  BUILT_IN_FORGE_API_URL: z.string().url().optional().or(z.literal("")),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  NVD_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().or(z.literal("")),
  OTEL_SDK_DISABLED: z.enum(["true", "false"]).default("false"),
  OTEL_TRACES_SAMPLER: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map(i => `${i.path.join(".")}: ${i.message}`)
    .join("\n  ");
  if (process.env.NODE_ENV !== "test") {
    console.error("[ENV] Invalid environment variables:\n  " + issues);
  }
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

const raw = parsed.success
  ? parsed.data
  : (process.env as Record<string, string>);

const str = (value: string | undefined): string => value ?? "";

export const ENV = {
  appId: str(raw.VITE_APP_ID),
  cookieSecret: str(raw.JWT_SECRET),
  databaseUrl: str(raw.DATABASE_URL),
  oAuthServerUrl: str(raw.OAUTH_SERVER_URL),
  ownerOpenId: str(raw.OWNER_OPEN_ID),
  isProduction: raw.NODE_ENV === "production",
  devBypassAuth: raw.DEV_BYPASS_AUTH === "true",
  forgeApiUrl: str(raw.BUILT_IN_FORGE_API_URL),
  forgeApiKey: str(raw.BUILT_IN_FORGE_API_KEY),
  nvdApiKey: str(raw.NVD_API_KEY),
  redisUrl: raw.REDIS_URL,
  otelServiceName: str(raw.OTEL_SERVICE_NAME),
  otelExporterEndpoint: str(raw.OTEL_EXPORTER_OTLP_ENDPOINT),
  otelSdkDisabled: raw.OTEL_SDK_DISABLED,
  otelTracesSampler: str(raw.OTEL_TRACES_SAMPLER),
  otelTracesSamplerArg: str(raw.OTEL_TRACES_SAMPLER_ARG),
  logLevel: raw.LOG_LEVEL,
};
