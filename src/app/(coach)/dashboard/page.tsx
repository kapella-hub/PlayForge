import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { getTeamAnalytics } from "@/lib/actions/analytics-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { StatCard } from "@/components/analytics/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership || !isCoachRole(membership.role)) redirect("/login");

  const orgId = membership.orgId;

  const [analytics, activeGamePlan] = await Promise.all([
    getTeamAnalytics(orgId),
    getActiveGamePlan(orgId),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Team overview and quick actions.
          </p>
        </div>
        <Link href="/designer">
          <Button>New Play</Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Plays"
          value={analytics.totalPlays}
          color="text-white"
        />
        <StatCard
          label="Install Completion"
          value={`${analytics.installCompletion}%`}
          color="text-green-400"
        />
        <StatCard
          label="Active Players"
          value={analytics.totalPlayers}
          color="text-amber-400"
        />
        <StatCard
          label="Avg Quiz Score"
          value={`${analytics.avgQuizScore}%`}
          color="text-indigo-400"
        />
      </div>

      {/* Getting Started - only if no plays */}
      {analytics.totalPlays === 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-400">
            <p>1. Create your first playbook</p>
            <p>2. Add plays using the Play Designer</p>
            <p>3. Invite your players with an invite code</p>
            <p>4. Build a game plan and assign quizzes</p>
          </CardContent>
        </Card>
      )}

      {/* Inactive Players Alert */}
      {analytics.inactivePlayers.length > 0 && (
        <Card className="mt-6 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-amber-400">
              Inactive Players ({analytics.inactivePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-3">
              These players have not been active in the last 3 days.
            </p>
            <div className="flex flex-wrap gap-2">
              {analytics.inactivePlayers.map((player) => (
                <span
                  key={player.id}
                  className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400"
                >
                  {player.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Game Plan Summary */}
      {activeGamePlan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Active Game Plan: {activeGamePlan.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGamePlan.plays.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No plays added to this game plan yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activeGamePlan.plays.slice(0, 5).map((gpp) => (
                  <div
                    key={gpp.play.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2"
                  >
                    <span className="text-sm font-medium text-zinc-100">
                      {gpp.play.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {gpp.play.formation}
                    </span>
                  </div>
                ))}
                {activeGamePlan.plays.length > 5 && (
                  <p className="text-xs text-zinc-500 text-center pt-1">
                    + {activeGamePlan.plays.length - 5} more plays
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
