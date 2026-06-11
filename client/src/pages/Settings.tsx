import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Building2, Bell, Shield, Key, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Settings() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();
  const [orgName, setOrgName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  const { data: org, refetch } = trpc.org.get.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  useEffect(() => {
    if (org) {
      setOrgName(org.name ?? "");
      setBillingEmail(org.billingEmail ?? "");
    }
  }, [org]);

  const updateOrg = trpc.org.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Settings saved.");
    },
    onError: () => toast.error("Failed to save settings."),
  });

  const handleSave = () => {
    updateOrg.mutate({
      orgId,
      name: orgName,
      billingEmail: billingEmail || undefined,
    });
  };

  const SECTIONS = [
    {
      id: "organization",
      label: "Organization",
      icon: Building2,
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">
              Organization Name
            </label>
            <Input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="My Home Network"
              className="h-10 rounded-xl border-black/10 max-w-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">
              Billing Email
            </label>
            <Input
              value={billingEmail}
              onChange={e => setBillingEmail(e.target.value)}
              type="email"
              placeholder="billing@example.com"
              className="h-10 rounded-xl border-black/10 max-w-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-black/50 uppercase tracking-wider block mb-1.5">
              Organization Slug
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              <span className="text-xs text-black/30 shrink-0">
                sentinel.app/
              </span>
              <Input
                value={org?.slug ?? ""}
                disabled
                className="h-10 rounded-xl border-black/10 bg-black/3 text-black/40"
              />
            </div>
            <p className="text-xs text-black/30 mt-1">
              Slug cannot be changed after creation.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateOrg.isPending}
            className="bg-black text-white hover:bg-black/80 rounded-xl h-9 text-sm gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {updateOrg.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      content: (
        <div className="space-y-4">
          {[
            {
              label: "Critical vulnerability alerts",
              desc: "Immediate attention required",
              enabled: true,
            },
            {
              label: "Weekly security digest",
              desc: "Summary of your security posture",
              enabled: true,
            },
            {
              label: "Device status changes",
              desc: "When a device goes from secure to at risk",
              enabled: false,
            },
            {
              label: "New CVE matches",
              desc: "When new CVEs match your devices",
              enabled: true,
            },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-black/5 last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-black/40 mt-0.5">{item.desc}</div>
              </div>
              <button
                onClick={() =>
                  toast.info("Notification preferences — coming soon.")
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${item.enabled ? "bg-black" : "bg-black/15"}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-black/5">
            <div>
              <div className="text-sm font-medium">
                Two-Factor Authentication
              </div>
              <div className="text-xs text-black/40 mt-0.5">
                Add an extra layer of security to your account
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-black/15 text-xs h-8"
              onClick={() => toast.info("2FA setup — coming soon.")}
            >
              Enable
            </Button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-black/5">
            <div>
              <div className="text-sm font-medium">Session Management</div>
              <div className="text-xs text-black/40 mt-0.5">
                View and revoke active sessions
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-black/15 text-xs h-8"
              onClick={() => toast.info("Session management — coming soon.")}
            >
              Manage
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-black">
                Delete Organization
              </div>
              <div className="text-xs text-black/40 mt-0.5">
                Permanently delete all data. This cannot be undone.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-black/30 text-xs h-8 text-black"
              onClick={() =>
                toast.error("Contact support to delete your organization.")
              }
            >
              Delete
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "api",
      label: "API Keys",
      icon: Key,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-black/50">
            API keys allow programmatic access to your Sentinel data. Keep them
            secret — treat them like passwords.
          </p>
          <div className="rounded-xl border border-dashed border-black/15 p-8 text-center">
            <Key className="w-8 h-8 text-black/15 mx-auto mb-3" />
            <p className="text-sm text-black/40 mb-4">No API keys yet</p>
            <Button
              size="sm"
              className="bg-black text-white hover:bg-black/80 rounded-xl text-xs h-8 gap-2"
              onClick={() => toast.info("API key generation — coming soon.")}
            >
              <Key className="w-3.5 h-3.5" /> Generate API Key
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-black/40 mt-1">
            Manage your organization configuration
          </p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-2xl border border-black/8 bg-white overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: "oklab(0.7 0.0260473 -0.147721 / 0.12)",
                    }}
                  >
                    <Icon className="w-4 h-4 text-black/60" />
                  </div>
                  <h2 className="font-semibold text-sm">{section.label}</h2>
                </div>
                <div className="p-5">{section.content}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
