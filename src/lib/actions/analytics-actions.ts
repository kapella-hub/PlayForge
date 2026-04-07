"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function getTeamAnalytics(orgId: string) {
  const [memberships, playbooks, activeGamePlan, recentAttempts] =
    await Promise.all([
      db.membership.findMany({
        where: { orgId, role: "player" },
        include: {
          user: {
            include: {
              playerProgress: true,
              quizAttempts: {
                orderBy: { startedAt: "desc" },
                take: 10,
              },
            },
          },
        },
      }),
      db.playbook.findMany({
        where: { orgId },
        include: { _count: { select: { plays: true } } },
      }),
      db.gamePlan.findFirst({
        where: { orgId, isActive: true },
        include: {
          plays: { include: { play: true } },
        },
      }),
      db.quizAttempt.findMany({
        where: {
          quiz: { orgId },
        },
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { user: true, quiz: true },
      }),
    ]);

  const totalPlays = playbooks.reduce((sum, pb) => sum + pb._count.plays, 0);
  const totalPlayers = memberships.length;

  // Install completion: % of players who have viewed ALL active game plan plays
  let installCompletion = 0;
  const gamePlanPlayIds = activeGamePlan?.plays.map((gpp) => gpp.playId) ?? [];

  if (gamePlanPlayIds.length > 0 && totalPlayers > 0) {
    let completedPlayers = 0;
    for (const membership of memberships) {
      const viewedPlayIds = new Set(
        membership.user.playerProgress.map((pp) => pp.playId)
      );
      const viewedAll = gamePlanPlayIds.every((id) => viewedPlayIds.has(id));
      if (viewedAll) completedPlayers++;
    }
    installCompletion = Math.round((completedPlayers / totalPlayers) * 100);
  }

  // Average quiz score
  const allScores = recentAttempts.map((a) => a.score);
  const avgQuizScore =
    allScores.length > 0
      ? Math.round(
          (allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 100
        )
      : 0;

  // Player mastery data
  const playerMasteryData = memberships.map((m) => {
    const progressMap = new Map(
      m.user.playerProgress.map((pp) => [pp.playId, pp])
    );

    const progress = gamePlanPlayIds.map((playId) => {
      const pp = progressMap.get(playId);
      return {
        playId,
        masteryLevel: pp?.masteryLevel ?? ("new_play" as const),
        views: pp?.views ?? 0,
      };
    });

    const lastActivity = m.user.playerProgress.reduce<Date | null>(
      (latest, pp) => {
        if (!pp.lastViewedAt) return latest;
        if (!latest || pp.lastViewedAt > latest) return pp.lastViewedAt;
        return latest;
      },
      null
    );

    return {
      id: m.user.id,
      name: m.user.name ?? m.user.email,
      position: m.position ?? m.positionGroup ?? "Unknown",
      progress,
      lastActive: lastActivity,
    };
  });

  // Inactive players: no activity in 3+ days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const inactivePlayers = playerMasteryData.filter(
    (p) => !p.lastActive || p.lastActive < threeDaysAgo
  );

  return {
    totalPlays,
    totalPlayers,
    installCompletion,
    avgQuizScore,
    playerMasteryData,
    inactivePlayers,
    gamePlanName: activeGamePlan?.name ?? null,
    gamePlanPlays:
      activeGamePlan?.plays.map((gpp) => ({
        id: gpp.play.id,
        name: gpp.play.name,
      })) ?? [],
  };
}

