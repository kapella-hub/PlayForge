import { FIELD } from "./constants";
import type { CanvasPlayer } from "./types";

export interface SnapGuide {
  /** "x" = vertical guide line at x = coord; "y" = horizontal guide line at y = coord */
  axis: "x" | "y";
  coord: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

/** Snap distance in FIELD coordinate units (scale-independent). */
export const SNAP_THRESHOLD = 1.5;

/** Pick the candidate closest to `value` within SNAP_THRESHOLD, or null. */
function nearestWithinThreshold(value: number, candidates: number[]): number | null {
  let best: number | null = null;
  let bestDist = SNAP_THRESHOLD;
  for (const c of candidates) {
    const d = Math.abs(c - value);
    if (d <= bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Given a dragged player's proposed FIELD-space position, return the snapped
 * position plus the active alignment guides. Snap targets: other players' x/y,
 * the field center line (x = FIELD.WIDTH / 2), and the dragged player's own
 * pre-drag y. Alt held disables snapping entirely.
 */
export function computeSnap(
  draggedId: string,
  proposed: { x: number; y: number },
  players: CanvasPlayer[],
  opts: { altHeld: boolean; preDragY: number },
): SnapResult {
  if (opts.altHeld) {
    return { x: proposed.x, y: proposed.y, guides: [] };
  }

  const others = players.filter((p) => p.id !== draggedId);
  const xCandidates = [...others.map((p) => p.x), FIELD.WIDTH / 2];
  const yCandidates = [...others.map((p) => p.y), opts.preDragY];

  const guides: SnapGuide[] = [];

  const snapX = nearestWithinThreshold(proposed.x, xCandidates);
  const x = snapX ?? proposed.x;
  if (snapX !== null) guides.push({ axis: "x", coord: snapX });

  const snapY = nearestWithinThreshold(proposed.y, yCandidates);
  const y = snapY ?? proposed.y;
  if (snapY !== null) guides.push({ axis: "y", coord: snapY });

  return { x, y, guides };
}
