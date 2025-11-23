import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, Monitor, Shield, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Overview() {
  const { data: overview, isLoading } = trpc.dashboard.overview.useQuery();

  const timeSeriesData = useMemo(() => {
    const data = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        secure: Math.floor(Math.random() * 20) + 60,
        atRisk: Math.floor(Math.random() * 15) + 20,
      });
    }
    return data;
  }, []);

  const deviceStatusData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: 'Secure', value: overview.secureDevices, color: 'oklch(0.65 0.15 160)' },
      { name: 'At Risk', value: overview.atRiskDevices, color: 'oklch(0.65 0.20 25)' },
    ];
  }, [overview]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Good morning ✨</h1>
          <p className="text-muted-foreground font-light">Your security overview</p>
        </div>

        {/* Financial Overview Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-foreground/80">Security Overview</h2>
            <select className="text-sm text-muted-foreground bg-transparent border-0 focus:outline-none">
              <option>This month</option>
              <option>This week</option>
              <option>Today</option>
            </select>
          </div>

          {/* Key Metrics - Redesigned with soft cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="percentage-badge percentage-badge-danger text-xs">
                  {overview?.urgentAlerts === 0 ? "✓" : "!"}
                </span>
              </div>
              <div className="icon-badge icon-badge-danger mb-4">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1 font-light">Urgent Alerts</p>
              <p className="text-4xl font-semibold mb-1">{overview?.urgentAlerts || 0}</p>
              <p className="text-xs text-muted-foreground">
                {overview?.urgentAlerts === 0 ? "All clear" : "Requires attention"}
              </p>
            </div>

            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="percentage-badge percentage-badge-success text-xs">
                  +{overview?.totalVulnerabilities || 0}
                </span>
              </div>
              <div className="icon-badge icon-badge-warning mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1 font-light">Total Vulnerabilities</p>
              <p className="text-4xl font-semibold mb-1">{overview?.totalVulnerabilities || 0}</p>
              <p className="text-xs text-muted-foreground">Across all devices</p>
            </div>

            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="percentage-badge percentage-badge-success text-xs">
                  {overview?.secureDevices || 0} secure
                </span>
              </div>
              <div className="icon-badge icon-badge-primary mb-4">
                <Monitor className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1 font-light">Monitored Devices</p>
              <p className="text-4xl font-semibold mb-1">{overview?.monitoredDevices || 0}</p>
              <p className="text-xs text-muted-foreground">Active monitoring</p>
            </div>

            <div className="metric-card relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="percentage-badge percentage-badge-success text-xs">
                  Active
                </span>
              </div>
              <div className="icon-badge icon-badge-success mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1 font-light">Threat Sources</p>
              <p className="text-4xl font-semibold mb-1">{overview?.threatSources || 0}</p>
              <p className="text-xs text-muted-foreground">Monitoring feeds</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart */}
          <div className="metric-card">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-1">Security Trend</h3>
              <p className="text-sm text-muted-foreground font-light">Device security status over the last 7 days</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorSecure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 160)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 160)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.20 25)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.20 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" opacity={0.5} />
                <YAxis className="text-xs" stroke="currentColor" opacity={0.5} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="secure"
                  stroke="oklch(0.65 0.15 160)"
                  fillOpacity={1}
                  fill="url(#colorSecure)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="atRisk"
                  stroke="oklch(0.65 0.20 25)"
                  fillOpacity={1}
                  fill="url(#colorAtRisk)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status Donut Chart */}
          <div className="metric-card">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-1">Device Status</h3>
              <p className="text-sm text-muted-foreground font-light">Current security status distribution</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.65 0.15 160)' }}></div>
                <span className="text-sm text-muted-foreground">Secure: {overview?.secureDevices || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.65 0.20 25)' }}></div>
                <span className="text-sm text-muted-foreground">At Risk: {overview?.atRiskDevices || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="metric-card">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-1">Quick Actions</h3>
            <p className="text-sm text-muted-foreground font-light">Common tasks to maintain your security posture</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-5 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">Scan Devices</h4>
              <p className="text-sm text-muted-foreground font-light">Check all devices for new vulnerabilities</p>
            </button>
            <button className="p-5 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">Review Alerts</h4>
              <p className="text-sm text-muted-foreground font-light">Address pending security alerts</p>
            </button>
            <button className="p-5 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-medium mb-1">Add Device</h4>
              <p className="text-sm text-muted-foreground font-light">Register a new device for monitoring</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
