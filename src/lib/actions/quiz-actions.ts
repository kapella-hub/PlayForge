"use server";

import { db } from "@/lib/db";
import { recordQuizScore } from "./progress-actions";
import type { QuestionType } from "@prisma/client";
import { requireOrgAccess, requireQuizAccess, AuthzError } from "@/lib/authz";

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
  await requireOrgAccess(quiz.orgId);
  return quiz;
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
  answers: { questionId: string; answer: string; correct: boolean }[];
}) {
  const { membership } = await requireQuizAccess(data.quizId);

  const correctCount = data.answers.filter((a) => a.correct).length;
  const score = data.answers.length > 0 ? correctCount / data.answers.length : 0;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: data.quizId,
      userId: membership.userId,
      score,
      answers: data.answers,
      completedAt: new Date(),
    },
  });

  // Update progress per play
  const quiz = await db.quiz.findUnique({
    where: { id: data.quizId },
    include: { questions: true },
  });

  if (quiz) {
    const playScores = new Map<string, { correct: number; total: number }>();

    for (const answer of data.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const existing = playScores.get(question.playId) ?? {
        correct: 0,
        total: 0,
      };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      playScores.set(question.playId, existing);
    }

    for (const [playId, counts] of playScores) {
      const playScore = counts.total > 0 ? counts.correct / counts.total : 0;
      await recordQuizScore(playId, playScore);
    }
  }

  return attempt;
}

export async function getQuizAttempts(quizId: string, userId: string) {
  const { membership } = await requireQuizAccess(quizId);
  if (userId !== membership.userId) throw new AuthzError();
  return db.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { startedAt: "desc" },
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
