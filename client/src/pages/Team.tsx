import AppShell, { useOrgId } from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Users, Crown, Shield, Eye, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  owner: { label: "Owner", icon: Crown, bg: "bg-black", text: "text-white" },
  admin: { label: "Admin", icon: Shield, bg: "bg-black/15", text: "text-black" },
  viewer: { label: "Viewer", icon: Eye, bg: "bg-black/5", text: "text-black/60" },
};

export default function Team() {
  const { isAuthenticated, user } = useAuth();
  const orgId = useOrgId();

  const { data: members, isLoading, refetch } = trpc.members.list.useQuery(
    { orgId },
    { enabled: isAuthenticated && !!orgId }
  );

  const updateRole = trpc.members.updateRole.useMutation({
    onSuccess: () => { refetch(); toast.success("Role updated."); },
  });

  const removeMember = trpc.members.remove.useMutation({
    onSuccess: () => { refetch(); toast.success("Member removed."); },
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <p className="text-sm text-black/40 mt-1">{members?.length ?? 0} members</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-black/15 text-xs h-8"
            onClick={() => toast.info("Invite via email — coming soon.")}>
            Invite Member
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-black/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/8 bg-white overflow-hidden">
            {members?.map((member, i) => {
              const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.viewer;
              const RoleIcon = roleCfg.icon;
              const isCurrentUser = member.userId === user?.id;
              return (
                <div key={member.id}
                  className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-black/5" : ""}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklab(0.7 0.0260473 -0.147721 / 0.12)" }}>
                    <Users className="w-4 h-4 text-black/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {isCurrentUser ? "You" : `Member #${member.userId}`}
                    </div>
                    <div className="text-xs text-black/40">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${roleCfg.bg} ${roleCfg.text}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleCfg.label}
                    </span>
                    {!isCurrentUser && member.role !== "owner" && (
                      <button
                        onClick={() => removeMember.mutate({ orgId, userId: member.userId })}
                        className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
                        <UserMinus className="w-3.5 h-3.5 text-black/30" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Role Legend */}
        <div className="rounded-2xl border border-dashed border-black/10 p-5">
          <h3 className="font-semibold text-sm mb-3">Role Permissions</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={role} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{cfg.label}</div>
                    <div className="text-xs text-black/40 mt-0.5">
                      {role === "owner" && "Full access, billing, delete org"}
                      {role === "admin" && "Manage devices & vulnerabilities"}
                      {role === "viewer" && "Read-only dashboard access"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
