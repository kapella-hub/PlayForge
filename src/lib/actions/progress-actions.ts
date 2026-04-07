"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateNextReview,
  qualityFromScore,
  masteryFromInterval,
} from "@/lib/spaced-repetition/sm2";
import type { MasteryLevel } from "@prisma/client";

export async function recordPlayView(playId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const now = new Date();

  const existing = await db.playerProgress.findUnique({
    where: { userId_playId: { userId, playId } },
  });

  const state = {
    easeFactor: existing?.easeFactor ?? 2.5,
    intervalDays: existing?.intervalDays ?? 0,
    repetition: existing ? (existing.intervalDays === 0 ? 0 : 1) : 0,
  };

  const next = calculateNextReview(state, 3);
  const nextReviewAt = new Date(
    now.getTime() + next.intervalDays * 24 * 60 * 60 * 1000,
  );

  return db.playerProgress.upsert({
    where: { userId_playId: { userId, playId } },
    create: {
      userId,
      playId,
      views: 1,
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
    update: {
      views: { increment: 1 },
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
  });
}

export async function recordQuizScore(playId: string, score: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const now = new Date();

  const existing = await db.playerProgress.findUnique({
    where: { userId_playId: { userId, playId } },
  });

  const quality = qualityFromScore(score);
  const state = {
    easeFactor: existing?.easeFactor ?? 2.5,
    intervalDays: existing?.intervalDays ?? 0,
    repetition: existing ? (existing.intervalDays === 0 ? 0 : 1) : 0,
  };

  const next = calculateNextReview(state, quality);
  const nextReviewAt = new Date(
    now.getTime() + next.intervalDays * 24 * 60 * 60 * 1000,
  );

  const quizScores = existing ? [...existing.quizScores, score] : [score];

  return db.playerProgress.upsert({
    where: { userId_playId: { userId, playId } },
    create: {
      userId,
      playId,
      quizScores: [score],
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
    update: {
      quizScores,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
  });
}

export async function getPlayerProgress(userId: string) {
  return db.playerProgress.findMany({
    where: { userId },
    include: {
      play: {
        include: {
          playbook: true,
        },
      },
    },
    orderBy: { nextReviewAt: "asc" },
  });
}

export async function getDueForReview(userId: string) {
  const now = new Date();

  return db.playerProgress.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
    },
    include: {
      play: true,
    },
    orderBy: { nextReviewAt: "asc" },
    take: 10,
  });
}
