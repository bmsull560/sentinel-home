import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CreditCard, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    devices: 3,
    seats: 1,
    features: ["3 devices", "1 team member", "Weekly scan", "Email alerts"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9",
    period: "/month",
    devices: 10,
    seats: 3,
    features: ["10 devices", "3 team members", "Daily scan", "Real-time alerts", "AI explanations"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    devices: 50,
    seats: 10,
    features: ["50 devices", "10 team members", "Continuous scan", "Agent Console", "API access", "Priority support"],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    devices: -1,
    seats: -1,
    features: ["Unlimited devices", "Unlimited seats", "Custom integrations", "SLA", "Dedicated support"],
  },
];

export default function Billing() {
  const { isAuthenticated } = useAuth();
  const orgId = useOrgId();

  const { data: org } = trpc.org.get.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const currentPlan = org?.plan ?? "free";

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-black/40 mt-1">
            Current plan: <span className="font-semibold text-black capitalize">{currentPlan}</span>
          </p>
        </div>

        {/* Current Usage */}
        <div className="rounded-2xl border border-black/8 bg-white p-5">
          <h2 className="font-semibold text-sm mb-4">Current Usage</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-black/40 mb-1.5">
                <span>Devices</span>
                <span className="font-semibold text-black">
                  {org?.planDevices ?? 3} limit
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/8 overflow-hidden">
                <div className="h-full rounded-full bg-black" style={{ width: "30%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-black/40 mb-1.5">
                <span>Team seats</span>
                <span className="font-semibold text-black">
                  {org?.planSeats ?? 1} limit
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/8 overflow-hidden">
                <div className="h-full rounded-full bg-black" style={{ width: "50%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id}
                className={`rounded-2xl p-5 border transition-all ${
                  plan.highlighted
                    ? "border-black bg-black text-white"
                    : isCurrent
                      ? "border-black/30 bg-white"
                      : "border-black/8 bg-white"
                }`}>
                <div className="mb-4">
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.highlighted ? "text-white/60" : "text-black/40"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    {plan.period && <span className={`text-xs ${plan.highlighted ? "text-white/50" : "text-black/40"}`}>{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${plan.highlighted ? "text-white/70" : "text-black/40"}`} />
                      <span className={plan.highlighted ? "text-white/80" : "text-black/60"}>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className={`text-center text-xs font-semibold py-2 rounded-xl ${
                    plan.highlighted ? "bg-white/20 text-white" : "bg-black/8 text-black/50"
                  }`}>
                    Current plan
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className={`w-full rounded-xl text-xs h-8 ${
                      plan.highlighted
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-black text-white hover:bg-black/80"
                    }`}
                    onClick={() => toast.info("Upgrade flow — coming soon.")}>
                    {plan.id === "enterprise" ? "Contact us" : "Upgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment info */}
        <div className="rounded-2xl border border-dashed border-black/10 p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.12)" }}>
            <CreditCard className="w-4 h-4 text-black/60" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Secure Payments via Stripe</h4>
            <p className="text-xs text-black/40 leading-relaxed">
              All billing is handled securely through Stripe. Your payment information is never stored on our servers.
              Cancel or change plans at any time from this page.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
