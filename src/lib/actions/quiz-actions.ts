"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordQuizScore } from "./progress-actions";
import type { QuestionType } from "@prisma/client";

export async function getQuizzes(orgId: string) {
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
  return db.quiz.findUnique({
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
}

export async function getPlayerQuizzes(orgId: string) {
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.quiz.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      gamePlanId: data.gamePlanId,
      dueDate: data.dueDate,
      createdById: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const correctCount = data.answers.filter((a) => a.correct).length;
  const score = data.answers.length > 0 ? correctCount / data.answers.length : 0;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: data.quizId,
      userId: session.user.id,
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
  return db.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { startedAt: "desc" },
  });
}
