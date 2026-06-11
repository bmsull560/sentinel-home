import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical",
    bg: "bg-black",
    text: "text-white",
    icon: AlertTriangle,
  },
  warning: {
    label: "Warning",
    bg: "bg-black/15",
    text: "text-black",
    icon: Clock,
  },
  info: { label: "Info", bg: "bg-black/5", text: "text-black/60", icon: Bell },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  unread: { label: "New", bg: "bg-black", text: "text-white" },
  read: { label: "Read", bg: "bg-black/8", text: "text-black/60" },
  acknowledged: {
    label: "Acknowledged",
    bg: "bg-black/8",
    text: "text-black/60",
  },
  dismissed: { label: "Dismissed", bg: "bg-black/5", text: "text-black/30" },
};

export default function Alerts() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();

  const {
    data: alerts,
    isLoading,
    refetch,
  } = trpc.alerts.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const updateStatus = trpc.alerts.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert updated.");
    },
  });

  const unreadCount = alerts?.filter(a => a.status === "unread").length ?? 0;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
            <p className="text-sm text-black/40 mt-1">
              {alerts?.length ?? 0} total · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-black/15 text-xs h-8"
              onClick={() => {
                alerts
                  ?.filter(a => a.status === "unread")
                  .forEach(a =>
                    updateStatus.mutate({ id: a.id, status: "read" })
                  );
              }}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-black/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : !alerts?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="w-12 h-12 text-black/15 mb-4" />
            <h3 className="font-semibold text-base mb-2">All clear</h3>
            <p className="text-sm text-black/40">
              No active security alerts at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const sevCfg =
                SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
              const stCfg = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.read;
              const Icon = sevCfg.icon;
              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border bg-white p-5 transition-all ${
                    alert.status === "unread"
                      ? "border-black/20"
                      : "border-black/8"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sevCfg.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${sevCfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-sm">{alert.title}</h3>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${stCfg.bg} ${stCfg.text}`}
                        >
                          {stCfg.label}
                        </span>
                      </div>
                      {alert.message && (
                        <p className="text-xs text-black/50 leading-relaxed mb-3">
                          {alert.message}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-black/30">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          {alert.status === "unread" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatus.mutate({
                                  id: alert.id,
                                  status: "acknowledged",
                                })
                              }
                              disabled={updateStatus.isPending}
                              className="rounded-xl border-black/15 text-xs h-7 px-3"
                            >
                              Acknowledge
                            </Button>
                          )}
                          {(alert.status === "unread" ||
                            alert.status === "acknowledged") && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  id: alert.id,
                                  status: "dismissed",
                                })
                              }
                              disabled={updateStatus.isPending}
                              className="rounded-xl bg-black text-white hover:bg-black/80 text-xs h-7 px-3"
                            >
                              Dismiss
                            </Button>
                          )}
                          {alert.status === "dismissed" && (
                            <span className="text-xs text-black/30 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Dismissed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
