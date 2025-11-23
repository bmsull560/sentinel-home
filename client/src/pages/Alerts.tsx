import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
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

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      calm: { label: "Calm", className: "severity-calm" },
      be_aware: { label: "Be Aware", className: "severity-be-aware" },
      action_recommended: { label: "Action Recommended", className: "severity-action-recommended" },
      immediate_attention: { label: "Immediate Attention", className: "severity-immediate-attention" },
    };
    const config = severityMap[severity as keyof typeof severityMap] || severityMap.calm;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      new: { label: "New", icon: AlertTriangle, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
      acknowledged: { label: "Acknowledged", icon: CheckCircle2, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      resolved: { label: "Resolved", icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      dismissed: { label: "Dismissed", icon: XCircle, className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.new;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
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
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Security Alerts</h1>
          <p className="text-muted-foreground">Review and respond to security alerts for your devices</p>
        </div>

        {alerts && alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You have no active security alerts. Your devices are being monitored continuously.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts?.map((alert) => (
              <Card key={alert.id} className={alert.status === "new" ? "border-l-4 border-l-red-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">Alert #{alert.id}</CardTitle>
                        {getStatusBadge(alert.status)}
                      </div>
                      <CardDescription>
                        Created {new Date(alert.createdAt).toLocaleDateString()} at{" "}
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Vulnerability ID:</strong> {alert.vulnerabilityId}
                    </p>
                    {alert.deviceId && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Device ID:</strong> {alert.deviceId}
                      </p>
                    )}
                    {alert.actionTaken && (
                      <p className="text-sm">
                        <strong>Action Taken:</strong> {alert.actionTaken}
                      </p>
                    )}
                  </div>

                  {alert.status === "new" && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        size="sm"
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
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({
                            id: alert.id,
                            status: "resolved",
                            actionTaken: "Manually resolved",
                          })
                        }
                        disabled={updateStatus.isPending}
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({
                            id: alert.id,
                            status: "dismissed",
                          })
                        }
                        disabled={updateStatus.isPending}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
