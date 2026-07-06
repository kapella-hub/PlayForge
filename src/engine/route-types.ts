import type { CanvasData } from "./types";

/** Canonical grouped route-type pills (single source of truth for the UI). */
export const ROUTE_TYPE_GROUPS = [
  { label: "Short", routes: ["Flat", "Slant", "Drag"] },
  { label: "Medium", routes: ["In", "Out", "Curl", "Dig"] },
  { label: "Deep", routes: ["Post", "Corner", "Go", "Seam"] },
  { label: "Other", routes: ["Screen", "Block", "Wheel", "Comeback"] },
] as const satisfies readonly { label: string; routes: readonly string[] }[];

/** All canonical route-type names, flattened. */
export const ROUTE_TYPES: readonly string[] = ROUTE_TYPE_GROUPS.flatMap(
  (g) => g.routes,
);

/** Canonical value → display label (identity today; kept for future divergence). */
export const ROUTE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ROUTE_TYPES.map((t) => [t, t]),
);

const CANON_BY_LOWER = new Map(ROUTE_TYPES.map((t) => [t.toLowerCase(), t]));

/**
 * Heal a stored routeType to canonical casing. Case-insensitively matches the
 * canonical set; non-members (e.g. route-library names like "Dig / In") are
 * returned trimmed but otherwise unchanged.
 */
export function normalizeRouteType(raw: string): string {
  const trimmed = raw.trim();
  return CANON_BY_LOWER.get(trimmed.toLowerCase()) ?? trimmed;
}

/** Return a copy of canvas data with every route's routeType normalized. */
export function normalizeCanvasRouteTypes(data: CanvasData): CanvasData {
  return {
    ...data,
    routes: data.routes.map((r) =>
      r.routeType === undefined
        ? r
        : { ...r, routeType: normalizeRouteType(r.routeType) },
    ),
  };
}
