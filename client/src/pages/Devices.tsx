import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import {
  Cpu, Plus, Wifi, Smartphone, Laptop, Home, Heart,
  Router, Car, Baby, HelpCircle, Trash2, X, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  smart_home: Home,
  iot: Wifi,
  mobile: Smartphone,
  laptop: Laptop,
  router: Router,
  automotive: Car,
  health: Heart,
  child_pet: Baby,
  other: HelpCircle,
};

const CATEGORY_LABELS: Record<string, string> = {
  smart_home: "Smart Home",
  iot: "IoT / Wearable",
  mobile: "Mobile / Tablet",
  laptop: "Laptop / Desktop",
  router: "Router / Network",
  automotive: "Automotive",
  health: "Health Device",
  child_pet: "Child / Pet",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  secure: { label: "Secure", bg: "bg-black/5", text: "text-black/60" },
  at_risk: { label: "At Risk", bg: "bg-black/15", text: "text-black" },
  critical: { label: "Critical", bg: "bg-black", text: "text-white" },
  unknown: { label: "Unknown", bg: "bg-black/5", text: "text-black/40" },
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface NewDeviceForm {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  ipAddress: string;
}

export default function Devices() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewDeviceForm>({
    name: "", category: "smart_home", manufacturer: "", model: "", firmwareVersion: "", ipAddress: "",
  });

  const { data: devices, isLoading, refetch } = trpc.devices.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const createDevice = trpc.devices.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAdd(false);
      setForm({ name: "", category: "smart_home", manufacturer: "", model: "", firmwareVersion: "", ipAddress: "" });
      toast.success("Device added successfully.");
    },
    onError: () => toast.error("Failed to add device."),
  });

  const deleteDevice = trpc.devices.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Device removed."); },
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    createDevice.mutate({
      orgId,
      name: form.name,
      category: form.category as any,
      manufacturer: form.manufacturer || undefined,
      model: form.model || undefined,
      firmwareVersion: form.firmwareVersion || undefined,
      ipAddress: form.ipAddress || undefined,
    });
  };

  const secureCount = devices?.filter(d => d.status === "secure").length ?? 0;
  const atRiskCount = devices?.filter(d => d.status !== "secure" && d.status !== "unknown").length ?? 0;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
            <p className="text-sm text-black/40 mt-1">
              {devices?.length ?? 0} monitored · {secureCount} secure · {atRiskCount} at risk
            </p>
          </div>
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-black text-white hover:bg-black/80 rounded-xl h-9 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> Add Device
          </Button>
        </div>

        {/* Add Device Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Add Device</h2>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
                  <X className="w-4 h-4 text-black/40" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">Device Name *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="My Ring Doorbell" className="h-10 rounded-xl border-black/10" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-black/10 text-sm bg-white focus:outline-none focus:border-black/30">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">Manufacturer</label>
                    <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                      placeholder="Ring, Nest…" className="h-10 rounded-xl border-black/10" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">Model</label>
                    <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                      placeholder="Doorbell Pro 2" className="h-10 rounded-xl border-black/10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">Firmware</label>
                    <Input value={form.firmwareVersion} onChange={e => setForm(f => ({ ...f, firmwareVersion: e.target.value }))}
                      placeholder="1.2.3" className="h-10 rounded-xl border-black/10" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">IP Address</label>
                    <Input value={form.ipAddress} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                      placeholder="192.168.1.x" className="h-10 rounded-xl border-black/10" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowAdd(false)}
                    className="flex-1 rounded-xl border-black/15 h-10">Cancel</Button>
                  <Button onClick={handleAdd} disabled={!form.name.trim() || createDevice.isPending}
                    className="flex-1 bg-black text-white hover:bg-black/80 rounded-xl h-10">
                    {createDevice.isPending ? "Adding…" : "Add Device"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Device Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-black/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : !devices?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Cpu className="w-12 h-12 text-black/15 mb-4" />
            <h3 className="font-semibold text-base mb-2">No devices yet</h3>
            <p className="text-sm text-black/40 mb-6">Add your first device to start monitoring for vulnerabilities.</p>
            <Button onClick={() => setShowAdd(true)} className="bg-black text-white hover:bg-black/80 rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Add Device
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map(device => {
              const Icon = CATEGORY_ICONS[device.category] ?? HelpCircle;
              const statusCfg = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.unknown;
              return (
                <div key={device.id} className="rounded-2xl border border-black/8 bg-white p-5 hover:border-black/15 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
                      <Icon className="w-5 h-5 text-black" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                      <button
                        onClick={() => deleteDevice.mutate({ id: device.id })}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-black/5 transition-all">
                        <Trash2 className="w-3.5 h-3.5 text-black/30" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 truncate">{device.name}</h3>
                  <div className="text-xs text-black/40 mb-3">
                    {CATEGORY_LABELS[device.category]}
                    {device.manufacturer && ` · ${device.manufacturer}`}
                    {device.model && ` ${device.model}`}
                  </div>
                  <div className="space-y-1.5 text-xs text-black/40">
                    {device.firmwareVersion && (
                      <div className="flex items-center justify-between">
                        <span>Firmware</span>
                        <span className="font-mono font-medium text-black/60">{device.firmwareVersion}</span>
                      </div>
                    )}
                    {device.ipAddress && (
                      <div className="flex items-center justify-between">
                        <span>IP</span>
                        <span className="font-mono font-medium text-black/60">{device.ipAddress}</span>
                      </div>
                    )}
                    {device.lastSeenAt && (
                      <div className="flex items-center justify-between">
                        <span>Last seen</span>
                        <span>{new Date(device.lastSeenAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {device.matchConfidence && (
                      <div className="flex items-center justify-between">
                        <span>CPE match</span>
                        <span className="font-medium text-black/60">{device.matchConfidence}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(devices?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-dashed border-black/10 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.12)" }}>
              <CheckCircle2 className="w-4 h-4 text-black/60" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1">CPE Matching Active</h4>
              <p className="text-xs text-black/40 leading-relaxed">
                Sentinel automatically maps your devices to NVD CPE identifiers using exact, fuzzy, and fingerprint matching strategies.
                Devices with manufacturer and model information have higher match confidence.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
