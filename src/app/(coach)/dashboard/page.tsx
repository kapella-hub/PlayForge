import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import { getTeamAnalytics } from "@/lib/actions/analytics-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { StatCard } from "@/components/analytics/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DashboardStagger,
  DashboardCard,
  DashboardFadeIn,
  TimeGreeting,
} from "@/components/dashboard/dashboard-client";
import { Layers, CheckCircle2, Users, BrainCircuit } from "lucide-react";

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

  const coachName = session.user.name?.split(" ").slice(-1)[0]
    ? `Coach ${session.user.name.split(" ").slice(-1)[0]}`
    : null;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <TimeGreeting name={coachName} />
        <Link href="/designer">
          <Button>New Play</Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <DashboardStagger>
        <DashboardCard>
          <StatCard
            label="Total Plays"
            value={analytics.totalPlays}
            color="text-foreground"
            icon={Layers}
          />
        </DashboardCard>
        <DashboardCard>
          <StatCard
            label="Install Completion"
            value={`${analytics.installCompletion}%`}
            color="text-success"
            icon={CheckCircle2}
          />
        </DashboardCard>
        <DashboardCard>
          <StatCard
            label="Active Players"
            value={analytics.totalPlayers}
            color="text-accent"
            icon={Users}
          />
        </DashboardCard>
        <DashboardCard>
          <StatCard
            label="Avg Quiz Score"
            value={`${analytics.avgQuizScore}%`}
            color="text-primary-emphasis"
            icon={BrainCircuit}
          />
        </DashboardCard>
      </DashboardStagger>

      {/* Getting Started - only if no plays */}
      {analytics.totalPlays === 0 && (
        <DashboardFadeIn delay={0.4}>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0 text-sm text-muted-foreground sm:pt-0">
              <p>1. Create your first playbook</p>
              <p>2. Add plays using the Play Designer</p>
              <p>3. Invite your players with an invite code</p>
              <p>4. Build a game plan and assign quizzes</p>
            </CardContent>
          </Card>
        </DashboardFadeIn>
      )}

      {/* Inactive Players Alert */}
      {analytics.inactivePlayers.length > 0 && (
        <DashboardFadeIn delay={0.5}>
          <Card className="mt-6 border-warning/50">
            <CardHeader>
              <CardTitle className="text-warning">
                Inactive Players ({analytics.inactivePlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                These players have not been active in the last 3 days.
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.inactivePlayers.map((player) => (
                  <span
                    key={player.id}
                    className="rounded-full bg-warning/10 px-3 py-1 text-xs text-warning"
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </DashboardFadeIn>
      )}

      {/* Active Game Plan Summary */}
      {activeGamePlan && (
        <DashboardFadeIn delay={0.6}>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Active Game Plan: {activeGamePlan.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-0">
              {activeGamePlan.plays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plays added to this game plan yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeGamePlan.plays.slice(0, 5).map((gpp) => (
                    <div
                      key={gpp.play.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {gpp.play.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {gpp.play.formation}
                      </span>
                    </div>
                  ))}
                  {activeGamePlan.plays.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      + {activeGamePlan.plays.length - 5} more plays
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardFadeIn>
      )}
    </div>
  );
}
