import type { FormationTemplate } from "./types";

export const FIELD = {
  WIDTH: 1000,
  HEIGHT: 600,
  PADDING: 50,
  YARD_LINE_SPACING: 30,
  LINE_OF_SCRIMMAGE_Y: 350,
  PLAYER_RADIUS: 16,
  COLORS: {
    FIELD: "#2d5a27",
    FIELD_LIGHT: "#367a2e",
    FIELD_DARK: "#1e4a1a",
    LINES: "#ffffff",
    OFFENSE: "#3b82f6",
    OFFENSE_LIGHT: "#60a5fa",
    OFFENSE_DARK: "#1d4ed8",
    OFFENSE_OL: "#2563eb",
    DEFENSE: "#ef4444",
    DEFENSE_LIGHT: "#f87171",
    DEFENSE_DARK: "#b91c1c",
    SELECTED: "#f59e0b",
    SELECTED_GLOW: "#fbbf24",
    LOS: "#f59e0b",
    LOS_GLOW: "rgba(245,158,11,0.35)",
    ROUTE: "#60a5fa",
    ROUTE_GLOW: "rgba(96,165,250,0.3)",
    ROUTE_DASHED: "#94a3b8",
    ROUTE_BLOCK: "#f97316",
    ROUTE_OFFENSE: "#93c5fd",
    ROUTE_DEFENSE: "#fca5a5",
    ENDZONE: "#1a4a1a",
    ENDZONE_ACCENT: "#0f3a0f",
    ENDZONE_TEXT: "rgba(255,255,255,0.15)",
    VIGNETTE: "rgba(0,0,0,0.25)",
    GRASS_STRIPE: "rgba(255,255,255,0.025)",
    WAYPOINT: "rgba(255,255,255,0.6)",
    PREVIEW_LINE: "rgba(255,255,255,0.5)",
  },
  /** NFL hash marks at 1/3 width from each sideline */
  HASH_LEFT_RATIO: 0.373,
  HASH_RIGHT_RATIO: 0.627,
} as const;

/** Thresholds for auto-detecting route type from waypoints */
export const ROUTE_DETECTION = {
  /** Minimum vertical distance (yards in canvas units) to count as "deep" */
  DEEP_THRESHOLD: 60,
  /** Angle tolerance in degrees for slant / post / corner classification */
  ANGLE_TOLERANCE: 20,
  /** Minimum horizontal movement to count as an "out" or "in" */
  HORIZONTAL_THRESHOLD: 40,
  /** Max vertical distance for a "flat" route */
  FLAT_MAX_DEPTH: 30,
  /** Shallow cross max depth */
  DRAG_MAX_DEPTH: 50,
} as const;

const LOS = FIELD.LINE_OF_SCRIMMAGE_Y;

