import type { RouteWaypoint } from "./types";

export interface RouteTemplate {
  id: string;
  name: string;
  category: "short" | "medium" | "deep" | "screen" | "block";
  description: string;
  /** Waypoints as offsets from player position (dx, dy where negative y = upfield) */
  offsets: { dx: number; dy: number }[];
}

// ── Short Routes (0-5 yards) ───────────────────────────────────────

const shortRoutes: RouteTemplate[] = [
  {
    id: "slant",
    name: "Slant",
    category: "short",
    description: "Quick inside diagonal break at 45 degrees, 5 yards",
    offsets: [
      { dx: 0, dy: -10 },
      { dx: 40, dy: -40 },
    ],
  },
  {
    id: "quick-out",
    name: "Quick Out",
    category: "short",
    description: "3-step drop, sharp break toward the sideline",
    offsets: [
      { dx: 0, dy: -20 },
      { dx: -50, dy: -20 },
    ],
  },
  {
    id: "hitch",
    name: "Hitch",
    category: "short",
    description: "5-yard stem then stop and turn back to QB",
    offsets: [
      { dx: 0, dy: -40 },
      { dx: 0, dy: -30 },
    ],
  },
  {
    id: "flat",
    name: "Flat",
    category: "short",
    description: "Release toward sideline at shallow depth, 2-3 yards",
    offsets: [
      { dx: -60, dy: -10 },
    ],
  },
  {
    id: "drag",
    name: "Drag",
    category: "short",
    description: "Shallow cross underneath at 3-4 yards depth",
    offsets: [
      { dx: 0, dy: -20 },
      { dx: 80, dy: -20 },
    ],
  },
  {
    id: "whip",
    name: "Whip",
    category: "short",
    description: "Outside release, whip back inside at 5 yards",
    offsets: [
      { dx: -20, dy: -30 },
      { dx: 20, dy: -35 },
    ],
  },
  {
    id: "bubble-screen",
    name: "Bubble Screen",
    category: "short",
    description: "Lateral or slight backward route behind the line",
    offsets: [
      { dx: -40, dy: 5 },
    ],
  },
  {
    id: "stick",
    name: "Stick",
    category: "short",
    description: "6-yard hitch settling in soft spot of zone",
    offsets: [
      { dx: 0, dy: -45 },
      { dx: 10, dy: -45 },
    ],
  },
  {
    id: "speed-out",
    name: "Speed Out",
    category: "short",
    description: "Fast outside break at 5 yards, no hesitation",
    offsets: [
      { dx: 0, dy: -35 },
      { dx: -55, dy: -35 },
    ],
  },
  {
    id: "quick-in",
    name: "Quick In",
    category: "short",
    description: "Quick inside break at 5 yards across the middle",
    offsets: [
      { dx: 0, dy: -35 },
      { dx: 50, dy: -35 },
    ],
  },
];

// ── Medium Routes (5-15 yards) ─────────────────────────────────────

const mediumRoutes: RouteTemplate[] = [
  {
    id: "dig",
    name: "Dig / In",
    category: "medium",
    description: "12-15 yard stem then sharp break inside across the field",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: 70, dy: -80 },
    ],
  },
  {
    id: "out",
    name: "Out",
    category: "medium",
    description: "10-12 yard stem then break toward sideline",
    offsets: [
      { dx: 0, dy: -70 },
      { dx: -60, dy: -70 },
    ],
  },
  {
    id: "curl",
    name: "Curl / Comeback",
    category: "medium",
    description: "12-yard stem then turn back toward QB",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: -10, dy: -65 },
    ],
  },
  {
    id: "over",
    name: "Over",
    category: "medium",
    description: "Deep crossing route at 12-15 yards across the field",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: 120, dy: -85 },
    ],
  },
  {
    id: "sail",
    name: "Sail",
    category: "medium",
    description: "Outside release, vertical stem bending toward sideline at 12 yards",
    offsets: [
      { dx: -10, dy: -50 },
      { dx: -40, dy: -90 },
    ],
  },
  {
    id: "china",
    name: "China",
    category: "medium",
    description: "Inside release at 8 yards then break back outside",
    offsets: [
      { dx: 20, dy: -55 },
      { dx: -40, dy: -60 },
    ],
  },
  {
    id: "angle",
    name: "Angle",
    category: "medium",
    description: "RB/TE angle route, outside release then cut upfield at 45 degrees",
    offsets: [
      { dx: -20, dy: -10 },
      { dx: 40, dy: -60 },
    ],
  },
  {
    id: "texas",
    name: "Texas",
    category: "medium",
    description: "RB swings to flat then turns upfield along sideline",
    offsets: [
      { dx: -50, dy: -5 },
      { dx: -60, dy: -70 },
    ],
  },
  {
    id: "wheel-short",
    name: "Wheel (Short)",
    category: "medium",
    description: "RB/Slot swings to flat then wheels upfield, 10-15 yard version",
    offsets: [
      { dx: -40, dy: 0 },
      { dx: -50, dy: -90 },
    ],
  },
  {
    id: "option",
    name: "Option",
    category: "medium",
    description: "Stem to 8 yards, break inside or outside based on coverage read",
    offsets: [
      { dx: 0, dy: -55 },
      { dx: 30, dy: -60 },
    ],
  },
];

// ── Deep Routes (15+ yards) ────────────────────────────────────────

