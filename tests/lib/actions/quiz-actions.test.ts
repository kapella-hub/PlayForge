import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const tx = {
    playerProgress: { findMany: vi.fn().mockResolvedValue([]) },
    quizAttempt: { create: vi.fn().mockResolvedValue({ id: "a1" }) },
    quiz: {
      findUnique: vi.fn().mockResolvedValue({ id: "q1", questions: [] }),
    },
  };
  return {
    db: {
      quiz: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
      quizQuestion: { findUnique: vi.fn() },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/lib/authz", () => ({
  requireQuizAccess: vi.fn(),
  requireOrgAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));
// Importing quiz-actions.ts pulls in @/lib/auth (NextAuth inits on import) via
// its top-level `auth` import and the transitive progress-actions import.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
// Mock via the alias: it resolves to the same absolute module as quiz-actions.ts's
// relative `./progress-actions` import, so vitest intercepts it.
vi.mock("@/lib/actions/progress-actions", () => ({ recordQuizScore: vi.fn() }));

import { updateQuiz, deleteQuiz, getPlayerQuiz, checkAnswer } from "@/lib/actions/quiz-actions";
import { db } from "@/lib/db";
import { requireQuizAccess, requireOrgAccess, AuthzError } from "@/lib/authz";
import { recordQuizScore } from "@/lib/actions/progress-actions";

const mockedRequire = vi.mocked(requireQuizAccess);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateQuiz", () => {
  it("authorizes as coach, then updates the name", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.update).mockResolvedValue({ id: "q1", name: "New" } as never);

    await updateQuiz("q1", { name: "New" });

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { name: "New" },
    });
    // Verify authorization is checked before db mutation
    expect(mockedRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.quiz.update).mock.invocationCallOrder[0]
    );
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(updateQuiz("q1", { name: "New" })).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.update).not.toHaveBeenCalled();
  });
});

describe("deleteQuiz", () => {
  it("authorizes as coach, then deletes", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.delete).mockResolvedValue({ id: "q1" } as never);

    await deleteQuiz("q1");

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
    // Verify authorization is checked before db mutation
    expect(mockedRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.quiz.delete).mock.invocationCallOrder[0]
    );
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(deleteQuiz("q1")).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.delete).not.toHaveBeenCalled();
  });
});

describe("submitQuizAttempt (transactional)", () => {
  it("runs snapshot/attempt/reward inside db.$transaction", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);

    const result = await submitQuizAttempt({ quizId: "q1", answers: [] });

    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      xpEarned: 0,
      newBadges: [],
      scorePercent: 0,
      correctCount: 0,
      supportedCount: 0,
      streak: { current: 0, extended: false },
    });
    // the attempt write went through the tx client, not the root db
    expect((db as unknown as { __tx: { quizAttempt: { create: ReturnType<typeof vi.fn> } } }).__tx.quizAttempt.create).toHaveBeenCalledTimes(1);
  });

  it("reports streak.extended when the after-snapshot streak exceeds before", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as {
      __tx: { playerProgress: { findMany: ReturnType<typeof vi.fn> } };
    }).__tx;
    tx.playerProgress.findMany
      .mockResolvedValueOnce([]) // before: no activity → streak 0
      .mockResolvedValueOnce([
        {
          views: 0,
          masteryLevel: "learning",
          quizScores: [1],
          lastViewedAt: new Date(),
        },
      ]); // after: studied today → streak 1

    const result = await submitQuizAttempt({ quizId: "q1", answers: [] });
    expect(result.streak).toEqual({ current: 1, extended: true });
  });

  it("does not extend the streak (or award phantom streak XP) when already active today", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as {
      __tx: { playerProgress: { findMany: ReturnType<typeof vi.fn> } };
    }).__tx;
    // One captured value reused for both rows, so before/after land on the
    // exact same day bucket regardless of when computeStreak's internal
    // `new Date()` resolves relative to this test.
    const today = new Date();
    tx.playerProgress.findMany
      .mockResolvedValueOnce([
        {
          views: 0,
          masteryLevel: "learning",
          quizScores: [],
          lastViewedAt: today,
        },
      ]) // before: already studied today → streak 1
      .mockResolvedValueOnce([
        {
          views: 0,
          masteryLevel: "learning",
          quizScores: [1],
          lastViewedAt: today,
        },
      ]); // after: still today, one more quiz scored → streak still 1

    const result = await submitQuizAttempt({ quizId: "q1", answers: [] });

    expect(result.streak).toEqual({ current: 1, extended: false });
    // +50 for the newly-scored quiz only; a phantom streak bump would add +25
    expect(result.xpEarned).toBe(50);
  });

  it("passes the tx client (not db) into recordQuizScore", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as { __tx: { quiz: { findUnique: ReturnType<typeof vi.fn> } } }).__tx;
    tx.quiz.findUnique.mockResolvedValueOnce({
      id: "q1",
      questions: [
        {
          id: "qq1",
          playId: "p1",
          questionType: "multiple_choice",
          options: [{ text: "a", correct: true }],
        },
      ],
    });

    await submitQuizAttempt({
      quizId: "q1",
      answers: [{ questionId: "qq1", answer: "a" }],
    });

    expect(vi.mocked(recordQuizScore)).toHaveBeenCalledWith("p1", 1, tx);
  });

  it("dedupes answers by questionId, keeping only the first occurrence", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as { __tx: { quiz: { findUnique: ReturnType<typeof vi.fn> } } }).__tx;
    tx.quiz.findUnique.mockResolvedValueOnce({
      id: "q1",
      questions: [
        {
          id: "qq1",
          playId: "p1",
          questionType: "multiple_choice",
          options: [{ text: "a", correct: true }],
        },
      ],
    });

    // A crafted call submits two entries for the same question; only the
    // first (correct) should count, so a second contradictory entry can't
    // double-weight the denominator or flip the verdict.
    const result = await submitQuizAttempt({
      quizId: "q1",
      answers: [
        { questionId: "qq1", answer: "a" },
        { questionId: "qq1", answer: "wrong" },
      ],
    });

    expect(result.supportedCount).toBe(1);
    expect(result.correctCount).toBe(1);
  });

  it("grades case/whitespace-differing answers as incorrect (exact match only)", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as { __tx: { quiz: { findUnique: ReturnType<typeof vi.fn> } } }).__tx;
    tx.quiz.findUnique.mockResolvedValueOnce({
      id: "q1",
      questions: [
        {
          id: "qq1",
          playId: "p1",
          questionType: "multiple_choice",
          options: [{ text: "Cover 2", correct: true }],
        },
      ],
    });

    const result = await submitQuizAttempt({
      quizId: "q1",
      answers: [{ questionId: "qq1", answer: "cover 2" }],
    });

    expect(result.correctCount).toBe(0);
    expect(result.supportedCount).toBe(1);
  });
});