export const FORMATIONS: FormationTemplate[] = [
  // ── Offense ──────────────────────────────────────────
  {
    id: "shotgun-2x2",
    name: "Shotgun 2x2",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 70, side: "offense" },
      { id: "rb", label: "RB", x: 500, y: LOS + 110, side: "offense" },
      { id: "wr1", label: "X", x: 150, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 850, y: LOS, side: "offense" },
      { id: "slot1", label: "H", x: 320, y: LOS, side: "offense" },
      { id: "slot2", label: "Y", x: 680, y: LOS, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
    ],
  },
  {
    id: "i-form",
    name: "I-Formation",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 30, side: "offense" },
      { id: "fb", label: "FB", x: 500, y: LOS + 70, side: "offense" },
      { id: "rb", label: "RB", x: 500, y: LOS + 110, side: "offense" },
      { id: "wr1", label: "X", x: 150, y: LOS, side: "offense" },
      { id: "te", label: "TE", x: 640, y: LOS, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 850, y: LOS, side: "offense" },
    ],
  },
  {
    id: "singleback",
    name: "Singleback",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 30, side: "offense" },
      { id: "rb", label: "RB", x: 500, y: LOS + 70, side: "offense" },
      { id: "wr1", label: "X", x: 150, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 850, y: LOS, side: "offense" },
      { id: "te", label: "TE", x: 640, y: LOS, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
      { id: "slot1", label: "H", x: 320, y: LOS, side: "offense" },
    ],
  },
  {
    id: "pistol",
    name: "Pistol",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 50, side: "offense" },
      { id: "rb", label: "RB", x: 500, y: LOS + 90, side: "offense" },
      { id: "wr1", label: "X", x: 150, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 850, y: LOS, side: "offense" },
      { id: "slot1", label: "H", x: 320, y: LOS, side: "offense" },
      { id: "te", label: "TE", x: 640, y: LOS, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
    ],
  },
  {
    id: "empty",
    name: "Empty",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 70, side: "offense" },
      { id: "wr1", label: "X", x: 100, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 900, y: LOS, side: "offense" },
      { id: "slot1", label: "H", x: 280, y: LOS, side: "offense" },
      { id: "slot2", label: "Y", x: 720, y: LOS, side: "offense" },
      { id: "slot3", label: "A", x: 680, y: LOS + 10, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
    ],
  },
  {
    id: "shotgun-trips",
    name: "Shotgun Trips",
    side: "offense",
    players: [
      { id: "qb", label: "QB", x: 500, y: LOS + 70, side: "offense" },
      { id: "rb", label: "RB", x: 430, y: LOS + 70, side: "offense" },
      { id: "wr1", label: "X", x: 150, y: LOS, side: "offense" },
      { id: "wr2", label: "Z", x: 850, y: LOS, side: "offense" },
      { id: "slot1", label: "H", x: 750, y: LOS, side: "offense" },
      { id: "slot2", label: "Y", x: 700, y: LOS + 10, side: "offense" },
      { id: "lt", label: "LT", x: 400, y: LOS, side: "offense" },
      { id: "lg", label: "LG", x: 440, y: LOS, side: "offense" },
      { id: "c", label: "C", x: 500, y: LOS, side: "offense" },
      { id: "rg", label: "RG", x: 560, y: LOS, side: "offense" },
      { id: "rt", label: "RT", x: 600, y: LOS, side: "offense" },
    ],
  },

  // ── Defense ──────────────────────────────────────────
  {
    id: "4-3",
    name: "4-3 Defense",
    side: "defense",
    players: [
      { id: "de1", label: "DE", x: 380, y: LOS - 20, side: "defense" },
      { id: "dt1", label: "DT", x: 460, y: LOS - 20, side: "defense" },
      { id: "dt2", label: "DT", x: 540, y: LOS - 20, side: "defense" },
      { id: "de2", label: "DE", x: 620, y: LOS - 20, side: "defense" },
      { id: "wlb", label: "WLB", x: 350, y: LOS - 60, side: "defense" },
      { id: "mlb", label: "MLB", x: 500, y: LOS - 60, side: "defense" },
      { id: "slb", label: "SLB", x: 650, y: LOS - 60, side: "defense" },
      { id: "cb1", label: "CB", x: 150, y: LOS - 40, side: "defense" },
      { id: "cb2", label: "CB", x: 850, y: LOS - 40, side: "defense" },
      { id: "fs", label: "FS", x: 500, y: LOS - 130, side: "defense" },
      { id: "ss", label: "SS", x: 650, y: LOS - 100, side: "defense" },
    ],
  },
  {
    id: "3-4",
    name: "3-4 Defense",
    side: "defense",
    players: [
      { id: "de1", label: "DE", x: 400, y: LOS - 20, side: "defense" },
      { id: "nt", label: "NT", x: 500, y: LOS - 20, side: "defense" },
      { id: "de2", label: "DE", x: 600, y: LOS - 20, side: "defense" },
      { id: "olb1", label: "OLB", x: 330, y: LOS - 40, side: "defense" },
      { id: "ilb1", label: "ILB", x: 460, y: LOS - 60, side: "defense" },
      { id: "ilb2", label: "ILB", x: 540, y: LOS - 60, side: "defense" },
      { id: "olb2", label: "OLB", x: 670, y: LOS - 40, side: "defense" },
      { id: "cb1", label: "CB", x: 150, y: LOS - 40, side: "defense" },
      { id: "cb2", label: "CB", x: 850, y: LOS - 40, side: "defense" },
      { id: "fs", label: "FS", x: 500, y: LOS - 130, side: "defense" },
      { id: "ss", label: "SS", x: 650, y: LOS - 100, side: "defense" },
    ],
  },
  {
    id: "nickel",
    name: "Nickel Defense",
    side: "defense",
    players: [
      { id: "de1", label: "DE", x: 380, y: LOS - 20, side: "defense" },
      { id: "dt1", label: "DT", x: 470, y: LOS - 20, side: "defense" },
      { id: "dt2", label: "DT", x: 530, y: LOS - 20, side: "defense" },
      { id: "de2", label: "DE", x: 620, y: LOS - 20, side: "defense" },
      { id: "mlb1", label: "MLB", x: 450, y: LOS - 60, side: "defense" },
      { id: "mlb2", label: "MLB", x: 550, y: LOS - 60, side: "defense" },
      { id: "cb1", label: "CB", x: 150, y: LOS - 40, side: "defense" },
      { id: "cb2", label: "CB", x: 850, y: LOS - 40, side: "defense" },
      { id: "ncb", label: "NCB", x: 320, y: LOS - 50, side: "defense" },
      { id: "fs", label: "FS", x: 500, y: LOS - 130, side: "defense" },
      { id: "ss", label: "SS", x: 650, y: LOS - 100, side: "defense" },
    ],
  },
  {
    id: "dime",
    name: "Dime Defense",
    side: "defense",
    players: [
      { id: "de1", label: "DE", x: 400, y: LOS - 20, side: "defense" },
      { id: "dt1", label: "DT", x: 480, y: LOS - 20, side: "defense" },
      { id: "dt2", label: "DT", x: 520, y: LOS - 20, side: "defense" },
      { id: "de2", label: "DE", x: 600, y: LOS - 20, side: "defense" },
      { id: "mlb", label: "MLB", x: 500, y: LOS - 60, side: "defense" },
      { id: "cb1", label: "CB", x: 150, y: LOS - 40, side: "defense" },
      { id: "cb2", label: "CB", x: 850, y: LOS - 40, side: "defense" },
      { id: "ncb1", label: "NCB", x: 300, y: LOS - 50, side: "defense" },
      { id: "ncb2", label: "NCB", x: 700, y: LOS - 50, side: "defense" },
      { id: "fs", label: "FS", x: 500, y: LOS - 130, side: "defense" },
      { id: "ss", label: "SS", x: 650, y: LOS - 100, side: "defense" },
    ],
  },
];