const deepRoutes: RouteTemplate[] = [
  {
    id: "go",
    name: "Go / Fly",
    category: "deep",
    description: "Straight vertical route, maximum depth",
    offsets: [
      { dx: 0, dy: -160 },
    ],
  },
  {
    id: "post",
    name: "Post",
    category: "deep",
    description: "12-yard stem then break inside toward the goalposts",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: 50, dy: -150 },
    ],
  },
  {
    id: "corner",
    name: "Corner",
    category: "deep",
    description: "12-yard stem then break toward the pylon at 45 degrees",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: -60, dy: -150 },
    ],
  },
  {
    id: "post-corner",
    name: "Post-Corner",
    category: "deep",
    description: "Double move: fake post then break to corner",
    offsets: [
      { dx: 0, dy: -70 },
      { dx: 30, dy: -100 },
      { dx: -40, dy: -160 },
    ],
  },
  {
    id: "corner-post",
    name: "Corner-Post",
    category: "deep",
    description: "Double move: fake corner then break to post",
    offsets: [
      { dx: 0, dy: -70 },
      { dx: -30, dy: -100 },
      { dx: 40, dy: -160 },
    ],
  },
  {
    id: "fade",
    name: "Fade",
    category: "deep",
    description: "Outside release, gradual lean toward sideline deep",
    offsets: [
      { dx: -20, dy: -80 },
      { dx: -35, dy: -155 },
    ],
  },
  {
    id: "deep-out",
    name: "Deep Out",
    category: "deep",
    description: "18-yard stem then break to sideline",
    offsets: [
      { dx: 0, dy: -110 },
      { dx: -70, dy: -110 },
    ],
  },
  {
    id: "deep-in",
    name: "Deep In",
    category: "deep",
    description: "18-yard stem then sharp break across the middle",
    offsets: [
      { dx: 0, dy: -110 },
      { dx: 80, dy: -115 },
    ],
  },
  {
    id: "seam",
    name: "Seam",
    category: "deep",
    description: "Vertical route splitting the hash marks, between safeties",
    offsets: [
      { dx: 5, dy: -80 },
      { dx: 10, dy: -160 },
    ],
  },
  {
    id: "skinny-post",
    name: "Skinny Post",
    category: "deep",
    description: "Slight inside lean on a vertical stem, narrow post angle",
    offsets: [
      { dx: 0, dy: -80 },
      { dx: 20, dy: -155 },
    ],
  },
];

// ── Screen & Block Routes ──────────────────────────────────────────

const screenBlockRoutes: RouteTemplate[] = [
  {
    id: "rb-screen",
    name: "RB Screen",
    category: "screen",
    description: "RB delays behind the line, catches screen pass",
    offsets: [
      { dx: -30, dy: 15 },
      { dx: -60, dy: 10 },
    ],
  },
  {
    id: "wr-screen",
    name: "WR Screen",
    category: "screen",
    description: "WR takes quick lateral or backward pass behind blockers",
    offsets: [
      { dx: -30, dy: 5 },
    ],
  },
  {
    id: "tunnel-screen",
    name: "Tunnel Screen",
    category: "screen",
    description: "Inside WR catches behind pulling OL in the tunnel",
    offsets: [
      { dx: 30, dy: 5 },
      { dx: 50, dy: 0 },
    ],
  },
  {
    id: "pass-pro",
    name: "Pass Protection",
    category: "block",
    description: "Set up in pass protection, block assigned defender",
    offsets: [
      { dx: 0, dy: -5 },
    ],
  },
  {
    id: "pull-block",
    name: "Pull Block",
    category: "block",
    description: "Pull across formation and lead block at the point of attack",
    offsets: [
      { dx: 0, dy: 10 },
      { dx: -80, dy: -10 },
    ],
  },
  {
    id: "drive-block",
    name: "Drive Block",
    category: "block",
    description: "Fire off the line and drive defender backward",
    offsets: [
      { dx: 0, dy: -15 },
    ],
  },
  {
    id: "kick-out",
    name: "Kick-Out Block",
    category: "block",
    description: "Block the edge defender outward to open the hole",
    offsets: [
      { dx: -40, dy: -20 },
    ],
  },
  {
    id: "chip-release",
    name: "Chip & Release",
    category: "block",
    description: "Chip the edge rusher then release into a route",
    offsets: [
      { dx: -10, dy: -10 },
      { dx: -20, dy: -80 },
    ],
  },
  {
    id: "lead-block",
    name: "Lead Block",
    category: "block",
    description: "Lead through the hole and block first defender in the gap",
    offsets: [
      { dx: 0, dy: -10 },
      { dx: -20, dy: -40 },
    ],
  },
  {
    id: "zone-block",
    name: "Zone Block",
    category: "block",
    description: "Step playside and block zone assignment, combo to LB",
    offsets: [
      { dx: -15, dy: -10 },
    ],
  },
];

// ── Combined library and helpers ───────────────────────────────────

export const ROUTE_LIBRARY: RouteTemplate[] = [
  ...shortRoutes,
  ...mediumRoutes,
  ...deepRoutes,
  ...screenBlockRoutes,
];

/**
 * Convert a route template's relative offsets to absolute waypoints
 * given a player's starting position on the canvas.
 */
export function applyRouteTemplate(
  playerX: number,
  playerY: number,
  template: RouteTemplate,
): RouteWaypoint[] {
  return template.offsets.map((o) => ({
    x: playerX + o.dx,
    y: playerY + o.dy,
  }));
}

/** Get all routes in a given category */
export function getRoutesByCategory(
  category: RouteTemplate["category"],
): RouteTemplate[] {
  return ROUTE_LIBRARY.filter((r) => r.category === category);
}

/** Find a single route template by id */
export function getRouteById(id: string): RouteTemplate | undefined {
  return ROUTE_LIBRARY.find((r) => r.id === id);
}
