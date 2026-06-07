import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEV_USER_OPEN_ID = "sentinel-dev-bypass-openid";
const DEV_ORG_SLUG = "sentinel-dev-org";

async function getDevBypassUser(): Promise<User | null> {
  try {
    await db.upsertUser({
      openId: DEV_USER_OPEN_ID,
      name: "Sentinel Dev User",
      email: "dev@sentinel.local",
      loginMethod: "dev_bypass",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByOpenId(DEV_USER_OPEN_ID);
    if (!user) return null;

    const userOrgs = await db.getUserOrgs(user.id);
    if (userOrgs.length > 0) return user;

    let org = await db.getOrgBySlug(DEV_ORG_SLUG);
    if (!org) {
      org = await db.createOrg({
        name: "Sentinel Dev Org",
        slug: DEV_ORG_SLUG,
        plan: "starter",
      });
    }

    const role = await db.getUserOrgRole(org.id, user.id);
    if (!role) {
      await db.addOrgMember(org.id, user.id, "owner");
    }

    return user;
  } catch (error) {
    console.warn("[Auth] DEV_BYPASS_AUTH provisioning failed:", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (ENV.devBypassAuth) {
    user = await getDevBypassUser();
    if (!user) {
      user = {
        id: 0,
        openId: DEV_USER_OPEN_ID,
        name: "Sentinel Dev User",
        email: "dev@sentinel.local",
        loginMethod: "dev_bypass",
        role: "admin",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as User;
    }
  }

  try {
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
