import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, Monitor, Shield, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Overview() {
  const { data: overview, isLoading } = trpc.dashboard.overview.useQuery();

  // Mock time-series data for the chart
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
      { name: 'Secure', value: overview.secureDevices, color: '#10b981' },
      { name: 'At Risk', value: overview.atRiskDevices, color: '#ef4444' },
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor your digital security posture and respond to threats</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent Alerts</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.urgentAlerts || 0}</div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                {overview?.urgentAlerts === 0 ? "All clear" : "Requires attention"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vulnerabilities</CardTitle>
              <Shield className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.totalVulnerabilities || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all devices</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitored Devices</CardTitle>
              <Monitor className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.monitoredDevices || 0}</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                {overview?.secureDevices || 0} secure
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Threat Sources</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.threatSources || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active monitoring</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Security Trend</CardTitle>
              <CardDescription>Device security status over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorSecure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="secure"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorSecure)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="atRisk"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorAtRisk)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Device Status Donut Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Device Status</CardTitle>
              <CardDescription>Current security status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
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
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Secure: {overview?.secureDevices || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">At Risk: {overview?.atRiskDevices || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to maintain your security posture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                <Activity className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Scan Devices</h3>
                <p className="text-sm text-muted-foreground">Check all devices for new vulnerabilities</p>
              </button>
              <button className="p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                <Shield className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Review Alerts</h3>
                <p className="text-sm text-muted-foreground">Address pending security alerts</p>
              </button>
              <button className="p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                <Monitor className="h-6 w-6 mb-2 text-primary" />
                <h3 className="font-medium mb-1">Add Device</h3>
                <p className="text-sm text-muted-foreground">Register a new device for monitoring</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
