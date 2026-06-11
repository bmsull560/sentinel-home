/**
 * CPE Normalization & Device Matching Engine
 *
 * Implements three matching strategies with confidence scores:
 *
 * 1. Exact CPE Match (confidence: 100)
 *    Device has a pre-discovered CPE string (from UPnP/SNMP/mDNS fingerprinting).
 *    Direct string comparison against NVD CPE criteria.
 *
 * 2. Fuzzy CPE Match (confidence: 70–90)
 *    Normalize vendor + product names, then compute Levenshtein similarity.
 *    Threshold: 0.80 similarity required.
 *
 * 3. Vendor/Product Keyword Match (confidence: 50–70)
 *    Substring match after normalization — catches "Ring" matching "ring_doorbell".
 *    Used as fallback when fuzzy score is below threshold.
 *
 * Sentinel Risk Score (0–100):
 *   Base: CVSS score × 10
 *   +50 if CVE is in CISA KEV catalog
 *   +25 if exploit is publicly available
 *   +20 if no patch is available
 *   +15 if attack vector is NETWORK
 *   +10 if no user interaction required
 *   Capped at 100.
 */

import type { Device } from "../../drizzle/schema";
import type { NvdCveItem, AffectedVendor } from "./nvdClient";

// ─── Vendor Alias Map ─────────────────────────────────────────────────────────
// Maps common user-facing brand names to their CPE vendor strings.
// Extend this as new device categories are added.
const VENDOR_ALIASES: Record<string, string[]> = {
  ring: ["ring", "amazon_ring", "amazon"],
  google: ["google", "nest", "google_nest"],
  apple: ["apple"],
  samsung: ["samsung", "samsung_electronics"],
  lg: ["lg", "lg_electronics"],
  sony: ["sony"],
  philips: ["philips", "philips_hue", "signify"],
  tp_link: ["tp-link", "tp_link", "tplink"],
  netgear: ["netgear"],
  asus: ["asus", "asustek"],
  linksys: ["linksys", "belkin"],
  d_link: ["d-link", "d_link", "dlink"],
  ubiquiti: ["ubiquiti", "ubnt", "ui"],
  hikvision: ["hikvision"],
  dahua: ["dahua"],
  wyze: ["wyze", "wyze_labs"],
  arlo: ["arlo", "arlo_technologies"],
  eufy: ["eufy", "anker", "anker_innovations"],
  ecobee: ["ecobee"],
  honeywell: ["honeywell", "resideo"],
  bosch: ["bosch"],
  siemens: ["siemens"],
  cisco: ["cisco"],
  fortinet: ["fortinet"],
  palo_alto: ["palo_alto_networks", "paloalto"],
  microsoft: ["microsoft"],
  intel: ["intel"],
  qualcomm: ["qualcomm"],
  broadcom: ["broadcom"],
  realtek: ["realtek"],
  mediatek: ["mediatek"],
  fitbit: ["fitbit", "google"],
  garmin: ["garmin"],
  withings: ["withings"],
  dexcom: ["dexcom"],
  abbott: ["abbott", "abbottlaboratories"],
};

// ─── Normalization Utilities ──────────────────────────────────────────────────

/**
 * Normalize a vendor or product name for comparison:
 * 1. Lowercase
 * 2. Remove special characters (keep alphanumeric and spaces)
 * 3. Replace spaces/hyphens/underscores with single underscore
 * 4. Trim
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s\-]+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .replace(/^_|_$/g, "");
}

/**
 * Resolve a user-provided vendor name to its canonical CPE vendor aliases.
 * Returns an array of possible CPE vendor strings to try.
 */
