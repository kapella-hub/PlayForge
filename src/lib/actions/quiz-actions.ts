"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordQuizScore } from "./progress-actions";
import type { Prisma, QuestionType } from "@prisma/client";
import { requireOrgAccess, requireQuizAccess, AuthzError } from "@/lib/authz";
import {
  playerStatsFromProgress,
  computeQuizReward,
  type RewardBadge,
} from "@/lib/gamification";
import { gradeAnswers, matchMultipleChoice } from "@/lib/quiz-grading";
import { computeScorePercent } from "@/lib/quiz-score";

export async function getQuizzes(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true, attempts: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuiz(id: string) {
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          play: { select: { name: true, formation: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!quiz) return null;
  await requireOrgAccess(quiz.orgId, { coach: true });
  return quiz;
}

export async function getPlayerQuiz(id: string) {
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          play: { select: { name: true, formation: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!quiz) return null;
  await requireOrgAccess(quiz.orgId);

  return {
    id: quiz.id,
    name: quiz.name,
    questions: quiz.questions.map((q) => {
      const options = q.options as
        | { text: string; correct: boolean }[]
        | null;
      return {
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        options: options ? options.map((o) => ({ text: o.text })) : null,
        play: q.play
          ? { name: q.play.name, formation: q.play.formation }
          : null,
      };
    }),
  };
}

export async function checkAnswer(
  questionId: string,
  answer: string,
): Promise<{ correct: boolean; correctText: string | null }> {
  const question = await db.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true, questionType: true, options: true },
  });
  if (!question) throw new AuthzError();
  await requireQuizAccess(question.quizId);

  if (question.questionType !== "multiple_choice") {
    return { correct: false, correctText: null };
  }
  const options = question.options as
    | { text: string; correct: boolean }[]
    | null;
  return matchMultipleChoice(options, answer);
}

export async function getPlayerQuizzes(orgId: string) {
  await requireOrgAccess(orgId);
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function getAttemptedQuizIds(userId: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthzError();
  if (userId !== session.user.id) throw new AuthzError();

  const attempts = await db.quizAttempt.findMany({
    where: { userId },
    select: { quizId: true },
  });
  return [...new Set(attempts.map((a) => a.quizId))];
}

// Attempt-level "Perfect Score" identity: true once any quiz attempt has a
// perfect overall graded score. Per-play progress rows can't express this
// (see the comment on playerStatsFromProgress), so display surfaces that
// show badges must call this instead of deriving it from quizScores.
export async function hasPerfectQuizAttempt(userId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthzError();
  if (userId !== session.user.id) throw new AuthzError();

  const count = await db.quizAttempt.count({
    where: { userId, score: { gte: 1 } },
  });
  return count > 0;
}

export async function createQuiz(data: {
  orgId: string;
  name: string;
  gamePlanId?: string;
  dueDate?: Date;
}) {
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  return db.quiz.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      gamePlanId: data.gamePlanId,
      dueDate: data.dueDate,
      createdById: membership.userId,
    },
  });
}

export async function addQuizQuestion(data: {
  quizId: string;
  playId: string;
  questionType: QuestionType;
  questionText: string;
  options?: unknown;
  correctZone?: unknown;
  correctAnswer?: string;
  sortOrder: number;
}) {
  await requireQuizAccess(data.quizId, { coach: true });

  return db.quizQuestion.create({
    data: {
      quizId: data.quizId,
      playId: data.playId,
      questionType: data.questionType,
      questionText: data.questionText,
      options: data.options ?? undefined,
      correctZone: data.correctZone ?? undefined,
      correctAnswer: data.correctAnswer,
      sortOrder: data.sortOrder,
    },
  });
}

export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string }[];
}): Promise<{
  xpEarned: number;
  newBadges: RewardBadge[];
  scorePercent: number;
  correctCount: number;
  supportedCount: number;
  streak: { current: number; extended: boolean };
}> {
  const { membership } = await requireQuizAccess(data.quizId);
  const userId = membership.userId;

  // One answer per question: a crafted call could submit duplicate
  // questionIds to double-weight the denominator, so keep only the first.
  const seenQuestionIds = new Set<string>();
  const dedupedAnswers = data.answers.filter((a) => {
    if (seenQuestionIds.has(a.questionId)) return false;
    seenQuestionIds.add(a.questionId);
    return true;
  });

  return db.$transaction(async (tx) => {
    const now = new Date();

    // Snapshot stats BEFORE recording the attempt.
    const beforeRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true, lastViewedAt: true },
    });
    const beforeStats = playerStatsFromProgress(beforeRows, now);

    // "Perfect Score" is attempt-level: did the player already have a
    // perfect-scored attempt before this one? Must run before this
    // attempt's insert below so it doesn't count itself.
    const hadPerfectBefore =
      (await tx.quizAttempt.count({ where: { userId, score: { gte: 1 } } })) > 0;
    beforeStats.hasPerfectQuiz = hadPerfectBefore;

    // Fetch the quiz's questions and grade server-side.
    const quiz = await tx.quiz.findUnique({
      where: { id: data.quizId },
      include: { questions: true },
    });
    const gradingQuestions =
      quiz?.questions.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        options: q.options as { text: string; correct: boolean }[] | null,
      })) ?? [];
    const grade = gradeAnswers(gradingQuestions, dedupedAnswers);

    await tx.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId,
        score: grade.score,
        answers: grade.graded as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // Update progress per play. Denominated on each play's supported
    // questions in the quiz (mirrors the quiz-level fix in gradeAnswers),
    // not on what was submitted: a play with an unanswered supported
    // question must not be skipped or silently score 100%.
    if (quiz) {
      const gradedById = new Map(grade.graded.map((g) => [g.questionId, g]));
      const playScores = new Map<string, { correct: number; total: number }>();
      for (const question of quiz.questions) {
        if (question.questionType !== "multiple_choice") continue;
        const existing = playScores.get(question.playId) ?? {
          correct: 0,
          total: 0,
        };
        existing.total += 1;
        if (gradedById.get(question.id)?.correct) existing.correct += 1;
        playScores.set(question.playId, existing);
      }
      for (const [playId, counts] of playScores) {
        const playScore = counts.total > 0 ? counts.correct / counts.total : 0;
        await recordQuizScore(playId, playScore, tx);
      }
    }

    // Snapshot stats AFTER, then return the reward delta + server score.
    const afterRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true, lastViewedAt: true },
    });
    const afterStats = playerStatsFromProgress(afterRows, now);
    const isPerfectNow = grade.supportedCount > 0 && grade.score === 1;
    afterStats.hasPerfectQuiz = hadPerfectBefore || isPerfectNow;

    return {
      ...computeQuizReward(beforeStats, afterStats),
      scorePercent: computeScorePercent(grade.correctCount, grade.supportedCount),
      correctCount: grade.correctCount,
      supportedCount: grade.supportedCount,
      streak: {
        current: afterStats.currentStreak,
        extended: afterStats.currentStreak > beforeStats.currentStreak,
      },
    };
  });
}

export async function updateQuiz(id: string, data: { name: string }) {
  await requireQuizAccess(id, { coach: true });
  return db.quiz.update({
    where: { id },
    data: { name: data.name },
  });
}

export async function deleteQuiz(id: string) {
  await requireQuizAccess(id, { coach: true });
  await db.quiz.delete({ where: { id } });
}
