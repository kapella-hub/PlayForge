import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerRank } from "@/lib/actions/analytics-actions";
import { hasPerfectQuizAttempt } from "@/lib/actions/quiz-actions";
import { computeStreak } from "@/lib/streak";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Trophy } from "lucide-react";
import {
  BADGES,
  getEarnedBadges,
  calculateXP,
  getLevel,
  type PlayerStats,
} from "@/lib/gamification";

export const dynamic = "force-dynamic";

const MASTERY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  mastered: { bg: "bg-success/20", text: "text-success", bar: "bg-success" },
  reviewing: { bg: "bg-primary/20", text: "text-primary-emphasis", bar: "bg-primary" },
  learning: { bg: "bg-warning/20", text: "text-warning", bar: "bg-warning" },
  new_play: { bg: "bg-destructive/20", text: "text-destructive", bar: "bg-destructive" },
};

const MASTERY_LABELS: Record<string, string> = {
  mastered: "Mastered",
  reviewing: "Reviewing",
  learning: "Learning",
  new_play: "New",
};

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  const [progress, rankInfo, hasPerfectQuiz] = await Promise.all([
    getPlayerProgress(session.user.id),
    membership
      ? getPlayerRank(membership.orgId, session.user.id)
      : Promise.resolve(null),
    hasPerfectQuizAttempt(session.user.id),
  ]);

  const counts = {
    mastered: progress.filter((p) => p.masteryLevel === "mastered").length,
    reviewing: progress.filter((p) => p.masteryLevel === "reviewing").length,
    learning: progress.filter((p) => p.masteryLevel === "learning").length,
    new_play: progress.filter((p) => p.masteryLevel === "new_play").length,
  };

  const total = progress.length;
  const totalViews = progress.reduce((sum, p) => sum + p.views, 0);
  const totalQuizzes = progress.reduce(
    (sum, p) => sum + p.quizScores.length,
    0,
  );
  const allScores = progress.flatMap((p) => p.quizScores);
  const averageScore =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

  const { current: currentStreak, longest: longestStreak, daysActive } =
    computeStreak(progress);

  const stats: PlayerStats = {
    totalViews,
    totalQuizzes,
    averageScore,
    hasPerfectQuiz,
    currentStreak,
    longestStreak,
    playsMastered: counts.mastered,
    totalPlays: total,
    daysActive,
  };

  const xp = calculateXP(stats);
  const levelInfo = getLevel(xp);
  const earnedBadges = getEarnedBadges(stats);
  const earnedIds = new Set(earnedBadges.map((b) => b.id));
  const lockedBadges = BADGES.filter((b) => !earnedIds.has(b.id));
  const xpProgress =
    levelInfo.nextLevelXP > 0
      ? Math.min(100, Math.round((xp / levelInfo.nextLevelXP) * 100))
      : 100;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Track your mastery across all plays.
        </p>
      </div>

      {/* XP & Level Section */}
      <div className="mb-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {levelInfo.level}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {levelInfo.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Level {levelInfo.level} &middot; {xp} XP
                  </p>
                </div>
              </div>
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1">
                  <span className="text-sm">{"\uD83D\uDD25"}</span>
                  <span className="text-xs font-semibold text-accent">
                    {currentStreak} day streak
                  </span>
                </div>
              )}
            </div>
            {/* XP Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{xp} XP</span>
                <span>{levelInfo.nextLevelXP} XP</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rank */}
        {rankInfo && rankInfo.rank !== null && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                <Trophy className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Your Rank: #{rankInfo.rank} of {rankInfo.total}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Composite score: {rankInfo.compositeScore} — based on mastery,
                  quizzes, study time, and streaks
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Badges Earned ({earnedBadges.length}/{BADGES.length})
            </h2>
            {earnedBadges.length > 0 && (
              <div className="mb-3 grid grid-cols-5 gap-2">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="surface-1 flex flex-col items-center gap-1 rounded-lg p-2"
                    title={badge.description}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <span className="text-center text-[9px] leading-tight text-secondary-foreground">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {lockedBadges.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {lockedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="surface-1 flex flex-col items-center gap-1 rounded-lg p-2 opacity-40"
                    title={badge.description}
                  >
                    <span className="text-xl">?</span>
                    <span className="text-center text-[9px] leading-tight text-muted-foreground">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No progress yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Start viewing plays to track your mastery.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["mastered", "reviewing", "learning", "new_play"] as const).map(
              (level) => {
                const colors = MASTERY_COLORS[level];
                return (
                  <Card key={level}>
                    <CardContent className="p-4 text-center">
                      <div
                        className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${colors.bg}`}
                      >
                        <span className={`text-lg font-bold ${colors.text}`}>
                          {counts[level]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {MASTERY_LABELS[level]}
                      </p>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </div>

          {/* Mastery Breakdown Bar */}
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mastery Breakdown
              </h2>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {(["mastered", "reviewing", "learning", "new_play"] as const).map(
                  (level) => {
                    const pct = total > 0 ? (counts[level] / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={level}
                        className={`${MASTERY_COLORS[level].bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  },
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {(["mastered", "reviewing", "learning", "new_play"] as const).map(
                  (level) => (
                    <div key={level} className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${MASTERY_COLORS[level].bar}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {MASTERY_LABELS[level]} ({counts[level]})
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Play List */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Plays
            </h2>
            {progress.map((p) => {
              const colors = MASTERY_COLORS[p.masteryLevel];
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.play.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {p.play.playbook?.name} &middot; {p.views} view
                        {p.views !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${colors.text}`}
                    >
                      {MASTERY_LABELS[p.masteryLevel]}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