export function getFormationById(
  id: string,
): FormationTemplate | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function getFormationsBySide(
  side: "offense" | "defense",
): FormationTemplate[] {
  return FORMATIONS.filter((f) => f.side === side);
}

/** OL position labels for visual grouping */
const OL_LABELS = new Set(["LT", "LG", "C", "RG", "RT"]);

/** Returns true if a player label indicates an offensive lineman */
export function isOL(label: string): boolean {
  return OL_LABELS.has(label);
}

/**
 * Auto-detect a route name from its waypoint shape.
 * Returns a human-readable route name like "Go", "Slant", "Post", etc.
 */
export function detectRouteType(
  waypoints: { x: number; y: number }[],
): string {
  if (waypoints.length < 2) return "Unknown";

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y; // negative = upfield (toward top)
  const verticalDepth = -dy; // positive = going upfield
  const absHoriz = Math.abs(dx);
  const fieldCenter = FIELD.WIDTH / 2;

  // Flat: very short and mostly horizontal
  if (verticalDepth < ROUTE_DETECTION.FLAT_MAX_DEPTH && absHoriz > 20) {
    return "Flat";
  }

  // Drag: shallow cross
  if (
    verticalDepth < ROUTE_DETECTION.DRAG_MAX_DEPTH &&
    absHoriz > ROUTE_DETECTION.HORIZONTAL_THRESHOLD
  ) {
    return "Drag";
  }

  // Check for multi-segment routes (3+ waypoints) for break routes
  if (waypoints.length >= 3) {
    const mid = waypoints[Math.floor(waypoints.length / 2)];
    const firstLegDy = -(mid.y - start.y);
    const secondLegDx = end.x - mid.x;
    const secondLegDy = -(end.y - mid.y);

    // Curl/Comeback: goes deep then comes back
    if (firstLegDy > ROUTE_DETECTION.DEEP_THRESHOLD && secondLegDy < -10) {
      return "Curl";
    }

    // Post: goes deep then cuts inside
    if (firstLegDy > ROUTE_DETECTION.DEEP_THRESHOLD) {
      const cutsInside =
        start.x < fieldCenter ? secondLegDx > 20 : secondLegDx < -20;
      if (cutsInside) return "Post";
    }

    // Corner: goes deep then cuts outside
    if (firstLegDy > ROUTE_DETECTION.DEEP_THRESHOLD) {
      const cutsOutside =
        start.x < fieldCenter ? secondLegDx < -20 : secondLegDx > 20;
      if (cutsOutside) return "Corner";
    }

    // In/Dig: goes medium then cuts inside
    if (firstLegDy > 30 && Math.abs(secondLegDx) > ROUTE_DETECTION.HORIZONTAL_THRESHOLD) {
      const cutsIn =
        start.x < fieldCenter ? secondLegDx > 0 : secondLegDx < 0;
      if (cutsIn) return "Dig";
    }

    // Out: goes medium then cuts outside
    if (firstLegDy > 30 && Math.abs(secondLegDx) > ROUTE_DETECTION.HORIZONTAL_THRESHOLD) {
      const cutsOut =
        start.x < fieldCenter ? secondLegDx < 0 : secondLegDx > 0;
      if (cutsOut) return "Out";
    }
  }

  // Simple two-point routes
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI); // 90 = straight up

  // Go/Fly: nearly vertical deep
  if (verticalDepth > ROUTE_DETECTION.DEEP_THRESHOLD && absHoriz < 30) {
    return "Go";
  }

  // Slant: ~45 degree angle, moderate depth
  if (angle > 30 && angle < 70) return "Slant";
  if (angle > 110 && angle < 150) return "Slant";

  // Default deep
  if (verticalDepth > ROUTE_DETECTION.DEEP_THRESHOLD) return "Go";

  return "Route";
}
