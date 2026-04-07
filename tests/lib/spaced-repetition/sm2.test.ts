import { describe, it, expect } from "vitest";
import { calculateNextReview, qualityFromScore, masteryFromInterval } from "@/lib/spaced-repetition/sm2";

describe("qualityFromScore", () => {
  it("maps 0-59% to quality 0-2", () => {
    expect(qualityFromScore(0)).toBe(0);
    expect(qualityFromScore(0.3)).toBe(1);
    expect(qualityFromScore(0.59)).toBe(2);
  });
  it("maps 60-79% to quality 3", () => {
    expect(qualityFromScore(0.6)).toBe(3);
    expect(qualityFromScore(0.79)).toBe(3);
  });
  it("maps 80-94% to quality 4", () => {
    expect(qualityFromScore(0.8)).toBe(4);
    expect(qualityFromScore(0.94)).toBe(4);
  });
  it("maps 95-100% to quality 5", () => {
    expect(qualityFromScore(0.95)).toBe(5);
    expect(qualityFromScore(1.0)).toBe(5);
  });
});

describe("calculateNextReview", () => {
  it("returns 1-day interval on first review", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 0, repetition: 0 }, 4);
    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(1);
  });
  it("returns 3-day interval on second review", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 1, repetition: 1 }, 4);
    expect(result.intervalDays).toBe(3);
    expect(result.repetition).toBe(2);
  });
  it("multiplies interval by ease factor on subsequent reviews", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 3, repetition: 2 }, 4);
    expect(result.intervalDays).toBeCloseTo(7.5);
  });
  it("resets to 1 day on quality < 3", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 10, repetition: 5 }, 2);
    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(0);
  });
  it("never lets ease factor drop below 1.3", () => {
    let state = { easeFactor: 1.5, intervalDays: 1, repetition: 1 };
    for (let i = 0; i < 10; i++) { state = calculateNextReview(state, 0); }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("masteryFromInterval", () => {
  it("returns 'new_play' for interval 0", () => { expect(masteryFromInterval(0)).toBe("new_play"); });
  it("returns 'learning' for interval < 3", () => {
    expect(masteryFromInterval(1)).toBe("learning");
    expect(masteryFromInterval(2.9)).toBe("learning");
  });
  it("returns 'reviewing' for interval 3-21", () => {
    expect(masteryFromInterval(3)).toBe("reviewing");
    expect(masteryFromInterval(21)).toBe("reviewing");
  });
  it("returns 'mastered' for interval > 21", () => { expect(masteryFromInterval(22)).toBe("mastered"); });
});
