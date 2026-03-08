import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppShell, { useOrgId } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RefreshCw,
  Search,
  ShieldAlert,
  Zap,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Info,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(severity: string | null | undefined) {
  switch ((severity ?? "").toUpperCase()) {
    case "CRITICAL": return "text-black bg-black/10 border-black/20";
    case "HIGH":     return "text-black bg-black/8 border-black/15";
    case "MEDIUM":   return "text-black/70 bg-black/5 border-black/10";
    default:         return "text-black/50 bg-black/3 border-black/8";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle className="w-4 h-4 text-black" />;
    case "failed":    return <XCircle className="w-4 h-4 text-black/40" />;
    case "running":   return <Loader2 className="w-4 h-4 animate-spin text-black/60" />;
    default:          return <Clock className="w-4 h-4 text-black/30" />;
  }
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Intelligence() {
  const orgId = useOrgId();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [daysBack, setDaysBack] = useState(7);

  const { data: schedulerStatus } = trpc.intelligence.schedulerStatus.useQuery(
    undefined,
    { refetchInterval: 30_000 } // poll every 30s to keep next-run countdown fresh
  );

  const { data: runs, refetch: refetchRuns, isLoading: runsLoading } =
    trpc.intelligence.runs.useQuery({ limit: 20 });

  const { data: kevStats } = trpc.intelligence.kevStats.useQuery();

  const { data: lastIngestion } = trpc.intelligence.lastIngestion.useQuery();

  const { data: orgMatches, isLoading: matchesLoading } =
    trpc.intelligence.orgMatches.useQuery(
      { orgId: orgId! },
      { enabled: !!orgId }
    );

  const { data: searchResults, isLoading: searchLoading } =
    trpc.intelligence.searchCves.useQuery(
      { query: activeSearch, limit: 20 },
      { enabled: activeSearch.length >= 2 }
    );

  const triggerMutation = trpc.intelligence.triggerIngestion.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTimeout(() => refetchRuns(), 2000);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery);
  }

  function handleTrigger() {
    if (!orgId) return;
    triggerMutation.mutate({ orgId, mode: "recent", daysBack });
  }

  const latestRun = runs?.[0];
  const totalMatches = orgMatches?.length ?? 0;
  const criticalMatches = orgMatches?.filter(m => (m.sentinelRiskScore ?? 0) >= 80).length ?? 0;
  const kevMatches = orgMatches?.filter(m => m.isKev).length ?? 0;

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black tracking-tight">
              Threat Intelligence
            </h1>
            <p className="text-sm text-black/50 mt-1">
              Live CVE ingestion from NVD &amp; CISA KEV — matched to your devices
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={daysBack}
              onChange={e => setDaysBack(Number(e.target.value))}
              className="text-sm border border-black/10 rounded-lg px-3 py-2 bg-white text-black/70 focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value={1}>Last 24 hours</option>
              <option value={3}>Last 3 days</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button
              onClick={handleTrigger}
              disabled={triggerMutation.isPending || !orgId}
              className="bg-black text-white hover:bg-black/80 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              {triggerMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />
              }
              Run Ingestion
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "CVE Matches",
              value: totalMatches,
              icon: <Database className="w-5 h-5" />,
              sub: "across your devices",
            },
            {
              label: "Critical Risk",
              value: criticalMatches,
              icon: <ShieldAlert className="w-5 h-5" />,
              sub: "score ≥ 80",
            },
            {
              label: "CISA KEV",
              value: kevMatches,
              icon: <Zap className="w-5 h-5" />,
              sub: "actively exploited",
            },
            {
              label: "KEV Catalog",
              value: kevStats?.total ?? "—",
              icon: <TrendingUp className="w-5 h-5" />,
              sub: `${kevStats?.withRansomware ?? 0} ransomware`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-black/6 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-black/40 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl font-bold text-black tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs text-black/40 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Scheduler Status Panel */}
        <div className="bg-white rounded-2xl border border-black/6 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-black/40" />
              <span className="text-sm font-semibold text-black">Automated Ingestion Schedule</span>
              <span className="text-xs text-black/40">— every 6 hours (UTC)</span>
            </div>
            <div className="flex items-center gap-2">
              {schedulerStatus?.isRunning ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-black bg-black/8 rounded-full px-3 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Running now
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-black/50 bg-black/4 rounded-full px-3 py-1">
                  <CheckCircle className="w-3 h-3" /> Idle
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-black/40 uppercase tracking-wider mb-1">Next Run</div>
              <div className="text-sm font-semibold text-black">
                {schedulerStatus?.nextRunAt
                  ? new Date(schedulerStatus.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
                  : <span className="text-black/30">—</span>}
              </div>
              {schedulerStatus?.nextRunAt && (
                <div className="text-xs text-black/40">
                  {new Date(schedulerStatus.nextRunAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-black/40 uppercase tracking-wider mb-1">Last Run</div>
              <div className="text-sm font-semibold text-black">
                {schedulerStatus?.lastRunAt
                  ? new Date(schedulerStatus.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : <span className="text-black/30">Never</span>}
              </div>
              {schedulerStatus?.lastRunError && (
                <div className="text-xs text-red-500 truncate max-w-[120px]" title={schedulerStatus.lastRunError}>
                  {schedulerStatus.lastRunError}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-black/40 uppercase tracking-wider mb-1">Total Runs</div>
              <div className="text-sm font-semibold text-black tabular-nums">
                {schedulerStatus?.totalRuns ?? 0}
                {(schedulerStatus?.totalErrors ?? 0) > 0 && (
                  <span className="text-xs text-black/40 ml-1">({schedulerStatus?.totalErrors} errors)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-black/40 uppercase tracking-wider mb-1">Last Result</div>
              {schedulerStatus?.lastResult ? (
                <div className="text-xs text-black/60 space-y-0.5">
                  <div>{schedulerStatus.lastResult.cvesFetched} CVEs fetched</div>
                  <div>{schedulerStatus.lastResult.matchesCreated} matches created</div>
                  <div>{schedulerStatus.lastResult.alertsGenerated} alerts generated</div>
                </div>
              ) : (
                <div className="text-sm text-black/30">—</div>
              )}
            </div>
          </div>
        </div>

        {/* Last ingestion info */}
        {lastIngestion && (
          <div className="flex items-center gap-2 text-sm text-black/50 bg-black/3 rounded-xl px-4 py-3">
            <Info className="w-4 h-4" />
            Last successful ingestion: {new Date(lastIngestion).toLocaleString()}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Device CVE Matches */}
          <div className="bg-white rounded-2xl border border-black/6 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <h2 className="text-sm font-semibold text-black">
                Device CVE Matches
              </h2>
              <p className="text-xs text-black/40 mt-0.5">
                Vulnerabilities matched to your inventory
              </p>
            </div>
            <div className="divide-y divide-black/5 max-h-96 overflow-y-auto">
              {matchesLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-black/30" />
                </div>
              ) : orgMatches && orgMatches.length > 0 ? (
                orgMatches.slice(0, 30).map((match) => (
                  <div key={match.matchId} className="px-6 py-4 hover:bg-black/2 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-black">
                            {match.cveId}
                          </span>
                          {match.isKev && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-black text-white border-0">
                              KEV
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-black/50 truncate">
                          {match.deviceName} — {match.deviceManufacturer} {match.deviceModel}
                        </p>
                        <p className="text-xs text-black/30 mt-0.5 line-clamp-1">
                          {match.cveDescription}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-black tabular-nums">
                          {match.sentinelRiskScore}
                        </div>
                        <div className="text-[10px] text-black/30">risk</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${severityColor(match.cvssV3Severity)}`}>
                        {match.cvssV3Severity ?? "N/A"}
                      </span>
                      <span className="text-[10px] text-black/30">
                        CVSS {match.cvssScore ?? "—"}
                      </span>
                      <span className="text-[10px] text-black/30">
                        {match.matchStrategy?.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-black/30">
                        {match.confidenceScore}% confidence
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Database className="w-8 h-8 text-black/10 mx-auto mb-2" />
                  <p className="text-sm text-black/30">No matches yet</p>
                  <p className="text-xs text-black/20 mt-1">
                    Run ingestion to match CVEs to your devices
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ingestion Run History */}
          <div className="bg-white rounded-2xl border border-black/6 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-black">
                  Ingestion History
                </h2>
                <p className="text-xs text-black/40 mt-0.5">
                  NVD + CISA KEV pipeline runs
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRuns()}
                className="text-black/40 hover:text-black"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="divide-y divide-black/5 max-h-96 overflow-y-auto">
              {runsLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-black/30" />
                </div>
              ) : runs && runs.length > 0 ? (
                runs.map((run) => (
                  <div key={run.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {statusIcon(run.status)}
                        <span className="text-xs font-medium text-black capitalize">
                          {run.source.replace("_", " ")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            run.status === "completed"
                              ? "border-black/20 text-black/60"
                              : run.status === "failed"
                              ? "border-black/30 text-black/40"
                              : "border-black/10 text-black/30"
                          }`}
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-black/30">
                        {new Date(run.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {run.status === "completed" && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {[
                          { label: "Fetched", value: run.cvesFetched },
                          { label: "New", value: run.cvesInserted },
                          { label: "Matches", value: run.matchesCreated },
                          { label: "Alerts", value: run.alertsGenerated },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <div className="text-sm font-semibold text-black tabular-nums">
                              {s.value}
                            </div>
                            <div className="text-[10px] text-black/30">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {run.status === "failed" && run.errorMessage && (
                      <p className="text-[10px] text-black/40 mt-1 truncate">
                        {run.errorMessage}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-8 h-8 text-black/10 mx-auto mb-2" />
                  <p className="text-sm text-black/30">No runs yet</p>
                  <p className="text-xs text-black/20 mt-1">
                    Click "Run Ingestion" to start
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CVE Search */}
        <div className="bg-white rounded-2xl border border-black/6 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6">
            <h2 className="text-sm font-semibold text-black">CVE Search</h2>
            <p className="text-xs text-black/40 mt-0.5">
              Search the NVD cache by CVE ID or keyword
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. CVE-2024-1234 or 'ring doorbell'"
                className="flex-1 border-black/10 rounded-xl text-sm"
              />
              <Button
                type="submit"
                className="bg-black text-white hover:bg-black/80 rounded-xl px-4"
              >
                <Search className="w-4 h-4" />
              </Button>
            </form>

            {searchLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-black/30" />
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((cve) => (
                  <div
                    key={cve.cveId}
                    className="flex items-start gap-4 p-4 rounded-xl border border-black/6 hover:border-black/12 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-semibold text-black">
                          {cve.cveId}
                        </span>
                        {cve.isKev && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-black text-white border-0">
                            KEV
                          </Badge>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${severityColor(cve.cvssV3Severity)}`}>
                          {cve.cvssV3Severity ?? "N/A"}
                        </span>
                      </div>
                      <p className="text-xs text-black/50 line-clamp-2">
                        {cve.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-black tabular-nums">
                        {cve.cvssV3Score ?? "—"}
                      </div>
                      <div className="text-[10px] text-black/30">CVSS</div>
                      {cve.nvdPublishedAt && (
                        <div className="text-[10px] text-black/30 mt-1">
                          {new Date(cve.nvdPublishedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSearch && !searchLoading && searchResults?.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-black/10 mx-auto mb-2" />
                <p className="text-sm text-black/30">No CVEs found for "{activeSearch}"</p>
                <p className="text-xs text-black/20 mt-1">
                  Try running ingestion first to populate the cache
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
