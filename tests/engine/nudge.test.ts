import { describe, it, expect } from "vitest";
import {
  isNewNudgeBurst,
  nudgePlayers,
  NUDGE_BURST_MS,
  NUDGE_STEP,
  NUDGE_STEP_SHIFT,
} from "@/engine/nudge";
import { FIELD } from "@/engine/constants";
import type { CanvasPlayer } from "@/engine/types";

const players: CanvasPlayer[] = [
  { id: "a", label: "A", x: 100, y: 200, side: "offense" },
  { id: "b", label: "B", x: 300, y: 400, side: "offense" },
];

describe("isNewNudgeBurst", () => {
  it("is true only when the gap exceeds the window", () => {
    expect(isNewNudgeBurst(2000, 1000)).toBe(true); // 1000ms gap > 800
    expect(isNewNudgeBurst(1500, 1000)).toBe(false); // 500ms gap
    expect(isNewNudgeBurst(1000 + NUDGE_BURST_MS, 1000)).toBe(false); // exactly 800, not >
    expect(isNewNudgeBurst(Infinity, 0)).toBe(true); // first-ever nudge
  });
});

describe("nudgePlayers", () => {
  it("moves only the target player and returns a new array", () => {
    const out = nudgePlayers(players, "a", 0.5, -0.5);
    expect(out).not.toBe(players);
    expect(out[0]).toEqual({ id: "a", label: "A", x: 100.5, y: 199.5, side: "offense" });
    expect(out[1]).toEqual(players[1]); // untouched
  });

  it("is a no-op copy when the player id is absent", () => {
    const out = nudgePlayers(players, "zzz", 5, 5);
    expect(out).toEqual(players);
  });

  it("clamps x to [0, FIELD.WIDTH]", () => {
    // Nudge left edge past 0
    const leftClamp = nudgePlayers(players, "a", -200, 0);
    expect(leftClamp[0].x).toBe(0);
    expect(leftClamp[0].y).toBe(200);

    // Nudge right edge past FIELD.WIDTH
    const rightClamp = nudgePlayers(players, "a", 950, 0);
    expect(rightClamp[0].x).toBe(FIELD.WIDTH);
    expect(rightClamp[0].y).toBe(200);
  });

  it("clamps y to [0, FIELD.HEIGHT]", () => {
    // Nudge top edge past 0
    const topClamp = nudgePlayers(players, "a", 0, -300);
    expect(topClamp[0].x).toBe(100);
    expect(topClamp[0].y).toBe(0);

    // Nudge bottom edge past FIELD.HEIGHT
    const bottomClamp = nudgePlayers(players, "a", 0, 500);
    expect(bottomClamp[0].x).toBe(100);
    expect(bottomClamp[0].y).toBe(FIELD.HEIGHT);
  });
});

describe("nudge constants", () => {
  it("defines NUDGE_STEP as 0.5", () => {
    expect(NUDGE_STEP).toBe(0.5);
  });

  it("defines NUDGE_STEP_SHIFT as 2", () => {
    expect(NUDGE_STEP_SHIFT).toBe(2);
  });
});
