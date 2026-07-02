import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { getRoster, getOrganization } from "@/lib/actions/roster-actions";
import { InviteCodeCard } from "@/components/roster/invite-code-card";
import { PlayerCard } from "@/components/roster/player-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership || !isCoachRole(membership.role)) redirect("/login");

  const orgId = membership.orgId;

  const [roster, organization] = await Promise.all([
    getRoster(orgId),
    getOrganization(orgId),
  ]);

  if (!organization) redirect("/login");

  const coaches = roster.filter(
    (m) => m.role === "owner" || m.role === "coach" || m.role === "coordinator"
  );
  const players = roster.filter((m) => m.role === "player");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Roster</h1>
        <p className="text-sm text-zinc-500">
          Manage your team members and invite new players.
        </p>
      </div>

      {/* Invite Code */}
      <div className="mb-8 max-w-md">
        <InviteCodeCard code={organization.inviteCode} orgId={orgId} />
      </div>

      {/* Coaches Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Coaches ({coaches.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <Card key={coach.id}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold leading-none text-emerald-400">
                  {(coach.user.name ?? coach.user.email)?.[0]?.toUpperCase() ??
                    "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {coach.user.name ?? "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {coach.user.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-400">
                  {coach.role}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Players Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Players ({players.length})
        </h2>
        {players.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-zinc-500">
              <p className="text-sm">
                No players have joined yet. Share the invite code to get
                started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
              const playsStudied = player.user.playerProgress.length;
              const lastActive = player.user.playerProgress.reduce<Date | null>(
                (latest, pp) => {
                  if (!pp.lastViewedAt) return latest;
                  if (!latest || pp.lastViewedAt > latest) return pp.lastViewedAt;
                  return latest;
                },
                null,
              );
              const lastActiveLabel = lastActive
                ? lastActive.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <PlayerCard
                  key={player.id}
                  membershipId={player.id}
                  name={player.user.name ?? ""}
                  email={player.user.email}
                  position={player.position}
                  playsStudied={playsStudied}
                  lastActiveLabel={lastActiveLabel}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
