import type { CanvasData, AnimationData } from "./types";

export function createEmptyCanvasData(): CanvasData {
  return {
    players: [],
    routes: [],
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
