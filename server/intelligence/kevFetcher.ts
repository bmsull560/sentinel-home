/**
 * CISA Known Exploited Vulnerabilities (KEV) Catalog Fetcher
 *
 * CISA publishes a single JSON file containing all known exploited CVEs.
 * This is a critical signal: if a CVE is in the KEV catalog, it has been
 * actively exploited in the wild and should be treated as highest priority.
 *
 * Catalog URL: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
 * Docs: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 */

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export interface KevEntry {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string; // "YYYY-MM-DD"
  shortDescription: string;
  requiredAction: string;
  dueDate: string; // "YYYY-MM-DD"
  knownRansomwareCampaignUse: string; // "Known" | "Unknown"
  notes: string;
}

export interface KevCatalogResponse {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevEntry[];
}

/**
 * Fetch the full CISA KEV catalog.
 * Returns all entries — typically 1,000–1,200 CVEs.
 */
export async function fetchKevCatalog(): Promise<KevCatalogResponse> {
  const res = await fetch(KEV_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Sentinel-Home/1.0 (security-monitoring)",
    },
  });

  if (!res.ok) {
    throw new Error(`CISA KEV fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Normalize the response
  const vulnerabilities: KevEntry[] = (data.vulnerabilities ?? []).map(
    (v: any) => ({
      cveId: v.cveID ?? v.cveId ?? "",
      vendorProject: v.vendorProject ?? "",
      product: v.product ?? "",
      vulnerabilityName: v.vulnerabilityName ?? "",
      dateAdded: v.dateAdded ?? "",
      shortDescription: v.shortDescription ?? "",
      requiredAction: v.requiredAction ?? "",
      dueDate: v.dueDate ?? "",
      knownRansomwareCampaignUse: v.knownRansomwareCampaignUse ?? "Unknown",
      notes: v.notes ?? "",
    })
  );

  return {
    title: data.title ?? "CISA KEV Catalog",
    catalogVersion: data.catalogVersion ?? "unknown",
    dateReleased: data.dateReleased ?? new Date().toISOString(),
    count: vulnerabilities.length,
    vulnerabilities,
  };
}

/**
 * Build a fast lookup Set of KEV CVE IDs.
 * Used during NVD ingestion to enrich CVEs with KEV status.
 */
export async function buildKevLookupSet(): Promise<Set<string>> {
  const catalog = await fetchKevCatalog();
  return new Set(catalog.vulnerabilities.map(v => v.cveId));
}

/**
 * Build a Map from CVE ID → full KEV entry for enrichment.
 */
export async function buildKevLookupMap(): Promise<Map<string, KevEntry>> {
  const catalog = await fetchKevCatalog();
  const map = new Map<string, KevEntry>();
  for (const entry of catalog.vulnerabilities) {
    map.set(entry.cveId, entry);
  }
  return map;
}
