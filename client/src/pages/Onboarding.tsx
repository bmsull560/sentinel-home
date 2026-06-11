import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ArrowRight, Building2, Cpu } from "lucide-react";
import { toast } from "sonner";

const DEVICE_CATEGORIES = [
  {
    id: "smart_home",
    label: "Smart Home",
    desc: "Locks, cameras, thermostats",
  },
  { id: "router", label: "Router / Network", desc: "Wi-Fi routers, switches" },
  { id: "mobile", label: "Mobile / Tablet", desc: "Phones, iPads, Android" },
  { id: "laptop", label: "Laptop / Desktop", desc: "Computers, workstations" },
  { id: "iot", label: "IoT / Wearables", desc: "Speakers, sensors, watches" },
  { id: "health", label: "Health Devices", desc: "Monitors, trackers" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState(
    user?.name ? `${user.name}'s Home` : "My Home"
  );
  const [orgSlug, setOrgSlug] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [createdOrgId, setCreatedOrgId] = useState<number | null>(null);

  const createOrg = trpc.org.create.useMutation();
  const createDevice = trpc.devices.create.useMutation();

  const handleOrgName = (v: string) => {
    setOrgName(v);
    setOrgSlug(
      v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64)
    );
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !orgSlug.trim()) return;
    try {
      const org = await createOrg.mutateAsync({ name: orgName, slug: orgSlug });
      setCreatedOrgId(org.id);
      setStep(2);
    } catch {
      toast.error("That workspace name is already taken. Try another.");
    }
  };

  const handleFinish = async () => {
    if (!createdOrgId) return;
    await Promise.all(
      selectedCategories.map(cat =>
        createDevice.mutateAsync({
          orgId: createdOrgId,
          name: DEVICE_CATEGORIES.find(c => c.id === cat)?.label ?? cat,
          category: cat as any,
        })
      )
    );
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}
        >
          <ShieldAlert className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight">Sentinel</span>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s <= step ? "bg-black text-white" : "bg-black/10 text-black/40"
              }`}
            >
              {s}
            </div>
            {s < 2 && (
              <div
                className={`w-12 h-px transition-all ${step > s ? "bg-black" : "bg-black/15"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">
        {step === 1 && (
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}
              >
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Name your workspace
              </h1>
              <p className="text-black/50 text-sm">
                This is your organization in Sentinel. You can change it later.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">
                  Workspace name
                </label>
                <Input
                  value={orgName}
                  onChange={e => handleOrgName(e.target.value)}
                  placeholder="My Home, Acme Corp…"
                  className="h-12 rounded-xl border-black/15 text-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">
                  URL slug
                </label>
                <div className="flex items-center gap-0 border border-black/15 rounded-xl overflow-hidden h-12">
                  <span className="px-3 text-sm text-black/40 bg-black/5 h-full flex items-center border-r border-black/10">
                    sentinel.app/
                  </span>
                  <Input
                    value={orgSlug}
                    onChange={e =>
                      setOrgSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="my-home"
                    className="border-0 rounded-none h-full text-sm focus-visible:ring-0"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateOrg}
                disabled={
                  !orgName.trim() || !orgSlug.trim() || createOrg.isPending
                }
                className="w-full h-12 bg-black text-white hover:bg-black/80 rounded-xl text-base font-semibold mt-2"
              >
                {createOrg.isPending ? "Creating…" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}
              >
                <Cpu className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                What devices do you have?
              </h1>
              <p className="text-black/50 text-sm">
                Select all that apply. You can add specific devices later.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {DEVICE_CATEGORIES.map(({ id, label, desc }) => {
                const selected = selectedCategories.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() =>
                      setSelectedCategories(prev =>
                        selected ? prev.filter(c => c !== id) : [...prev, id]
                      )
                    }
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-black/10 hover:border-black/25"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-0.5">{label}</div>
                    <div
                      className={`text-xs ${selected ? "text-white/60" : "text-black/40"}`}
                    >
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={handleFinish}
              disabled={createDevice.isPending}
              className="w-full h-12 bg-black text-white hover:bg-black/80 rounded-xl text-base font-semibold"
            >
              {createDevice.isPending ? "Setting up…" : "Launch dashboard"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-full text-center text-sm text-black/40 hover:text-black mt-3 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
