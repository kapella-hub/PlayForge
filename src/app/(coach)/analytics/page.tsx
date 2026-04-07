import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import {
  getTeamAnalytics,
  getInstallProgress,
} from "@/lib/actions/analytics-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { StatCard } from "@/components/analytics/stat-card";
import { MasteryHeatmap } from "@/components/analytics/mastery-heatmap";
import { InstallTracker } from "@/components/analytics/install-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership || !isCoachRole(membership.role)) redirect("/login");

  const orgId = membership.orgId;

  const [analytics, installProgress, activeGamePlan] = await Promise.all([
    getTeamAnalytics(orgId),
    getInstallProgress(orgId),
    getActiveGamePlan(orgId),
  ]);

  // Extract unique plays from player progress data for heatmap
  const playsMap = new Map<string, { id: string; name: string }>();
  for (const gpp of analytics.gamePlanPlays) {
    playsMap.set(gpp.id, { id: gpp.id, name: gpp.name });
  }
  const uniquePlays = Array.from(playsMap.values());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-zinc-500">
          Team performance and install progress.
        </p>
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

      {/* Install Tracker */}
      {activeGamePlan && installProgress.gamePlanName && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Install Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <InstallTracker
              gamePlanName={installProgress.gamePlanName}
              plays={installProgress.plays}
            />
          </CardContent>
        </Card>
      )}

      {/* Mastery Heatmap */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mastery Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <MasteryHeatmap
            players={analytics.playerMasteryData}
            plays={uniquePlays}
          />
        </CardContent>
      </Card>
    </div>
  );
}
