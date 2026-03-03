import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { ShieldAlert, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  calm: { label: "Calm", bg: "bg-black/5", text: "text-black/60", dot: "bg-black/20" },
  be_aware: { label: "Be Aware", bg: "bg-black/10", text: "text-black/70", dot: "bg-black/40" },
  action_recommended: { label: "Action Needed", bg: "bg-black/20", text: "text-black", dot: "bg-black/70" },
  immediate_attention: { label: "Immediate", bg: "bg-black", text: "text-white", dot: "bg-black" },
};

const STATUS_OPTIONS = ["all", "open", "acknowledged", "resolved", "wont_fix"] as const;
const SEVERITY_OPTIONS = ["all", "immediate_attention", "action_recommended", "be_aware", "calm"] as const;

export default function Vulnerabilities() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [explaining, setExplaining] = useState<number | null>(null);

  const { data: vulns, isLoading, refetch } = trpc.vulnerabilities.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const explainMutation = trpc.vulnerabilities.explain.useMutation({
    onSuccess: () => { refetch(); setExplaining(null); },
    onError: () => { toast.error("Failed to generate explanation."); setExplaining(null); },
  });

  const updateStatus = trpc.vulnerabilities.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const handleExplain = async (id: number) => {
    setExplaining(id);
    setExpandedId(id);
    await explainMutation.mutateAsync({ vulnerabilityId: id });
  };

  const filtered = (vulns ?? []).filter(v => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) ||
      (v.cveId ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchSeverity = severityFilter === "all" || v.severity === severityFilter;
    return matchSearch && matchStatus && matchSeverity;
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vulnerabilities</h1>
            <p className="text-sm text-black/40 mt-1">
              {vulns?.length ?? 0} total · {vulns?.filter(v => v.status === "open").length ?? 0} open
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
            <ShieldAlert className="w-3 h-3" />
            NVD + CISA KEV
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search CVE, title…"
              className="pl-9 h-9 rounded-xl border-black/10 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-black/10 text-sm bg-white text-black/70 focus:outline-none focus:border-black/30">
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-black/10 text-sm bg-white text-black/70 focus:outline-none focus:border-black/30">
            {SEVERITY_OPTIONS.map(s => (
              <option key={s} value={s}>{s === "all" ? "All severities" : SEVERITY_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-black/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="w-12 h-12 text-black/15 mb-4" />
            <h3 className="font-semibold text-base mb-2">No vulnerabilities found</h3>
            <p className="text-sm text-black/40">
              {search || statusFilter !== "all" || severityFilter !== "all"
                ? "Try adjusting your filters."
                : "Your devices are looking healthy."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(v => {
              const cfg = SEVERITY_CONFIG[v.severity] ?? SEVERITY_CONFIG.calm;
              const isExpanded = expandedId === v.id;
              return (
                <div key={v.id} className="rounded-2xl border border-black/8 bg-white overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-black/2 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{v.title}</span>
                        {v.cveId && (
                          <span className="text-xs font-mono text-black/40 bg-black/5 px-2 py-0.5 rounded-lg">{v.cveId}</span>
                        )}
                        {v.isKev && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-black text-white">KEV</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {v.cvssScore && (
                          <span className="text-xs text-black/40">CVSS {v.cvssScore}</span>
                        )}
                        <span className="text-xs text-black/30 capitalize">{v.status.replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.patchAvailable && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
                          Patch available
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-black/30" /> : <ChevronDown className="w-4 h-4 text-black/30" />}
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-black/5 pt-4 space-y-4">
                      {/* Description */}
                      {v.description && (
                        <p className="text-sm text-black/60 leading-relaxed">{v.description}</p>
                      )}

                      {/* AI Explanation */}
                      {v.aiExplanation ? (
                        <div className="rounded-xl p-4 text-sm leading-relaxed"
                          style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.07)" }}>
                          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-black/50">
                            <Sparkles className="w-3.5 h-3.5" />
                            Plain Language Explanation
                          </div>
                          {v.aiExplanation}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExplain(v.id)}
                          disabled={explaining === v.id}
                          className="gap-2 rounded-xl border-black/15 text-xs h-8">
                          <Sparkles className="w-3.5 h-3.5" />
                          {explaining === v.id ? "Generating explanation…" : "Explain in plain language"}
                        </Button>
                      )}

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {v.attackVector && (
                          <div className="rounded-xl p-3 bg-black/3">
                            <div className="text-black/40 mb-1">Attack Vector</div>
                            <div className="font-semibold capitalize">{v.attackVector.toLowerCase()}</div>
                          </div>
                        )}
                        {v.affectedFirmware && (
                          <div className="rounded-xl p-3 bg-black/3">
                            <div className="text-black/40 mb-1">Affected Firmware</div>
                            <div className="font-semibold font-mono">{v.affectedFirmware}</div>
                          </div>
                        )}
                        {v.patchVersion && (
                          <div className="rounded-xl p-3 bg-black/3">
                            <div className="text-black/40 mb-1">Patch Version</div>
                            <div className="font-semibold font-mono">{v.patchVersion}</div>
                          </div>
                        )}
                        <div className="rounded-xl p-3 bg-black/3">
                          <div className="text-black/40 mb-1">Exploit Available</div>
                          <div className="font-semibold">{v.exploitAvailable ? "Yes" : "No"}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {v.status === "open" && (
                          <Button size="sm" variant="outline"
                            onClick={() => updateStatus.mutateAsync({ id: v.id, status: "acknowledged" })}
                            className="rounded-xl border-black/15 text-xs h-8">
                            Acknowledge
                          </Button>
                        )}
                        {v.status !== "resolved" && (
                          <Button size="sm"
                            onClick={() => updateStatus.mutateAsync({ id: v.id, status: "resolved" })}
                            className="rounded-xl bg-black text-white hover:bg-black/80 text-xs h-8">
                            Mark Resolved
                          </Button>
                        )}
                        {v.status === "resolved" && (
                          <span className="text-xs font-medium text-black/40 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