export function resolveVendorAliases(vendor: string): string[] {
  const normalized = normalizeName(vendor);

  // Direct match in alias map
  if (VENDOR_ALIASES[normalized]) {
    return VENDOR_ALIASES[normalized];
  }

  // Partial match — find any alias group that contains this vendor
  for (const [canonical, aliases] of Object.entries(VENDOR_ALIASES)) {
    if (aliases.some(a => a.includes(normalized) || normalized.includes(a))) {
      return aliases;
    }
  }

  // No alias found — return normalized name as-is
  return [normalized];
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Similarity score 0.0–1.0 using Levenshtein distance.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Match Result ─────────────────────────────────────────────────────────────

export interface DeviceMatchResult {
  deviceId: number;
  orgId: number;
  cveId: string;
  matchStrategy: "exact_cpe" | "fuzzy_cpe" | "fingerprint" | "vendor_product";
  confidenceScore: number;
  sentinelRiskScore: number;
  cvssScore: string | null;
  isKev: boolean;
  exploitAvailable: boolean;
  patchAvailable: boolean;
  matchedVendor: string;
  matchedProduct: string;
}

// ─── Sentinel Risk Score ──────────────────────────────────────────────────────

export function calculateSentinelRiskScore(params: {
  cvssScore: string | null;
  isKev: boolean;
  exploitAvailable: boolean;
  patchAvailable: boolean;
  attackVector: string | null;
  userInteraction: string | null;
}): number {
  const cvss = parseFloat(params.cvssScore ?? "0");
  let score = isNaN(cvss) ? 0 : cvss * 10; // 0–100 base

  if (params.isKev) score += 50;
  if (params.exploitAvailable) score += 25;
  if (!params.patchAvailable) score += 20;
  if (params.attackVector === "NETWORK") score += 15;
  if (params.userInteraction === "NONE") score += 10;

  return Math.min(Math.round(score), 100);
}

// ─── Severity Tier Mapping ────────────────────────────────────────────────────

export function sentinelRiskToSeverity(
  riskScore: number
): "calm" | "be_aware" | "action_recommended" | "immediate_attention" {
  if (riskScore >= 80) return "immediate_attention";
  if (riskScore >= 55) return "action_recommended";
  if (riskScore >= 30) return "be_aware";
  return "calm";
}

// ─── Core Matching Engine ─────────────────────────────────────────────────────

/**
 * Match a single CVE against a list of org devices.
 * Returns all matches with confidence scores.
 */
export function matchCveToDevices(
  cve: NvdCveItem,
  devices: Pick<
    Device,
    | "id"
    | "orgId"
    | "manufacturer"
    | "model"
    | "matchedCpeVendor"
    | "matchedCpeProduct"
  >[],
  isKev: boolean = false
): DeviceMatchResult[] {
  const results: DeviceMatchResult[] = [];

  for (const device of devices) {
    const match = matchDeviceToCve(device, cve, isKev);
    if (match) results.push(match);
  }

  return results;
}

/**
 * Match a single device against a single CVE.
 * Tries strategies in order: exact CPE → fuzzy CPE → vendor/product keyword.
 * Returns the best match or null if no match found.
 */
export function matchDeviceToCve(
  device: Pick<
    Device,
    | "id"
    | "orgId"
    | "manufacturer"
    | "model"
    | "matchedCpeVendor"
    | "matchedCpeProduct"
  >,
  cve: NvdCveItem,
  isKev: boolean = false
): DeviceMatchResult | null {
  const riskParams = {
    cvssScore: cve.cvssV3Score,
    isKev,
    exploitAvailable: false, // enriched separately
    patchAvailable: cve.patchAvailable ?? false,
    attackVector: cve.attackVector,
    userInteraction: cve.userInteraction,
  };

  // ── Strategy 1: Exact CPE Match ──────────────────────────────────────────
  // Device has a pre-discovered CPE string from network fingerprinting.
  if (device.matchedCpeVendor && device.matchedCpeProduct) {
    const deviceVendor = normalizeName(device.matchedCpeVendor);
    const deviceProduct = normalizeName(device.matchedCpeProduct);

    for (const av of cve.affectedVendors) {
      const cpeVendor = normalizeName(av.vendor);
      const cpeProduct = normalizeName(av.product);

      if (cpeVendor === deviceVendor && cpeProduct === deviceProduct) {
        return {
          deviceId: device.id,
          orgId: device.orgId,
          cveId: cve.cveId,
          matchStrategy: "exact_cpe",
          confidenceScore: 100,
          sentinelRiskScore: calculateSentinelRiskScore(riskParams),
          cvssScore: cve.cvssV3Score,
          isKev,
          exploitAvailable: false,
          patchAvailable: false,
          matchedVendor: av.vendor,
          matchedProduct: av.product,
        };
      }
    }
  }

  // ── Strategy 2: Fuzzy CPE Match ──────────────────────────────────────────
  // Normalize device manufacturer + model, compute Levenshtein similarity.
  if (device.manufacturer) {
    const deviceVendorAliases = resolveVendorAliases(device.manufacturer);
    const deviceProduct = device.model ? normalizeName(device.model) : null;

    let bestFuzzyScore = 0;
    let bestFuzzyVendor = "";
    let bestFuzzyProduct = "";

    for (const av of cve.affectedVendors) {
      const cpeVendor = normalizeName(av.vendor);
      const cpeProduct = normalizeName(av.product);

      // Check vendor match (any alias)
      const vendorMatch = deviceVendorAliases.some(alias => {
        const sim = similarity(normalizeName(alias), cpeVendor);
        return sim >= 0.8;
      });

      if (!vendorMatch) continue;

      // Check product match if we have a model
      let productSim = 0.5; // default if no model
      if (deviceProduct && cpeProduct !== "*") {
        productSim = similarity(deviceProduct, cpeProduct);
        // Also check if device product contains CPE product as substring
        if (
          deviceProduct.includes(cpeProduct) ||
          cpeProduct.includes(deviceProduct)
        ) {
          productSim = Math.max(productSim, 0.85);
        }
      }

      const combinedScore = productSim;
      if (combinedScore > bestFuzzyScore) {
        bestFuzzyScore = combinedScore;
        bestFuzzyVendor = av.vendor;
        bestFuzzyProduct = av.product;
      }
    }

    if (bestFuzzyScore >= 0.8) {
      const confidenceScore = Math.round(70 + bestFuzzyScore * 20); // 70–90
      return {
        deviceId: device.id,
        orgId: device.orgId,
        cveId: cve.cveId,
        matchStrategy: "fuzzy_cpe",
        confidenceScore: Math.min(confidenceScore, 90),
        sentinelRiskScore: calculateSentinelRiskScore(riskParams),
        cvssScore: cve.cvssV3Score,
        isKev,
        exploitAvailable: false,
        patchAvailable: false,
        matchedVendor: bestFuzzyVendor,
        matchedProduct: bestFuzzyProduct,
      };
    }

    // ── Strategy 3: Vendor/Product Keyword Match ─────────────────────────
    // Substring match — catches "Ring" matching "ring_doorbell_pro"
    for (const av of cve.affectedVendors) {
      const cpeVendor = normalizeName(av.vendor);
      const cpeProduct = normalizeName(av.product);

      const vendorKeywordMatch = deviceVendorAliases.some(alias => {
        const n = normalizeName(alias);
        return cpeVendor.includes(n) || n.includes(cpeVendor);
      });

      if (!vendorKeywordMatch) continue;

      // Product keyword match
      if (deviceProduct && cpeProduct !== "*") {
        // Split model into words and check if any word appears in CPE product
        const modelWords = deviceProduct.split("_").filter(w => w.length > 2);
        const productKeywordMatch = modelWords.some(
          word => cpeProduct.includes(word) || word.includes(cpeProduct)
        );

        if (productKeywordMatch) {
          return {
            deviceId: device.id,
            orgId: device.orgId,
            cveId: cve.cveId,
            matchStrategy: "vendor_product",
            confidenceScore: 60,
            sentinelRiskScore: calculateSentinelRiskScore(riskParams),
            cvssScore: cve.cvssV3Score,
            isKev,
            exploitAvailable: false,
            patchAvailable: false,
            matchedVendor: av.vendor,
            matchedProduct: av.product,
          };
        }
      } else if (!deviceProduct) {
        // No model — vendor-only match at lower confidence
        return {
          deviceId: device.id,
          orgId: device.orgId,
          cveId: cve.cveId,
          matchStrategy: "vendor_product",
          confidenceScore: 50,
          sentinelRiskScore: calculateSentinelRiskScore(riskParams),
          cvssScore: cve.cvssV3Score,
          isKev,
          exploitAvailable: false,
          patchAvailable: false,
          matchedVendor: av.vendor,
          matchedProduct: av.product,
        };
      }
    }
  }

  return null;
}

// Attach patchAvailable to NvdCveItem type for internal use
declare module "./nvdClient" {
  interface NvdCveItem {
    patchAvailable?: boolean;
  }
}
