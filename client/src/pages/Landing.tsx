import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  ShieldAlert, Cpu, Bell, Bot, Users, ArrowRight,
  CheckCircle2, Lock, Zap, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Cpu,
    title: "Device Intelligence",
    desc: "Automatically maps every connected device in your environment to known CVEs, firmware advisories, and manufacturer alerts.",
  },
  {
    icon: ShieldAlert,
    title: "Vulnerability Tracking",
    desc: "Four-tier severity system — Calm, Be Aware, Action Recommended, Immediate Attention — so you always know what matters most.",
  },
  {
    icon: Bot,
    title: "Agentic AI Engine",
    desc: "Six specialized agents orchestrate threat analysis, plain-language explanations, and guided remediation in real time.",
  },
  {
    icon: Bell,
    title: "Gentle Alerts",
    desc: "Proactive, non-alarming notifications that tell you what changed, why it matters, and exactly what to do next.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Role-based access for your security team. Owners, admins, and viewers — everyone sees exactly what they need.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    desc: "Data minimization by design. We tell you what's analyzed locally vs. in the cloud, always.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    devices: 10,
    seats: 3,
    features: ["10 monitored devices", "3 team seats", "Basic vulnerability tracking", "Weekly digest"],
  },
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    devices: 50,
    seats: 10,
    features: ["50 monitored devices", "10 team seats", "AI explanations", "Real-time alerts", "API access"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "$99",
    period: "per month",
    devices: 250,
    seats: 50,
    features: ["250 monitored devices", "50 team seats", "Agent Console", "NVD/CISA integration", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    devices: -1,
    seats: -1,
    features: ["Unlimited devices", "Unlimited seats", "Custom integrations", "SLA guarantee", "Dedicated CSM"],
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">Sentinel</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-black/60">
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
            <a href="#agents" className="hover:text-black transition-colors">Agents</a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-black text-white hover:bg-black/80 rounded-xl">
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-sm font-medium text-black/60 hover:text-black transition-colors">Sign in</a>
                <a href={getLoginUrl()}>
                  <Button size="sm" className="bg-black text-white hover:bg-black/80 rounded-xl">
                    Get started free
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
          <Zap className="w-3 h-3" />
          Powered by 6 specialized AI agents
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6">
          The Credit Karma<br />
          <span style={{ color: "oklch(0.55 0.12 250)" }}>of cybersecurity</span><br />
          for your devices.
        </h1>
        <p className="text-lg md:text-xl text-black/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sentinel monitors every connected device in your home or organization, translates complex vulnerabilities into plain language, and guides you to safety — calmly, clearly, and without alarm.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
            <Button size="lg" className="bg-black text-white hover:bg-black/80 rounded-2xl px-8 h-12 text-base font-semibold">
              Start monitoring free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <a href="#features">
            <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 text-base font-semibold border-black/15 hover:bg-black/5">
              See how it works
            </Button>
          </a>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 relative">
          <div className="rounded-3xl border border-black/10 overflow-hidden shadow-2xl shadow-black/5 bg-white">
            <div className="bg-black/5 px-6 py-3 flex items-center gap-2 border-b border-black/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-black/20" />
                <div className="w-3 h-3 rounded-full bg-black/20" />
                <div className="w-3 h-3 rounded-full bg-black/20" />
              </div>
              <div className="flex-1 text-center text-xs text-black/40 font-mono">sentinel.app/dashboard</div>
            </div>
            <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Monitored Devices", value: "24", sub: "3 need attention" },
                { label: "Vulnerabilities", value: "7", sub: "2 critical" },
                { label: "Secure Devices", value: "21", sub: "87.5% healthy" },
                { label: "Threat Sources", value: "5", sub: "Active monitoring" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-2xl p-4 text-left"
                  style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.07)" }}>
                  <div className="text-xs text-black/50 font-medium mb-2">{label}</div>
                  <div className="text-3xl font-bold tracking-tight">{value}</div>
                  <div className="text-xs text-black/40 mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to stay secure</h2>
          <p className="text-black/50 text-lg max-w-xl mx-auto">Built for consumers and enterprise teams alike — powerful intelligence, zero complexity.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl p-6 border border-black/8 hover:border-black/15 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-sm text-black/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Architecture */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-20 border-t border-black/5">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.15)" }}>
              <Bot className="w-3 h-3" />
              Multi-Agent Architecture
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">Six agents. One calm experience.</h2>
            <p className="text-black/50 leading-relaxed mb-8">
              Behind every vulnerability explanation is a coordinated team of AI agents — each with a specific role, working together to give you accurate, safe, and actionable guidance.
            </p>
            <div className="space-y-3">
              {[
                { name: "The Guide", role: "Orchestrator", desc: "Coordinates all agents, maintains context" },
                { name: "The Mapper", role: "Device Intelligence", desc: "Maps devices to CVEs and firmware alerts" },
                { name: "The Explainer", role: "Security Expert", desc: "Safe, responsible technical explanations" },
                { name: "The Sculptor", role: "UX Architect", desc: "Converts intelligence into visual structures" },
                { name: "The Narrator", role: "Storytelling", desc: "Human-readable summaries and gentle nudges" },
                { name: "The Guardian", role: "Ethics & Safety", desc: "Removes alarmism, ensures privacy" },
              ].map(({ name, role, desc }) => (
                <div key={name} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.12 250)" }} />
                  <div>
                    <span className="font-semibold text-sm">{name}</span>
                    <span className="text-black/40 text-sm"> · {role}</span>
                    <div className="text-xs text-black/40">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-8 space-y-3" style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.07)" }}>
            {[
              { step: "01", agent: "Orchestrator", action: "Parsing user intent…" },
              { step: "02", agent: "Mapper", action: "Identifying CVE-2024-1234 on Ring Doorbell Pro 2…" },
              { step: "03", agent: "Explainer", action: "Generating safe explanation…" },
              { step: "04", agent: "Sculptor", action: "Building Risk Card UI…" },
              { step: "05", agent: "Narrator", action: "Composing gentle notification…" },
              { step: "06", agent: "Guardian", action: "Safety pass complete ✓" },
            ].map(({ step, agent, action }) => (
              <div key={step} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-black/5">
                <span className="text-xs font-mono text-black/30 w-6 shrink-0">{step}</span>
                <span className="text-xs font-semibold w-24 shrink-0">{agent}</span>
                <span className="text-xs text-black/50 truncate">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 border-t border-black/5">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
          <p className="text-black/50 text-lg">Start free. Scale as you grow.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(({ name, price, period, features, highlight }) => (
            <div key={name} className={`rounded-2xl p-6 border transition-all ${
              highlight
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white hover:border-black/20"
            }`}>
              <div className="mb-5">
                <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${highlight ? "text-white/60" : "text-black/40"}`}>{name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{price}</span>
                  <span className={`text-sm ${highlight ? "text-white/50" : "text-black/40"}`}>/{period}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${highlight ? "text-white/70" : "text-black/40"}`} />
                    <span className={highlight ? "text-white/80" : "text-black/70"}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href={getLoginUrl()}>
                <Button className={`w-full rounded-xl ${
                  highlight
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-black text-white hover:bg-black/80"
                }`} size="sm">
                  {name === "Enterprise" ? "Contact sales" : "Get started"}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.2)" }}>
              <ShieldAlert className="w-3 h-3" />
            </div>
            <span className="font-bold text-sm">Sentinel</span>
          </div>
          <div className="text-xs text-black/40">
            © 2026 Sentinel Home. The Credit Karma of cybersecurity for your devices.
          </div>
          <div className="flex items-center gap-1 text-xs text-black/40">
            <Globe className="w-3 h-3" />
            Privacy-first by design
          </div>
        </div>
      </footer>
    </div>
  );
}
