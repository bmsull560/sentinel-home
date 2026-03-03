import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ShieldAlert, Cpu, Bell, Activity, TrendingUp,
  ArrowRight, CheckCircle2, AlertTriangle, Clock
} from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  calm: { label: "Calm", bg: "bg-black/5", text: "text-black/60" },
  be_aware: { label: "Be Aware", bg: "bg-black/10", text: "text-black/70" },
  action_recommended: { label: "Action Needed", bg: "bg-black/20", text: "text-black" },
  immediate_attention: { label: "Immediate", bg: "bg-black", text: "text-white" },
};

export default function Overview() {
  const { isAuthenticated, loading } = useAuth();
  const orgId = useOrgId();

  const { data, isLoading } = trpc.dashboard.overview.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );
  const { data: vulns } = trpc.vulnerabilities.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const timeSeriesData = useMemo(() => {
    const result = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      result.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        secure: Math.floor(Math.random() * 20) + 60,
        atRisk: Math.floor(Math.random() * 15) + 20,
      });
    }
    return result;
  }, []);

  if (loading || isLoading) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-black/5 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-black/5 rounded-2xl" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 bg-black/5 rounded-2xl" />
            <div className="h-64 bg-black/5 rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const secureCount = data?.secureDevices ?? 0;
  const atRiskCount = data?.atRiskDevices ?? 0;
  const total = Math.max(data?.monitoredDevices ?? 1, 1);
  const securePercent = Math.round((secureCount / total) * 100);

  const metrics = [
    {
      label: "Urgent Alerts",
      value: data?.urgentAlerts ?? 0,
      sub: (data?.urgentAlerts ?? 0) === 0 ? "All clear" : "Requires attention",
      icon: Bell,
      urgent: (data?.urgentAlerts ?? 0) > 0,
    },
    {
      label: "Vulnerabilities",
      value: data?.totalVulnerabilities ?? 0,
      sub: `${data?.criticalVulnerabilities ?? 0} critical`,
      icon: ShieldAlert,
      urgent: (data?.criticalVulnerabilities ?? 0) > 0,
    },
    {
      label: "Monitored Devices",
      value: data?.monitoredDevices ?? 0,
      sub: `${secureCount} secure`,
      icon: Cpu,
      urgent: false,
    },
    {
      label: "Threat Sources",
      value: data?.threatSources ?? 0,
      sub: "Active monitoring",
      icon: Activity,
      urgent: false,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Dashboard</h1>
            <p className="text-sm text-black/40 mt-1">Monitor your digital security posture and respond to threats</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-black/60 animate-pulse" />
            Live monitoring
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(({ label, value, sub, icon: Icon, urgent }) => (
            <div key={label} className="rounded-2xl p-5 border border-black/8 bg-white hover:border-black/15 transition-all">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-medium text-black/50">{label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${urgent ? "bg-black" : ""}`}
                  style={urgent ? {} : { background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
                  <Icon className={`w-4 h-4 ${urgent ? "text-white" : "text-black"}`} />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight">{value}</div>
              <div className={`text-xs mt-1 font-medium ${urgent ? "text-black" : "text-black/40"}`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Middle Row */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Recent Vulnerabilities */}
          <div className="lg:col-span-2 rounded-2xl border border-black/8 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Recent Vulnerabilities</h2>
              <Link href="/dashboard/vulnerabilities"
                className="text-xs font-medium text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {!vulns?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-black/15 mb-3" />
                <div className="text-sm font-medium text-black/40">No vulnerabilities detected</div>
                <div className="text-xs text-black/25 mt-1">Your devices are looking healthy</div>
              </div>
            ) : (
              <div className="space-y-3">
                {vulns.slice(0, 5).map(v => {
                  const cfg = SEVERITY_CONFIG[v.severity] ?? SEVERITY_CONFIG.calm;
                  return (
                    <div key={v.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/3 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        v.severity === "immediate_attention" ? "bg-black" :
                        v.severity === "action_recommended" ? "bg-black/60" :
                        v.severity === "be_aware" ? "bg-black/30" : "bg-black/15"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{v.title}</div>
                        <div className="text-xs text-black/40 mt-0.5">{v.cveId ?? "Advisory"}</div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Device Health Donut */}
          <div className="rounded-2xl border border-black/8 bg-white p-6">
            <h2 className="font-semibold text-base mb-5">Device Health</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklab(0.7 0.0260473 -0.147721 / 0.1)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="black" strokeWidth="3"
                    strokeDasharray={`${securePercent} ${100 - securePercent}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{securePercent}%</span>
                  <span className="text-xs text-black/40">secure</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Secure", count: secureCount, color: "oklab(0.7 0.0260473 -0.147721 / 0.5)" },
                { label: "At Risk", count: atRiskCount, color: "black" },
                { label: "Unknown", count: total - secureCount - atRiskCount, color: "rgba(0,0,0,0.2)" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-black/60">{label}</span>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/devices"
              className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-black/40 hover:text-black transition-colors">
              Manage devices <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent Alerts */}
        {(data?.recentAlerts?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-black/8 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base">Recent Alerts</h2>
              <Link href="/dashboard/alerts"
                className="text-xs font-medium text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {data?.recentAlerts?.map(alert => (
                <div key={alert.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/3 transition-colors">
                  {alert.severity === "critical"
                    ? <AlertTriangle className="w-4 h-4 text-black shrink-0" />
                    : <Clock className="w-4 h-4 text-black/40 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{alert.title}</div>
                    <div className="text-xs text-black/40">{new Date(alert.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    alert.status === "unread" ? "bg-black text-white" : "bg-black/8 text-black/60"
                  }`}>
                    {alert.status === "unread" ? "New" : alert.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(data?.monitoredDevices ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 p-12 text-center">
            <Cpu className="w-12 h-12 text-black/15 mx-auto mb-4" />
            <h3 className="font-semibold text-base mb-2">No devices yet</h3>
            <p className="text-sm text-black/40 mb-6 max-w-sm mx-auto">
              Add your connected devices to start monitoring for vulnerabilities and security threats.
            </p>
            <Link href="/dashboard/devices"
              className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-black/80 transition-colors">
              Add your first device <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