describe("getPlayerQuiz", () => {
  it("strips the answer key: options carry only text, no correct/correctAnswer/correctZone", async () => {
    vi.mocked(requireOrgAccess).mockResolvedValue({} as never);
    vi.mocked(db.quiz.findUnique).mockResolvedValue({
      id: "q1",
      orgId: "o1",
      name: "Coverages",
      questions: [
        {
          id: "qq1",
          questionType: "multiple_choice",
          questionText: "Which coverage?",
          options: [
            { text: "Cover 2", correct: true },
            { text: "Cover 3", correct: false },
          ],
          correctAnswer: "Cover 2",
          correctZone: { x: 1 },
          play: { name: "Smash", formation: "Trips" },
        },
      ],
    } as never);

    const quiz = await getPlayerQuiz("q1");

    expect(vi.mocked(requireOrgAccess)).toHaveBeenCalledWith("o1");
    const question = quiz!.questions[0];
    expect(question.options).toEqual([{ text: "Cover 2" }, { text: "Cover 3" }]);
    expect(question.options![0]).not.toHaveProperty("correct");
    expect(question).not.toHaveProperty("correctAnswer");
    expect(question).not.toHaveProperty("correctZone");
  });

  it("returns null when the quiz does not exist", async () => {
    vi.mocked(db.quiz.findUnique).mockResolvedValue(null as never);
    expect(await getPlayerQuiz("nope")).toBeNull();
  });
});

describe("checkAnswer", () => {
  it("authorizes via the question's quiz, then returns correctness + correctText", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue({
      id: "qq1",
      quizId: "q1",
      questionType: "multiple_choice",
      options: [
        { text: "Cover 2", correct: true },
        { text: "Cover 3", correct: false },
      ],
    } as never);
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);

    const right = await checkAnswer("qq1", "Cover 2");
    expect(mockedRequire).toHaveBeenCalledWith("q1");
    expect(right).toEqual({ correct: true, correctText: "Cover 2" });

    const wrong = await checkAnswer("qq1", "Cover 3");
    expect(wrong).toEqual({ correct: false, correctText: "Cover 2" });
  });

  it("throws AuthzError and never leaks correctness for an unknown question", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue(null as never);
    await expect(checkAnswer("ghost", "x")).rejects.toBeInstanceOf(AuthzError);
    expect(mockedRequire).not.toHaveBeenCalled();
  });

  it("returns a non-correct result for unsupported question types", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue({
      id: "qq2",
      quizId: "q1",
      questionType: "tap_field",
      options: null,
    } as never);
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);

    expect(await checkAnswer("qq2", "x")).toEqual({
      correct: false,
      correctText: null,
    });
  });

  it("throws AuthzError without leaking correctness when access is denied (foreign org)", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue({
      id: "qq3",
      quizId: "q1",
      questionType: "multiple_choice",
      options: [
        { text: "Cover 2", correct: true },
        { text: "Cover 3", correct: false },
      ],
    } as never);
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(checkAnswer("qq3", "Cover 2")).rejects.toBeInstanceOf(AuthzError);
    expect(mockedRequire).toHaveBeenCalledWith("q1");
  });
});
