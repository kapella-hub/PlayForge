import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserMembership } from "@/lib/membership";
import { getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerRank } from "@/lib/actions/analytics-actions";
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
  mastered: { bg: "bg-green-900/30", text: "text-green-400", bar: "bg-green-500" },
  reviewing: { bg: "bg-indigo-900/30", text: "text-indigo-400", bar: "bg-indigo-500" },
  learning: { bg: "bg-amber-900/30", text: "text-amber-400", bar: "bg-amber-500" },
  new_play: { bg: "bg-red-900/30", text: "text-red-400", bar: "bg-red-500" },
};

const MASTERY_LABELS: Record<string, string> = {
  mastered: "Mastered",
  reviewing: "Reviewing",
  learning: "Learning",
  new_play: "New",
};

function computeStreak(
  progress: { lastViewedAt: Date | null }[],
): { current: number; longest: number; daysActive: number } {
  const viewDates = progress
    .filter((p) => p.lastViewedAt)
    .map((p) => {
      const d = new Date(p.lastViewedAt!);
      return d.toISOString().slice(0, 10);
    });

  const uniqueDays = [...new Set(viewDates)].sort().reverse();
  const daysActive = uniqueDays.length;

  if (uniqueDays.length === 0) return { current: 0, longest: 0, daysActive: 0 };

  // Parse dates back for streak calculation
  const parseDayKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d); // month is 0-indexed in Date constructor
  };

  let current = 1;
  let longest = 1;
  let streak = 1;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const isActiveToday = uniqueDays[0] === todayKey;

  // Check if streak is current (active today or yesterday)
  if (!isActiveToday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    if (uniqueDays[0] !== yKey) {
      current = 0;
    }
  }

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseDayKey(uniqueDays[i - 1]);
    const curr = parseDayKey(uniqueDays[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.abs(diff - 1) < 0.5) {
      streak++;
      if (i < 10 && current > 0) current = streak; // Only count recent for current
    } else {
      streak = 1;
    }
    longest = Math.max(longest, streak);
  }

  if (current === 0) current = 0;
  longest = Math.max(longest, current);

  return { current, longest, daysActive };
}

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  const [progress, rankInfo] = await Promise.all([
    getPlayerProgress(session.user.id),
    membership
      ? getPlayerRank(membership.orgId, session.user.id)
      : Promise.resolve(null),
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
        <h1 className="text-xl font-bold text-white">Progress</h1>
        <p className="text-sm text-zinc-500">
          Track your mastery across all plays.
        </p>
      </div>

      {/* XP & Level Section */}
      <div className="mb-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {levelInfo.level}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {levelInfo.title}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Level {levelInfo.level} &middot; {xp} XP
                  </p>
                </div>
              </div>
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-amber-900/30 px-3 py-1">
                  <span className="text-sm">{"\uD83D\uDD25"}</span>
                  <span className="text-xs font-semibold text-amber-400">
                    {currentStreak} day streak
                  </span>
                </div>
              )}
            </div>
            {/* XP Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>{xp} XP</span>
                <span>{levelInfo.nextLevelXP} XP</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/20">
                <Trophy className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Your Rank: #{rankInfo.rank} of {rankInfo.total}
                </p>
                <p className="text-[10px] text-zinc-500">
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
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Badges Earned ({earnedBadges.length}/{BADGES.length})
            </h2>
            {earnedBadges.length > 0 && (
              <div className="mb-3 grid grid-cols-5 gap-2">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-1 rounded-lg bg-zinc-800/50 p-2"
                    title={badge.description}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <span className="text-center text-[9px] leading-tight text-zinc-300">
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
                    className="flex flex-col items-center gap-1 rounded-lg bg-zinc-800/20 p-2 opacity-40"
                    title={badge.description}
                  >
                    <span className="text-xl">?</span>
                    <span className="text-center text-[9px] leading-tight text-zinc-500">
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <BarChart3 className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No progress yet</p>
          <p className="mt-1 text-xs text-zinc-600">
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
                      <p className="text-xs text-zinc-500">
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
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
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
                      <span className="text-[10px] text-zinc-500">
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              All Plays
            </h2>
            {progress.map((p) => {
              const colors = MASTERY_COLORS[p.masteryLevel];
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {p.play.name}
                      </p>
                      <p className="text-[10px] text-zinc-600">
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
