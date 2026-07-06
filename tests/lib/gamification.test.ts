import { describe, it, expect } from "vitest";
import {
  getEarnedBadges,
  playerStatsFromProgress,
  computeQuizReward,
  type PlayerStats,
} from "@/lib/gamification";

const baseStats: PlayerStats = {
  totalViews: 0,
  totalQuizzes: 0,
  averageScore: 0,
  hasPerfectQuiz: false,
  currentStreak: 0,
  longestStreak: 0,
  playsMastered: 0,
  totalPlays: 0,
  daysActive: 0,
};

describe("Perfect Score badge", () => {
  it("is not earned when no quiz was perfect", () => {
    const badges = getEarnedBadges({ ...baseStats, hasPerfectQuiz: false });
    expect(badges.some((b) => b.id === "perfect-quiz")).toBe(false);
  });

  it("is earned from one perfect quiz even when the average is below 100%", () => {
    const badges = getEarnedBadges({
      ...baseStats,
      averageScore: 0.5,
      hasPerfectQuiz: true,
    });
    expect(badges.some((b) => b.id === "perfect-quiz")).toBe(true);
  });
});

describe("playerStatsFromProgress", () => {
  it("sums views and quiz-score counts and counts mastered plays", () => {
    const stats = playerStatsFromProgress([
      { views: 3, masteryLevel: "mastered", quizScores: [0.8, 1], lastViewedAt: new Date() },
      { views: 1, masteryLevel: "learning", quizScores: [], lastViewedAt: new Date() },
    ]);
    expect(stats.totalViews).toBe(4);
    expect(stats.totalQuizzes).toBe(2);
    expect(stats.playsMastered).toBe(1);
    expect(stats.totalPlays).toBe(2);
  });

  it("returns zeroed placeholders for streak/averageScore/daysActive", () => {
    const stats = playerStatsFromProgress([]);
    expect(stats.averageScore).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.daysActive).toBe(0);
  });

  it("sets hasPerfectQuiz when any recorded quiz score is 100%, mirroring Home", () => {
    const withPerfect = playerStatsFromProgress([
      { views: 1, masteryLevel: "learning", quizScores: [0.5, 1], lastViewedAt: null },
    ]);
    expect(withPerfect.hasPerfectQuiz).toBe(true);

    const withoutPerfect = playerStatsFromProgress([
      { views: 1, masteryLevel: "learning", quizScores: [0.5, 0.9], lastViewedAt: null },
    ]);
    expect(withoutPerfect.hasPerfectQuiz).toBe(false);
  });

  it("computes currentStreak and daysActive from lastViewedAt via computeStreak", () => {
    const now = new Date("2026-07-06T12:00:00Z");
    const stats = playerStatsFromProgress(
      [
        {
          views: 1,
          masteryLevel: "learning",
          quizScores: [],
          lastViewedAt: new Date("2026-07-06T09:00:00Z"),
        },
        {
          views: 1,
          masteryLevel: "learning",
          quizScores: [],
          lastViewedAt: new Date("2026-07-05T09:00:00Z"),
        },
      ],
      now,
    );
    expect(stats.currentStreak).toBe(2);
    expect(stats.daysActive).toBe(2);
  });
});

describe("computeQuizReward", () => {
  it("returns the XP delta between the two snapshots", () => {
    const before = { ...baseStats, totalQuizzes: 0 };
    const after = { ...baseStats, totalQuizzes: 1 };
    expect(computeQuizReward(before, after).xpEarned).toBe(50);
  });

  it("lists badges newly earned in 'after' as plain (function-free) objects", () => {
    const before = { ...baseStats, totalQuizzes: 0 };
    const after = { ...baseStats, totalQuizzes: 1 };
    const { newBadges } = computeQuizReward(before, after);
    expect(newBadges.map((b) => b.id)).toContain("first-quiz");
    expect(newBadges[0]).not.toHaveProperty("condition");
  });

  it("excludes badges already earned before the attempt", () => {
    const before = { ...baseStats, totalQuizzes: 1 };
    const after = { ...baseStats, totalQuizzes: 2 };
    expect(
      computeQuizReward(before, after).newBadges.map((b) => b.id),
    ).not.toContain("first-quiz");
  });

  it("never returns negative XP", () => {
    const before = { ...baseStats, totalViews: 10 };
    const after = { ...baseStats, totalViews: 0 };
    expect(computeQuizReward(before, after).xpEarned).toBe(0);
  });

  it("surfaces the perfect-quiz badge when hasPerfectQuiz newly becomes true", () => {
    const before = { ...baseStats, hasPerfectQuiz: false };
    const after = { ...baseStats, hasPerfectQuiz: true };
    expect(
      computeQuizReward(before, after).newBadges.map((b) => b.id),
    ).toContain("perfect-quiz");
  });

  it("returns an empty newBadges array when no threshold is newly crossed", () => {
    const same = { ...baseStats, totalQuizzes: 1 };
    expect(computeQuizReward(same, same).newBadges).toEqual([]);
  });

  it("does not re-unlock perfect-quiz when it was already earned (true → true)", () => {
    const before = { ...baseStats, hasPerfectQuiz: true };
    const after = { ...baseStats, hasPerfectQuiz: true };
    expect(
      computeQuizReward(before, after).newBadges.map((b) => b.id),
    ).not.toContain("perfect-quiz");
  });
});
