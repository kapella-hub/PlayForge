import type { CanvasData, AnimationData } from "./types";
import { normalizeCanvasRouteTypes } from "./route-types";

export function createEmptyCanvasData(): CanvasData {
  return {
    players: [],
    routes: [],
    motions: [],
    meta: { formation: "", playType: "", side: "offense" },
  };
}

export function createEmptyAnimationData(): AnimationData {
  return {
    keyframes: [],
    duration: 3,
  };
}

export function serializeCanvas(data: CanvasData): string {
  return JSON.stringify(data);
}

export function deserializeCanvas(json: unknown): CanvasData {
  if (json == null) return createEmptyCanvasData();

  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.routes) ||
      typeof parsed.meta !== "object" ||
      parsed.meta === null
    ) {
      return createEmptyCanvasData();
    }

    // Backward compat: add motions array if missing
    if (!Array.isArray(parsed.motions)) {
      parsed.motions = [];
    }

    return parsed as CanvasData;
  } catch {
    return createEmptyCanvasData();
  }
}

export function serializeAnimation(data: AnimationData): string {
  return JSON.stringify(data);
}

export function deserializeAnimation(json: unknown): AnimationData {
  if (json == null) return createEmptyAnimationData();

  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray(parsed.keyframes) ||
      typeof parsed.duration !== "number"
    ) {
      return createEmptyAnimationData();
    }

    return parsed as AnimationData;
  } catch {
    return createEmptyAnimationData();
  }
}

/**
 * Apply a version-history restore: the CURRENT canvas becomes the undo
 * snapshot (so one undo returns to pre-restore work), and the incoming
 * serialized version is deserialized + route-type-healed for display.
 * Fixes the shadowed-parameter bug where the incoming version was pushed
 * to history instead of the current canvas.
 */
export function applyVersionRestore(
  current: CanvasData,
  incoming: unknown,
): { historyEntry: CanvasData; nextCanvas: CanvasData } {
  return {
    historyEntry: current,
    nextCanvas: normalizeCanvasRouteTypes(deserializeCanvas(incoming)),
  };
}
