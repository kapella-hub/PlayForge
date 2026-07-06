import type { CanvasPlayer } from "./types";
import { FIELD } from "./constants";

/** FIELD units moved per arrow press / Shift+arrow press. */
export const NUDGE_STEP = 0.5;
export const NUDGE_STEP_SHIFT = 2;

/** A gap larger than this (ms) between nudges begins a new undo entry. */
export const NUDGE_BURST_MS = 800;

/** True when `now` is more than `gapMs` after the previous nudge. */
export function isNewNudgeBurst(
  now: number,
  lastNudgeAt: number,
  gapMs: number = NUDGE_BURST_MS,
): boolean {
  return now - lastNudgeAt > gapMs;
}

/** Return a new players array with `playerId` moved by (dx, dy) in FIELD units, clamped to field bounds. */
export function nudgePlayers(
  players: CanvasPlayer[],
  playerId: string,
  dx: number,
  dy: number,
): CanvasPlayer[] {
  return players.map((p) =>
    p.id === playerId
      ? {
          ...p,
          x: Math.max(0, Math.min(p.x + dx, FIELD.WIDTH)),
          y: Math.max(0, Math.min(p.y + dy, FIELD.HEIGHT)),
        }
      : p,
  );
}
