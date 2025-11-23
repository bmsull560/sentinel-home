import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Alerts() {
  const utils = trpc.useUtils();
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery();
  const updateStatus = trpc.alerts.updateStatus.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.dashboard.overview.invalidate();
      toast.success("Alert status updated");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "acknowledged":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "resolved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "dismissed":
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
      acknowledged: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      resolved: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      dismissed: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return variants[status] || variants.new;
  };

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
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Security Alerts</h1>
          <p className="text-muted-foreground font-light">Monitor and respond to security notifications</p>
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="metric-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{getStatusIcon(alert.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">Alert #{alert.id}</h3>
                        <Badge className={`${getStatusBadge(alert.status)} border-0`}>
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Vulnerability ID: {alert.vulnerabilityId}
                      </p>
                      {alert.deviceId && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Device ID: {alert.deviceId}
                        </p>
                      )}
                      {alert.actionTaken && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Action: {alert.actionTaken}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        Created: {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alert.status === "new" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() =>
                            updateStatus.mutate({
                              id: alert.id,
                              status: "acknowledged",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() =>
                            updateStatus.mutate({
                              id: alert.id,
                              status: "resolved",
                              actionTaken: "Manually resolved",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === "acknowledged" && (
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() =>
                          updateStatus.mutate({
                            id: alert.id,
                            status: "resolved",
                            actionTaken: "Manually resolved",
                          })
                        }
                        disabled={updateStatus.isPending}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="metric-card text-center py-16">
            <div className="icon-badge icon-badge-success mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">All Clear!</h3>
            <p className="text-muted-foreground font-light">No active security alerts at this time.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
