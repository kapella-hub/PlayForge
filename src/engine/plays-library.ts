export interface PlayTemplate {
  id: string;
  name: string;
  formation: string;
  playType: "run" | "pass" | "play_action" | "screen" | "special";
  category: string;
  description: string;
  routes: {
    playerId: string;
    routeId: string;
    lineType?: "solid" | "dashed" | "thick";
  }[];
}

// ── Quick Game ─────────────────────────────────────────────────────

const quickGame: PlayTemplate[] = [
  {
    id: "qg-slant-flat",
    name: "Slant-Flat",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "quick-game",
    description:
      "High-low read: X runs a slant, H runs a flat. Quick 3-step concept.",
    routes: [
      { playerId: "wr1", routeId: "slant", lineType: "solid" },
      { playerId: "slot1", routeId: "flat", lineType: "solid" },
      { playerId: "wr2", routeId: "hitch", lineType: "dashed" },
      { playerId: "slot2", routeId: "drag", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "qg-hitch-seam",
    name: "Hitch-Seam",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "quick-game",
    description:
      "Outside hitch opens the seam window. Quick read progression.",
    routes: [
      { playerId: "wr1", routeId: "hitch", lineType: "solid" },
      { playerId: "slot1", routeId: "seam", lineType: "solid" },
      { playerId: "wr2", routeId: "hitch", lineType: "dashed" },
      { playerId: "slot2", routeId: "seam", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "qg-quick-out",
    name: "Quick Out",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "quick-game",
    description:
      "X runs quick out, slot runs a slant underneath for pick action.",
    routes: [
      { playerId: "wr1", routeId: "quick-out", lineType: "solid" },
      { playerId: "slot1", routeId: "slant", lineType: "solid" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "slot2", routeId: "stick", lineType: "dashed" },
      { playerId: "rb", routeId: "flat", lineType: "dashed" },
    ],
  },
  {
    id: "qg-mesh",
    name: "Mesh Concept",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "quick-game",
    description:
      "Two shallow crossing routes (drags) create traffic for man beaters.",
    routes: [
      { playerId: "slot1", routeId: "drag", lineType: "solid" },
      { playerId: "slot2", routeId: "drag", lineType: "solid" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "rb", routeId: "angle", lineType: "dashed" },
    ],
  },
  {
    id: "qg-stick",
    name: "Stick Concept",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "quick-game",
    description:
      "Triangle read: flat, stick at 6 yards, and vertical clear-out.",
    routes: [
      { playerId: "slot1", routeId: "stick", lineType: "solid" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "slot2", routeId: "flat", lineType: "solid" },
      { playerId: "wr2", routeId: "hitch", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
];

// ── Play Action ────────────────────────────────────────────────────

const playAction: PlayTemplate[] = [
  {
    id: "pa-bootleg",
    name: "PA Bootleg",
    formation: "singleback",
    playType: "play_action",
    category: "play-action",
    description:
      "Fake inside zone, QB boots opposite with TE on a drag and WR on a corner.",
    routes: [
      { playerId: "te", routeId: "drag", lineType: "solid" },
      { playerId: "wr1", routeId: "corner", lineType: "solid" },
      { playerId: "wr2", routeId: "post", lineType: "dashed" },
      { playerId: "slot1", routeId: "flat", lineType: "solid" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "pa-deep-cross",
    name: "PA Deep Cross",
    formation: "singleback",
    playType: "play_action",
    category: "play-action",
    description:
      "Play fake to RB, TE runs deep crosser with post and go routes clearing out.",
    routes: [
      { playerId: "te", routeId: "over", lineType: "solid" },
      { playerId: "wr1", routeId: "post", lineType: "solid" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "slot1", routeId: "dig", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "pa-shot",
    name: "PA Shot",
    formation: "i-form",
    playType: "play_action",
    category: "play-action",
    description:
      "Heavy play action from I-Form, go route to X with post from Z.",
    routes: [
      { playerId: "wr1", routeId: "go", lineType: "solid" },
      { playerId: "wr2", routeId: "post", lineType: "solid" },
      { playerId: "te", routeId: "chip-release", lineType: "dashed" },
      { playerId: "fb", routeId: "pass-pro", lineType: "thick" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "pa-power",
    name: "PA Power",
    formation: "i-form",
    playType: "play_action",
    category: "play-action",
    description:
      "Fake power run, TE leaks out on a seam route behind linebackers.",
    routes: [
      { playerId: "te", routeId: "seam", lineType: "solid" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "wr2", routeId: "curl", lineType: "dashed" },
      { playerId: "fb", routeId: "lead-block", lineType: "thick" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
];

// ── Deep Shots ─────────────────────────────────────────────────────

const deepShots: PlayTemplate[] = [
  {
    id: "ds-four-verts",
    name: "Four Verticals",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "deep-shots",
    description:
      "All four receivers run go/seam routes, stretching the safeties.",
    routes: [
      { playerId: "wr1", routeId: "go", lineType: "solid" },
      { playerId: "wr2", routeId: "go", lineType: "solid" },
      { playerId: "slot1", routeId: "seam", lineType: "solid" },
      { playerId: "slot2", routeId: "seam", lineType: "solid" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "ds-smash",
    name: "Smash Concept",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "deep-shots",
    description:
      "High-low: hitch underneath with a corner route over top. Classic Cover 2 beater.",
    routes: [
      { playerId: "slot1", routeId: "hitch", lineType: "solid" },
      { playerId: "wr1", routeId: "corner", lineType: "solid" },
      { playerId: "slot2", routeId: "hitch", lineType: "dashed" },
      { playerId: "wr2", routeId: "corner", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "ds-post-wheel",
    name: "Post-Wheel",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "deep-shots",
    description:
      "Inside receiver runs post to pull safety, outside runs wheel for big play.",
    routes: [
      { playerId: "slot1", routeId: "post", lineType: "solid" },
      { playerId: "wr1", routeId: "wheel-short", lineType: "solid" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "slot2", routeId: "dig", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "ds-double-move",
    name: "Double Move",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "deep-shots",
    description:
      "Post-corner double move to X, vertical clear-outs from other receivers.",
    routes: [
      { playerId: "wr1", routeId: "post-corner", lineType: "solid" },
      { playerId: "slot1", routeId: "go", lineType: "dashed" },
      { playerId: "wr2", routeId: "corner-post", lineType: "solid" },
      { playerId: "slot2", routeId: "go", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
];

// ── Run Game ───────────────────────────────────────────────────────

const runGame: PlayTemplate[] = [
  {
    id: "run-iz",
    name: "Inside Zone",
    formation: "singleback",
    playType: "run",
    category: "run-game",
    description:
      "Zone blocking scheme, RB reads the A-B gap and cuts backside.",
    routes: [
      { playerId: "rb", routeId: "drive-block", lineType: "thick" },
      { playerId: "te", routeId: "zone-block", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
      { playerId: "slot1", routeId: "drive-block", lineType: "dashed" },
    ],
  },
  {
    id: "run-oz",
    name: "Outside Zone",
    formation: "singleback",
    playType: "run",
    category: "run-game",
    description:
      "Stretch play to the outside, OL reach-blocks playside.",
    routes: [
      { playerId: "rb", routeId: "zone-block", lineType: "thick" },
      { playerId: "te", routeId: "kick-out", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
      { playerId: "slot1", routeId: "drive-block", lineType: "dashed" },
    ],
  },
  {
    id: "run-power",
    name: "Power",
    formation: "i-form",
    playType: "run",
    category: "run-game",
    description:
      "FB kicks out the end man, pulling guard leads through the hole.",
    routes: [
      { playerId: "rb", routeId: "drive-block", lineType: "thick" },
      { playerId: "fb", routeId: "kick-out", lineType: "thick" },
      { playerId: "te", routeId: "drive-block", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
    ],
  },
  {
    id: "run-counter",
    name: "Counter",
    formation: "i-form",
    playType: "run",
    category: "run-game",
    description:
      "RB takes a counter step, pulling guard and FB lead the way opposite direction.",
    routes: [
      { playerId: "rb", routeId: "pull-block", lineType: "thick" },
      { playerId: "fb", routeId: "lead-block", lineType: "thick" },
      { playerId: "te", routeId: "drive-block", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
    ],
  },
  {
    id: "run-hb-dive",
    name: "HB Dive",
    formation: "i-form",
    playType: "run",
    category: "run-game",
    description:
      "Quick-hitting A-gap dive, FB leads into the hole.",
    routes: [
      { playerId: "rb", routeId: "drive-block", lineType: "thick" },
      { playerId: "fb", routeId: "lead-block", lineType: "thick" },
      { playerId: "te", routeId: "drive-block", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
    ],
  },
];

// ── Screens ────────────────────────────────────────────────────────

const screens: PlayTemplate[] = [
  {
    id: "scr-rb",
    name: "RB Screen",
    formation: "shotgun-2x2",
    playType: "screen",
    category: "screens",
    description:
      "Linemen release, RB catches behind a wall of blockers.",
    routes: [
      { playerId: "rb", routeId: "rb-screen", lineType: "solid" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "slot1", routeId: "drive-block", lineType: "thick" },
      { playerId: "slot2", routeId: "drive-block", lineType: "thick" },
    ],
  },
  {
    id: "scr-bubble",
    name: "Bubble Screen",
    formation: "shotgun-trips",
    playType: "screen",
    category: "screens",
    description:
      "Quick bubble to the trips side with blockers out in front.",
    routes: [
      { playerId: "slot2", routeId: "bubble-screen", lineType: "solid" },
      { playerId: "wr2", routeId: "drive-block", lineType: "thick" },
      { playerId: "slot1", routeId: "drive-block", lineType: "thick" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "scr-tunnel",
    name: "Tunnel Screen",
    formation: "shotgun-2x2",
    playType: "screen",
    category: "screens",
    description:
      "Inside slot catches behind pulling linemen in the tunnel.",
    routes: [
      { playerId: "slot1", routeId: "tunnel-screen", lineType: "solid" },
      { playerId: "wr1", routeId: "go", lineType: "dashed" },
      { playerId: "wr2", routeId: "go", lineType: "dashed" },
      { playerId: "slot2", routeId: "drive-block", lineType: "thick" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
];

// ── Red Zone ───────────────────────────────────────────────────────

const redZone: PlayTemplate[] = [
  {
    id: "rz-fade",
    name: "Fade",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "red-zone",
    description:
      "Back-shoulder fade to the boundary WR in the end zone.",
    routes: [
      { playerId: "wr1", routeId: "fade", lineType: "solid" },
      { playerId: "slot1", routeId: "slant", lineType: "solid" },
      { playerId: "wr2", routeId: "fade", lineType: "dashed" },
      { playerId: "slot2", routeId: "flat", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "rz-goal-line-power",
    name: "Goal Line Power",
    formation: "i-form",
    playType: "run",
    category: "red-zone",
    description:
      "Heavy formation power run, FB kicks out, RB follows the guard.",
    routes: [
      { playerId: "rb", routeId: "drive-block", lineType: "thick" },
      { playerId: "fb", routeId: "kick-out", lineType: "thick" },
      { playerId: "te", routeId: "drive-block", lineType: "thick" },
      { playerId: "wr1", routeId: "drive-block", lineType: "dashed" },
      { playerId: "wr2", routeId: "drive-block", lineType: "dashed" },
    ],
  },
  {
    id: "rz-sprint-out",
    name: "Sprint Out",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "red-zone",
    description:
      "QB sprints to the boundary, reads flat-corner concept on the move.",
    routes: [
      { playerId: "wr1", routeId: "corner", lineType: "solid" },
      { playerId: "slot1", routeId: "flat", lineType: "solid" },
      { playerId: "wr2", routeId: "post", lineType: "dashed" },
      { playerId: "slot2", routeId: "drag", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
  {
    id: "rz-double-slants",
    name: "Double Slants",
    formation: "shotgun-2x2",
    playType: "pass",
    category: "red-zone",
    description:
      "Both outside WRs run slants in the compressed red zone. Quick game.",
    routes: [
      { playerId: "wr1", routeId: "slant", lineType: "solid" },
      { playerId: "wr2", routeId: "slant", lineType: "solid" },
      { playerId: "slot1", routeId: "flat", lineType: "dashed" },
      { playerId: "slot2", routeId: "flat", lineType: "dashed" },
      { playerId: "rb", routeId: "pass-pro", lineType: "thick" },
    ],
  },
];

// ── Combined library and helpers ───────────────────────────────────

export const PLAY_LIBRARY: PlayTemplate[] = [
  ...quickGame,
  ...playAction,
  ...deepShots,
  ...runGame,
  ...screens,
  ...redZone,
];

/** Get all plays in a given category */
export function getPlaysByCategory(category: string): PlayTemplate[] {
  return PLAY_LIBRARY.filter((p) => p.category === category);
}

/** Find a single play template by id */
export function getPlayTemplateById(id: string): PlayTemplate | undefined {
  return PLAY_LIBRARY.find((p) => p.id === id);
}

/** Get all unique play categories */
export function getAllPlayCategories(): string[] {
  return [...new Set(PLAY_LIBRARY.map((p) => p.category))];
}
