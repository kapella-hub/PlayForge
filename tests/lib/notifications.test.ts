import { describe, it, expect } from "vitest";
import {
  generateCoachNotifications,
  generatePlayerNotifications,
  type TeamAnalytics,
  type PlayerProgress,
  type QuizInfo,
} from "@/lib/notifications";

const analytics: TeamAnalytics = {
  gamePlanName: "Week 1",
  installCompletion: 40,
  avgQuizScore: 55,
  inactivePlayers: [{ id: "p1", name: "Sam", lastActive: null }],
  totalPlays: 12,
};

describe("generateCoachNotifications", () => {
  it("produces stable, unique ids across identical calls (dedupe-safe)", () => {
    const a = generateCoachNotifications(analytics).map((n) => n.id);
    const b = generateCoachNotifications(analytics).map((n) => n.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("emits inactive, low-score, and install notifications for this input", () => {
    const ids = generateCoachNotifications(analytics).map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "coach:inactive",
        "coach:low-quiz",
        "coach:install",
      ]),
    );
  });
});

describe("generatePlayerNotifications", () => {
  const past = new Date(Date.now() - 86_400_000);
  const progress: PlayerProgress[] = [
    { playId: "a", masteryLevel: "learning", nextReviewAt: past, views: 2 },
    { playId: "b", masteryLevel: "new_play", nextReviewAt: past, views: 0 },
  ];
  const quizzes: QuizInfo[] = [
    { id: "q1", name: "Coverages", dueDate: null, attempted: false },
  ];

  it("produces stable, unique ids across identical calls", () => {
    const a = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    const b = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("flags due reviews, available quizzes, and new plays", () => {
    const ids = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "player:due-review",
        "player:quiz-available",
        "player:new-plays",
      ]),
    );
  });
});
