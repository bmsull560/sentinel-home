/**
 * NVD API v2 Client
 * Fetches CVE data from the National Vulnerability Database.
 * Docs: https://nvd.nist.gov/developers/vulnerabilities
 *
 * Rate limits:
 *   - Without API key: 5 requests / 30 seconds
 *   - With API key:   50 requests / 30 seconds
 *
 * We use the public (no-key) endpoint and respect the rate limit with
 * a 6-second delay between pages. For production, add an NVD_API_KEY env var.
 */

const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const PAGE_SIZE = 2000; // NVD max per request
const RATE_DELAY_MS = 6500; // safe for no-key tier

export interface NvdCveItem {
  cveId: string;
  description: string | null;
  cvssV3Score: string | null;
  cvssV3Vector: string | null;
  cvssV3Severity: string | null;
  attackVector: string | null;
  attackComplexity: string | null;
  privilegesRequired: string | null;
  userInteraction: string | null;
  confidentialityImpact: string | null;
  integrityImpact: string | null;
  availabilityImpact: string | null;
  cpeMatches: CpeMatch[];
  affectedVendors: AffectedVendor[];
  publishedAt: Date | null;
  lastModifiedAt: Date | null;
}

export interface CpeMatch {
  criteria: string;           // e.g. "cpe:2.3:h:ring:video_doorbell:*:*:*:*:*:*:*:*"
  matchCriteriaId: string;
  vulnerable: boolean;
  versionStartIncluding?: string;
  versionEndExcluding?: string;
  versionEndIncluding?: string;
}

export interface AffectedVendor {
  vendor: string;
  product: string;
  versionStartIncluding?: string;
  versionEndExcluding?: string;
  versionEndIncluding?: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse a raw NVD CVE item from the API response into our normalized shape.
 */
function parseNvdItem(raw: any): NvdCveItem {
  const cve = raw.cve ?? raw;
  const cveId: string = cve.id ?? "";

  // English description
  const descriptions: any[] = cve.descriptions ?? [];
  const enDesc = descriptions.find((d: any) => d.lang === "en");
  const description = enDesc?.value ?? null;

  // CVSS v3.1 metrics (prefer 3.1, fall back to 3.0)
  const metrics = cve.metrics ?? {};
  const cvssV31 = metrics.cvssMetricV31?.[0]?.cvssData ?? null;
  const cvssV30 = metrics.cvssMetricV30?.[0]?.cvssData ?? null;
  const cvss = cvssV31 ?? cvssV30 ?? null;

  // CPE matches — flatten all nodes from all configurations
  const configurations: any[] = cve.configurations ?? [];
  const cpeMatches: CpeMatch[] = [];
  const vendorProductSet = new Set<string>();
  const affectedVendors: AffectedVendor[] = [];

  for (const config of configurations) {
    const nodes: any[] = config.nodes ?? [];
    for (const node of nodes) {
      const matches: any[] = node.cpeMatch ?? [];
      for (const m of matches) {
        if (!m.vulnerable) continue;
        cpeMatches.push({
          criteria: m.criteria,
          matchCriteriaId: m.matchCriteriaId,
          vulnerable: m.vulnerable,
          versionStartIncluding: m.versionStartIncluding,
          versionEndExcluding: m.versionEndExcluding,
          versionEndIncluding: m.versionEndIncluding,
        });

        // Extract vendor + product from CPE string
        // Format: cpe:2.3:{part}:{vendor}:{product}:{version}:...
        const parts = m.criteria.split(":");
        if (parts.length >= 5) {
          const vendor = parts[3];
          const product = parts[4];
          const key = `${vendor}:${product}`;
          if (!vendorProductSet.has(key) && vendor !== "*" && product !== "*") {
            vendorProductSet.add(key);
            affectedVendors.push({
              vendor,
              product,
              versionStartIncluding: m.versionStartIncluding,
              versionEndExcluding: m.versionEndExcluding,
              versionEndIncluding: m.versionEndIncluding,
            });
          }
        }
      }
    }
  }

  return {
    cveId,
    description,
    cvssV3Score: cvss?.baseScore?.toString() ?? null,
    cvssV3Vector: cvss?.vectorString ?? null,
    cvssV3Severity: cvss?.baseSeverity ?? null,
    attackVector: cvss?.attackVector ?? null,
    attackComplexity: cvss?.attackComplexity ?? null,
    privilegesRequired: cvss?.privilegesRequired ?? null,
    userInteraction: cvss?.userInteraction ?? null,
    confidentialityImpact: cvss?.confidentialityImpact ?? null,
    integrityImpact: cvss?.integrityImpact ?? null,
    availabilityImpact: cvss?.availabilityImpact ?? null,
    cpeMatches,
    affectedVendors,
    publishedAt: cve.published ? new Date(cve.published) : null,
    lastModifiedAt: cve.lastModified ? new Date(cve.lastModified) : null,
  };
}

/**
 * Fetch CVEs modified after a given date (for incremental updates).
 * Returns all pages, respecting rate limits.
 */
export async function fetchNvdCvesByLastModified(
  lastModStartDate: Date,
  lastModEndDate: Date = new Date(),
  onProgress?: (fetched: number, total: number) => void
): Promise<NvdCveItem[]> {
  const apiKey = process.env.NVD_API_KEY;
  const headers: Record<string, string> = apiKey ? { apiKey } : {};

  const startStr = lastModStartDate.toISOString().replace(/\.\d{3}Z$/, ".000");
  const endStr = lastModEndDate.toISOString().replace(/\.\d{3}Z$/, ".000");

  const allItems: NvdCveItem[] = [];
  let startIndex = 0;
  let totalResults = 0;

  do {
    const url = new URL(NVD_BASE);
    url.searchParams.set("lastModStartDate", startStr);
    url.searchParams.set("lastModEndDate", endStr);
    url.searchParams.set("startIndex", startIndex.toString());
    url.searchParams.set("resultsPerPage", PAGE_SIZE.toString());

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NVD API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    totalResults = data.totalResults ?? 0;
    const vulnerabilities: any[] = data.vulnerabilities ?? [];

    for (const item of vulnerabilities) {
      allItems.push(parseNvdItem(item));
    }

    startIndex += vulnerabilities.length;
    onProgress?.(allItems.length, totalResults);

    // Respect rate limit between pages
    if (startIndex < totalResults) {
      await sleep(RATE_DELAY_MS);
    }
  } while (startIndex < totalResults);

  return allItems;
}

/**
 * Fetch a single CVE by ID.
 */
export async function fetchNvdCveById(cveId: string): Promise<NvdCveItem | null> {
  const apiKey = process.env.NVD_API_KEY;
  const headers: Record<string, string> = apiKey ? { apiKey } : {};

  const url = new URL(NVD_BASE);
  url.searchParams.set("cveId", cveId);

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return null;

  const data = await res.json();
  const vulnerabilities: any[] = data.vulnerabilities ?? [];
  if (vulnerabilities.length === 0) return null;

  return parseNvdItem(vulnerabilities[0]);
}

/**
 * Fetch recent CVEs (last N days) — useful for initial seeding.
 */
export async function fetchNvdRecentCves(
  daysBack: number = 7,
  onProgress?: (fetched: number, total: number) => void
): Promise<NvdCveItem[]> {
  const end = new Date();
  const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return fetchNvdCvesByLastModified(start, end, onProgress);
}