export async function getInstallProgress(orgId: string) {
  const [activeGamePlan, players] = await Promise.all([
    db.gamePlan.findFirst({
      where: { orgId, isActive: true },
      include: {
        plays: {
          include: { play: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    db.membership.findMany({
      where: { orgId, role: "player" },
      include: {
        user: {
          include: {
            playerProgress: true,
            quizAttempts: {
              include: { quiz: { include: { questions: true } } },
            },
          },
        },
      },
    }),
  ]);

  if (!activeGamePlan) {
    return { gamePlanName: null, plays: [] };
  }

  const totalPlayers = players.length;

  const plays = activeGamePlan.plays.map((gpp) => {
    let viewedCount = 0;
    let quizPassedCount = 0;

    for (const player of players) {
      const progress = player.user.playerProgress.find(
        (pp) => pp.playId === gpp.playId
      );
      if (progress && progress.views > 0) {
        viewedCount++;
      }

      // Check if player has passed a quiz covering this play (score >= 0.7)
      const passed = player.user.quizAttempts.some((attempt) => {
        if (attempt.score < 0.7) return false;
        return attempt.quiz.questions.some((q) => q.playId === gpp.playId);
      });
      if (passed) quizPassedCount++;
    }

    return {
      playId: gpp.play.id,
      playName: gpp.play.name,
      formation: gpp.play.formation,
      viewedCount,
      quizPassedCount,
      totalPlayers,
    };
  });

  return {
    gamePlanName: activeGamePlan.name,
    plays,
  };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  positionGroup: string | null;
  playsMastered: number;
  quizAverage: number;
  studyTimeSec: number;
  streak: number;
  compositeScore: number;
  rank: number;
}

export async function getLeaderboard(
  orgId: string,
  positionGroup?: string | null,
): Promise<LeaderboardEntry[]> {
  const memberships = await db.membership.findMany({
    where: {
      orgId,
      role: "player",
      ...(positionGroup ? { positionGroup } : {}),
    },
    include: {
      user: {
        include: {
          playerProgress: true,
          quizAttempts: true,
        },
      },
    },
  });

  const entries: Omit<LeaderboardEntry, "rank">[] = memberships.map((m) => {
    const progress = m.user.playerProgress;
    const playsMastered = progress.filter(
      (p) => p.masteryLevel === "mastered",
    ).length;

    const allScores = m.user.quizAttempts.map((a) => a.score);
    const quizAverage =
      allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : 0;

    const studyTimeSec = progress.reduce((sum, p) => sum + p.timeSpentSec, 0);

    // Calculate streak from view dates
    const viewDates = progress
      .filter((p) => p.lastViewedAt)
      .map((p) => new Date(p.lastViewedAt!).toISOString().slice(0, 10));
    const uniqueDays = [...new Set(viewDates)].sort().reverse();

    let streak = 0;
    if (uniqueDays.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);
      if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
          const prev = new Date(uniqueDays[i - 1]).getTime();
          const curr = new Date(uniqueDays[i]).getTime();
          if (Math.abs((prev - curr) / 86400000 - 1) < 0.5) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Composite score: mastery 40%, quiz avg 30%, study time 20%, streak 10%
    const maxStudyTime = 3600; // normalize to 1 hour cap
    const maxStreak = 30; // normalize to 30 day cap
    const totalPlays = progress.length || 1;

    const masteryPct = playsMastered / totalPlays;
    const quizPct = quizAverage; // already 0-1
    const studyPct = Math.min(studyTimeSec / maxStudyTime, 1);
    const streakPct = Math.min(streak / maxStreak, 1);

    const compositeScore = Math.round(
      (masteryPct * 0.4 + quizPct * 0.3 + studyPct * 0.2 + streakPct * 0.1) *
        100,
    );

    return {
      userId: m.user.id,
      name: m.user.name ?? m.user.email,
      positionGroup: m.positionGroup,
      playsMastered,
      quizAverage: Math.round(quizAverage * 100),
      studyTimeSec,
      streak,
      compositeScore,
    };
  });

  // Sort by composite score descending
  entries.sort((a, b) => b.compositeScore - a.compositeScore);

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export async function getPlayerRank(orgId: string, userId: string) {
  const leaderboard = await getLeaderboard(orgId);
  const total = leaderboard.length;
  const entry = leaderboard.find((e) => e.userId === userId);
  return {
    rank: entry?.rank ?? null,
    total,
    compositeScore: entry?.compositeScore ?? 0,
  };
}
