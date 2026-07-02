import { describe, it, expect } from "vitest";
import { getEarnedBadges, type PlayerStats } from "@/lib/gamification";

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
