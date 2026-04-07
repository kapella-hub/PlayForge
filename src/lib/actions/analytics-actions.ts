"use server";

import { db } from "@/lib/db";

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
