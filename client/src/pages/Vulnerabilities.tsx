import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { useState } from "react";

export default function Vulnerabilities() {
  const { data: vulnerabilities, isLoading } = trpc.vulnerabilities.list.useQuery();
  const [selectedVuln, setSelectedVuln] = useState<number | null>(null);
  const [technicalLevel, setTechnicalLevel] = useState<"simple" | "moderate" | "technical">("simple");
  const [dialogOpen, setDialogOpen] = useState(false);

  const explainMutation = trpc.vulnerabilities.explain.useMutation();

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      calm: { label: "Calm", className: "severity-calm", icon: Info },
      be_aware: { label: "Be Aware", className: "severity-be-aware", icon: Info },
      action_recommended: { label: "Action Recommended", className: "severity-action-recommended", icon: AlertTriangle },
      immediate_attention: { label: "Immediate Attention", className: "severity-immediate-attention", icon: AlertTriangle },
    };
    const config = severityMap[severity as keyof typeof severityMap] || severityMap.calm;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleExplain = (vulnId: number) => {
    setSelectedVuln(vulnId);
    setDialogOpen(true);
    explainMutation.mutate({ vulnerabilityId: vulnId, technicalLevel });
  };

  const handleLevelChange = (level: "simple" | "moderate" | "technical") => {
    setTechnicalLevel(level);
    if (selectedVuln) {
      explainMutation.mutate({ vulnerabilityId: selectedVuln, technicalLevel: level });
    }
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
          <h1 className="text-4xl font-semibold tracking-tight mb-2">Vulnerabilities</h1>
          <p className="text-muted-foreground">Track and understand security vulnerabilities affecting your devices</p>
        </div>

        {vulnerabilities && vulnerabilities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Info className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Vulnerabilities Found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Great news! There are currently no known vulnerabilities affecting your devices.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vulnerabilities?.map((vuln) => (
              <Card key={vuln.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{vuln.title}</CardTitle>
                        {getSeverityBadge(vuln.severity)}
                        {vuln.patchAvailable && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Patch Available
                          </Badge>
                        )}
                      </div>
                      {vuln.cveId && (
                        <CardDescription>
                          <strong>CVE ID:</strong> {vuln.cveId}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{vuln.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {vuln.manufacturer && (
                      <div>
                        <strong>Manufacturer:</strong> {vuln.manufacturer}
                      </div>
                    )}
                    <div>
                      <strong>Discovered:</strong> {new Date(vuln.discoveredAt).toLocaleDateString()}
                    </div>
                  </div>

                  {vuln.patchDetails && (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Patch Information</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{vuln.patchDetails}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExplain(vuln.id)}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Explain in Plain Language
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vulnerability Explanation</DialogTitle>
              <DialogDescription>
                Understanding the security issue in clear, calm terms
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Explanation Level</label>
                <Select value={technicalLevel} onValueChange={handleLevelChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple - Everyday language</SelectItem>
                    <SelectItem value="moderate">Moderate - Some technical terms</SelectItem>
                    <SelectItem value="technical">Technical - Full technical details</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                {explainMutation.isPending ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : explainMutation.data ? (
                  <div className="whitespace-pre-wrap">{String(explainMutation.data.explanation)}</div>
                ) : (
                  <p className="text-muted-foreground">Select an explanation level to see the details.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
