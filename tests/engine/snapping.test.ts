import { describe, it, expect } from "vitest";
import { computeSnap, SNAP_THRESHOLD } from "@/engine/snapping";
import { FIELD } from "@/engine/constants";
import type { CanvasPlayer } from "@/engine/types";

const players: CanvasPlayer[] = [
  { id: "a", label: "A", x: 100, y: 200, side: "offense" }, // the dragged player
  { id: "b", label: "B", x: 300, y: 400, side: "offense" },
];
const opts = { altHeld: false, preDragY: 200 }; // a's pre-drag y

describe("computeSnap", () => {
  it("snaps x to another player's x within threshold", () => {
    const r = computeSnap("a", { x: 300.8, y: 50 }, players, opts);
    expect(r.x).toBe(300);
    expect(r.guides).toContainEqual({ axis: "x", coord: 300 });
  });

  it("snaps y to another player's y within threshold", () => {
    const r = computeSnap("a", { x: 50, y: 399.2 }, players, opts);
    expect(r.y).toBe(400);
    expect(r.guides).toContainEqual({ axis: "y", coord: 400 });
  });

  it("snaps x to the field center line", () => {
    const center = FIELD.WIDTH / 2; // 500
    const r = computeSnap("a", { x: 499, y: 50 }, players, opts);
    expect(r.x).toBe(center);
    expect(r.guides).toContainEqual({ axis: "x", coord: center });
  });

  it("snaps y back to the dragged player's own pre-drag y (horizontal slide)", () => {
    const r = computeSnap("a", { x: 50, y: 200.5 }, players, opts);
    expect(r.y).toBe(200);
    expect(r.guides).toContainEqual({ axis: "y", coord: 200 });
  });

  it("snaps at exactly the threshold but not beyond it", () => {
    const center = FIELD.WIDTH / 2; // 500
    const atEdge = computeSnap("a", { x: center - SNAP_THRESHOLD, y: 50 }, players, opts);
    expect(atEdge.x).toBe(center);
    const justOver = computeSnap("a", { x: center - SNAP_THRESHOLD - 0.01, y: 50 }, players, opts);
    expect(justOver.x).toBeCloseTo(center - SNAP_THRESHOLD - 0.01);
    expect(justOver.guides).toHaveLength(0);
  });

  it("returns the proposed position with no guides when Alt is held", () => {
    const r = computeSnap("a", { x: 300.1, y: 400.1 }, players, { altHeld: true, preDragY: 200 });
    expect(r).toEqual({ x: 300.1, y: 400.1, guides: [] });
  });

  it("never snaps to the dragged player's own current position", () => {
    // proposed is 0.2 from a.x (100) but a is excluded; b.x/center are far away
    const r = computeSnap("a", { x: 100.2, y: 50 }, players, { altHeld: false, preDragY: 999 });
    expect(r.x).toBeCloseTo(100.2);
    expect(r.guides).toHaveLength(0);
  });

  it("returns the proposed position unchanged when nothing is within threshold", () => {
    const r = computeSnap("a", { x: 700, y: 50 }, players, { altHeld: false, preDragY: 999 });
    expect(r).toEqual({ x: 700, y: 50, guides: [] });
  });
});
