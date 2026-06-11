import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import {
  Bot,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AGENT_ROLES = [
  {
    id: "orchestrator",
    label: "Orchestrator",
    desc: "Parses intent, maintains context",
  },
  { id: "mapper", label: "Mapper", desc: "Maps devices to CVEs" },
  { id: "explainer", label: "Explainer", desc: "Safe technical explanations" },
  { id: "sculptor", label: "Sculptor", desc: "Converts intelligence to UI" },
  { id: "narrator", label: "Narrator", desc: "Human-centric summaries" },
  { id: "guardian", label: "Guardian", desc: "Ethical & safety pass" },
];

const EXAMPLE_PROMPTS = [
  "What are the most critical vulnerabilities affecting my home network right now?",
  "Explain the Ring doorbell vulnerability in simple terms",
  "Which of my devices need immediate firmware updates?",
  "Summarize my security posture for the last 7 days",
];

export default function AgentConsole() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();
  const [intent, setIntent] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  const {
    data: runs,
    isLoading,
    refetch,
  } = trpc.agentRuns.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const trigger = trpc.agentRuns.trigger.useMutation({
    onSuccess: () => {
      refetch();
      setIntent("");
      toast.success("Agent run completed.");
    },
    onError: () => toast.error("Agent run failed. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent.trim()) return;
    trigger.mutate({ orgId, intent: intent.trim() });
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Console</h1>
            <p className="text-sm text-black/40 mt-1">
              Multi-agent security intelligence orchestration
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}
          >
            <Zap className="w-3 h-3" />6 agents active
          </div>
        </div>

        {/* Agent Pipeline Visualization */}
        <div className="rounded-2xl border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-sm mb-4 text-black/60 uppercase tracking-wider text-xs">
            Agent Pipeline
          </h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {AGENT_ROLES.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-1 shrink-0">
                <div className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 mx-auto"
                    style={{
                      background: "oklab(0.7 0.0260473 -0.147721 / 0.12)",
                    }}
                  >
                    <Bot className="w-4 h-4 text-black/60" />
                  </div>
                  <div className="text-xs font-semibold text-black/70 whitespace-nowrap">
                    {agent.label}
                  </div>
                  <div className="text-xs text-black/30 whitespace-nowrap max-w-20 truncate">
                    {agent.desc}
                  </div>
                </div>
                {i < AGENT_ROLES.length - 1 && (
                  <div className="w-6 h-px bg-black/10 shrink-0 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-black/8 bg-white p-5"
        >
          <h2 className="font-semibold text-sm mb-3">Ask the Agent</h2>
          <div className="flex gap-3">
            <Input
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="Ask about your device security…"
              className="flex-1 h-10 rounded-xl border-black/10 text-sm"
              disabled={trigger.isPending}
            />
            <Button
              type="submit"
              disabled={!intent.trim() || trigger.isPending}
              className="bg-black text-white hover:bg-black/80 rounded-xl h-10 px-4 gap-2 shrink-0"
            >
              {trigger.isPending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Run
                </>
              )}
            </Button>
          </div>
          {/* Example prompts */}
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLE_PROMPTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setIntent(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-black/10 text-black/50 hover:border-black/25 hover:text-black/70 transition-colors text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </form>

        {/* Run History */}
        <div>
          <h2 className="font-semibold text-sm mb-3 text-black/60">
            Run History
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-black/5 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : !runs?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-black/10">
              <Bot className="w-10 h-10 text-black/15 mb-3" />
              <p className="text-sm text-black/40">
                No agent runs yet. Ask the agent something above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map(run => {
                const isExpanded = expandedRunId === run.id;
                const trace = Array.isArray(run.agentTrace)
                  ? (run.agentTrace as Array<{
                      agent: string;
                      action: string;
                      timestamp: string;
                    }>)
                  : [];
                return (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-black/8 bg-white overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedRunId(isExpanded ? null : run.id)
                      }
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-black/2 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          run.status === "completed"
                            ? ""
                            : run.status === "failed"
                              ? "bg-black"
                              : "bg-black/10"
                        }`}
                        style={
                          run.status === "completed"
                            ? {
                                background:
                                  "oklab(0.7 0.0260473 -0.147721 / 0.2)",
                              }
                            : {}
                        }
                      >
                        {run.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-black/70" />
                        ) : run.status === "failed" ? (
                          <AlertCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-black/50 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {run.intent}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-black/30">
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                          {run.durationMs && (
                            <span className="text-xs text-black/30">
                              {(run.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                          {run.tokensUsed && (
                            <span className="text-xs text-black/30">
                              {run.tokensUsed} tokens
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-black/30 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-black/30 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-black/5 pt-4 space-y-3">
                        {/* Agent trace */}
                        {trace.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-black/40 uppercase tracking-wider">
                              Agent Trace
                            </div>
                            {trace.map((step, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 text-xs"
                              >
                                <div
                                  className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                  style={{
                                    background:
                                      "oklab(0.7 0.0260473 -0.147721 / 0.12)",
                                  }}
                                >
                                  <Bot className="w-3 h-3 text-black/50" />
                                </div>
                                <div>
                                  <span className="font-semibold text-black/70">
                                    {step.agent}
                                  </span>
                                  <span className="text-black/40 ml-2">
                                    {step.action}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Result */}
                        {run.result && (
                          <div
                            className="rounded-xl p-4 text-sm leading-relaxed"
                            style={{
                              background:
                                "oklab(0.7 0.0260473 -0.147721 / 0.07)",
                            }}
                          >
                            <div className="text-xs font-semibold text-black/40 mb-2">
                              Result
                            </div>
                            <div className="text-black/70 whitespace-pre-wrap">
                              {run.result}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
