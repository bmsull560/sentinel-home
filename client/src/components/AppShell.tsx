import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Cpu, ShieldAlert, Bell, Bot,
  Users, CreditCard, Settings, LogOut, ChevronDown,
  Building2, Menu, X
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Devices", icon: Cpu, href: "/dashboard/devices" },
  { label: "Vulnerabilities", icon: ShieldAlert, href: "/dashboard/vulnerabilities" },
  { label: "Alerts", icon: Bell, href: "/dashboard/alerts" },
  { label: "Agent Console", icon: Bot, href: "/dashboard/agent" },
];

const ADMIN_ITEMS = [
  { label: "Team", icon: Users, href: "/dashboard/team" },
  { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

interface AppShellProps {
  children: React.ReactNode;
  orgId?: number;
}

export default function AppShell({ children, orgId }: AppShellProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: orgs } = trpc.org.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl" style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }} />
          <div className="text-sm text-muted-foreground animate-pulse">Loading Sentinel…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const currentOrg = orgs?.[0];
  const activeOrgId = orgId ?? currentOrg?.id ?? 1;

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard";
    return location.startsWith(href);
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-64 border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
          <ShieldAlert className="w-4 h-4 text-foreground" />
        </div>
        <span className="font-bold text-base tracking-tight">Sentinel</span>
      </div>

      {/* Org Switcher */}
      {currentOrg && (
        <div className="px-3 pt-4">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors text-left">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
              {currentOrg.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{currentOrg.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{currentOrg.plan} plan</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground px-3 pb-2 uppercase tracking-widest">Workspace</div>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-accent text-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
            onClick={() => setMobileOpen(false)}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="text-xs font-semibold text-muted-foreground px-3 pt-5 pb-2 uppercase tracking-widest">Organization</div>
        {ADMIN_ITEMS.map(({ label, icon: Icon, href }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-accent text-foreground font-semibold"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
            onClick={() => setMobileOpen(false)}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name ?? "User"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</div>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Sign out">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-64 z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
              <ShieldAlert className="w-3 h-3" />
            </div>
            <span className="font-bold text-sm">Sentinel</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { type AppShellProps };
export const useOrgId = () => {
  const { data: orgs } = trpc.org.list.useQuery();
  return orgs?.[0]?.id ?? 1;
};
