import type { CanvasData } from "./types";
import { FIELD } from "./constants";

export function mirrorPlay(canvasData: CanvasData): CanvasData {
  const centerX = FIELD.WIDTH / 2;

  return {
    ...canvasData,
    players: canvasData.players.map((p) => ({
      ...p,
      x: centerX + (centerX - p.x),
    })),
    routes: canvasData.routes.map((r) => ({
      ...r,
      waypoints: r.waypoints.map((wp) => ({
        ...wp,
        x: centerX + (centerX - wp.x),
      })),
    })),
    motions: canvasData.motions.map((m) => ({
      ...m,
      fromX: centerX + (centerX - m.fromX),
      toX: centerX + (centerX - m.toX),
    })),
  };
}
