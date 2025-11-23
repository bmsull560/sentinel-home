import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Laptop, Monitor, Plus, Router, Smartphone, Watch } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Devices() {
  const utils = trpc.useUtils();
  const { data: devices, isLoading } = trpc.devices.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "smart_home" as const,
    manufacturer: "",
    model: "",
    firmwareVersion: "",
  });

  const createDevice = trpc.devices.create.useMutation({
    onSuccess: () => {
      utils.devices.list.invalidate();
      utils.dashboard.overview.invalidate();
      setDialogOpen(false);
      setFormData({
        name: "",
        category: "smart_home",
        manufacturer: "",
        model: "",
        firmwareVersion: "",
      });
      toast.success("Device added successfully");
    },
  });

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      smart_home: Monitor,
      iot: Watch,
      mobile: Smartphone,
      laptop: Laptop,
      router: Router,
      automotive: Monitor,
      health: Watch,
      child_pet: Monitor,
    };
    const Icon = iconMap[category as keyof typeof iconMap] || Monitor;
    return <Icon className="h-5 w-5" />;
  };

  const getCategoryLabel = (category: string) => {
    const labelMap = {
      smart_home: "Smart Home",
      iot: "IoT Device",
      mobile: "Mobile",
      laptop: "Laptop",
      router: "Router",
      automotive: "Automotive",
      health: "Health Device",
      child_pet: "Child/Pet Device",
    };
    return labelMap[category as keyof typeof labelMap] || category;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      secure: { label: "Secure", className: "status-secure" },
      at_risk: { label: "At Risk", className: "status-at-risk" },
      unknown: { label: "Unknown", className: "status-unknown" },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.unknown;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDevice.mutate(formData);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight mb-2">Devices</h1>
            <p className="text-muted-foreground">Manage and monitor your connected devices</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Device</DialogTitle>
                  <DialogDescription>Register a new device for security monitoring</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Device Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Living Room Camera"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value as typeof formData.category })
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smart_home">Smart Home</SelectItem>
                        <SelectItem value="iot">IoT Device</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="router">Router</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="health">Health Device</SelectItem>
                        <SelectItem value="child_pet">Child/Pet Device</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., Ring, Nest, Apple"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g., Video Doorbell Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firmware">Firmware Version</Label>
                    <Input
                      id="firmware"
                      value={formData.firmwareVersion}
                      onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })}
                      placeholder="e.g., 2.1.5"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDevice.isPending}>
                    {createDevice.isPending ? "Adding..." : "Add Device"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {devices && devices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Monitor className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Devices Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Start by adding your first device to begin monitoring its security status.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices?.map((device) => (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getCategoryIcon(device.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                        <CardDescription>{getCategoryLabel(device.category)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {device.manufacturer && (
                    <p className="text-sm">
                      <strong>Manufacturer:</strong> {device.manufacturer}
                    </p>
                  )}
                  {device.model && (
                    <p className="text-sm">
                      <strong>Model:</strong> {device.model}
                    </p>
                  )}
                  {device.firmwareVersion && (
                    <p className="text-sm">
                      <strong>Firmware:</strong> {device.firmwareVersion}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground pt-2">
                    Last checked: {new Date(device.lastChecked).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
