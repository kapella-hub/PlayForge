import { describe, it, expect } from "vitest";
import { computeStreak } from "@/lib/streak";

function daysAgo(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

describe("computeStreak", () => {
  // Fixed "today" so active-today / active-yesterday logic is deterministic.
  const now = new Date(2026, 6, 2); // 2026-07-02 local midnight

  it("returns zeros for no view history", () => {
    expect(computeStreak([], now)).toEqual({
      current: 0,
      longest: 0,
      daysActive: 0,
    });
    expect(computeStreak([{ lastViewedAt: null }], now)).toEqual({
      current: 0,
      longest: 0,
      daysActive: 0,
    });
  });

  it("counts a single active-today day as a 1-day current streak", () => {
    const result = computeStreak([{ lastViewedAt: now }], now);
    expect(result.current).toBe(1);
    expect(result.daysActive).toBe(1);
  });

  it("keeps the streak current when last activity was yesterday", () => {
    const result = computeStreak([{ lastViewedAt: daysAgo(now, 1) }], now);
    expect(result.current).toBe(1);
  });

  it("breaks the current streak when the last activity is older than yesterday", () => {
    const result = computeStreak([{ lastViewedAt: daysAgo(now, 3) }], now);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
    expect(result.daysActive).toBe(1);
  });

  it("counts consecutive days as a growing current streak", () => {
    const result = computeStreak(
      [
        { lastViewedAt: now },
        { lastViewedAt: daysAgo(now, 1) },
        { lastViewedAt: daysAgo(now, 2) },
      ],
      now,
    );
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.daysActive).toBe(3);
  });

  it("deduplicates multiple views on the same day", () => {
    const result = computeStreak(
      [{ lastViewedAt: now }, { lastViewedAt: now }],
      now,
    );
    expect(result.daysActive).toBe(1);
    expect(result.current).toBe(1);
  });
});
