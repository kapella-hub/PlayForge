# PlayForge Phase 3c — Designer Power: Editing Core + Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add precision placement to the play designer (drag snapping + alignment guides, arrow-key nudge) and clear four known defects (draft key scoping, canonical route-type vocabulary + legacy healing, preview auto-play, `n()` rename).

**Architecture:** New pure helper modules (`snapping.ts`, `route-types.ts`, `draft-storage.ts`, `nudge.ts`) hold all testable logic. The Konva engine (`play-canvas.tsx`, `player-node.tsx`) gains additive `dragmove` snapping + a guides layer. `designer/page.tsx` splits into a thin server wrapper (reads `auth()` → `userId`) plus the existing client moved to `designer-client.tsx`, which wires drafts, nudge, and preview auto-play. Route-type healing runs at the designer's canvas load sites (not inside `deserializeCanvas`, which has an identity-preserving contract).

**Tech Stack:** Next.js 16 App Router, React 19 (React Compiler lint rules), Konva/react-konva, Tailwind v4 tokens, Vitest + Testing Library, TypeScript strict.

## Global Constraints

- **Verification quartet, run at the end of every task:** `npm run test:run` (211 test baseline — count only grows), `npx tsc --noEmit` (clean), `npm run lint` (**stays 0 errors**), `npm run build` (succeeds).
- **Snap threshold:** exactly `1.5` FIELD coordinate units (scale-independent; never pixels).
- **Snap targets:** other players' `x` and `y`; field center `x = FIELD.WIDTH / 2`; the dragged player's own pre-drag `y`.
- **Alt/Option held disables snapping** (returns the proposed position, zero guides).
- **Nudge:** arrow keys move the selected player `0.5` FIELD units; `Shift`+arrow = `2` units. A nudge burst (successive nudges `< 800 ms` apart) is **one** undo entry — `pushHistory` fires only when a burst starts.
- **One undo step per drag, unchanged:** `handlePlayerDragEnd` still commits through the existing `onChange` → `pushHistory` flow.
- **Draft key format:** `playforge-draft:<userId>-<timestamp>`; the restore scan filters by the current user's prefix; legacy `playforge-draft-*` keys are adopted **once** into the user's namespace (best-effort, wrapped in try/catch — a failed adoption must never break designer load).
- **React Compiler lint rules stay clean (lint remains 0 errors):** no set-state-in-effect, no ref reads/writes during render. Refs and `setState` written **inside event handlers** are allowed and are the required idiom here.
- **Canvas is siloed from CSS tokens by design:** engine colors live in `FIELD.COLORS` (add a `SNAP_GUIDE` entry); do **not** use Tailwind tokens inside Konva. In DOM UI, any text on a `bg-accent` fill uses `text-accent-foreground`; use design tokens, never raw hex.
- **`readOnly` / preview mode is unaffected by snapping and nudge:** no dragmove snapping listeners fire and no nudge occurs when previewing.

---

### Task 1: Snapping math (pure helper)

**Files:**
- Create: `src/engine/snapping.ts`
- Test: `tests/engine/snapping.test.ts`

**Interfaces:**
- Consumes: `FIELD` from `src/engine/constants.ts`; `CanvasPlayer` from `src/engine/types.ts` (`{ id: string; label: string; x: number; y: number; side: "offense" | "defense" }`).
- Produces:
  - `interface SnapGuide { axis: "x" | "y"; coord: number }` — `axis: "x"` means a vertical guide line at `x = coord`; `axis: "y"` means a horizontal guide line at `y = coord`.
  - `interface SnapResult { x: number; y: number; guides: SnapGuide[] }`
  - `const SNAP_THRESHOLD = 1.5`
  - `function computeSnap(draggedId: string, proposed: { x: number; y: number }, players: CanvasPlayer[], opts: { altHeld: boolean; preDragY: number }): SnapResult`

- [ ] **Step 1: Write the failing test**

```ts
// tests/engine/snapping.test.ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- snapping`
Expected: FAIL — `computeSnap` is not exported / module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/engine/snapping.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- snapping`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run` (baseline + 8), then `npx tsc --noEmit`, then `npm run lint` (0 errors), then `npm run build`.
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/snapping.ts tests/engine/snapping.test.ts
git commit -m "feat(designer): add computeSnap alignment helper with unit tests"
```

---

### Task 2: Canonical route-type vocabulary + normalization (pure helper)

**Files:**
- Create: `src/engine/route-types.ts`
- Test: `tests/engine/route-types.test.ts`

**Context / discovery (read before implementing):**
- The `n()` → `detectRouteType` rename the spec §3 calls for is **already done** in the codebase: `src/engine/constants.ts:487` exports `detectRouteType` and its only caller `src/engine/play-canvas.tsx:156` already uses that name. No `n(` symbol exists. Step 6 below verifies this; there is no separate rename task.
- There are **two disjoint route-type vocabularies** in the codebase. Do not try to merge them:
  1. The **pill vocabulary** (the classification tags shown as pills and emitted by `detectRouteType`): the four groups currently hard-coded in `src/components/play/assignment-panel.tsx:18-35`. This is the canonical set this module owns.
  2. The **route-library template names** in `src/engine/routes-library.ts` (e.g. `"Dig / In"`, `"Go / Fly"`, `"Bubble Screen"`) which are written into `routeType` when a coach stamps a library route (`designer/page.tsx:355,392`). Many of these never match a pill and must pass through normalization **unchanged** (same as today — they simply don't light a pill). `route-picker.tsx` renders these library templates and is intentionally **not** wired to this module.

**Interfaces:**
- Consumes: `CanvasData`, `Route` from `src/engine/types.ts`.
- Produces:
  - `const ROUTE_TYPE_GROUPS: readonly { label: string; routes: readonly string[] }[]` — the grouped pill structure (moved verbatim from assignment-panel).
  - `const ROUTE_TYPES: readonly string[]` — all pill names, flattened.
  - `const ROUTE_TYPE_LABELS: Record<string, string>` — canonical value → display label (identity today; structure lets labels diverge later).
  - `function normalizeRouteType(raw: string): string` — case-insensitive heal to canonical casing; trims; passes through non-members unchanged.
  - `function normalizeCanvasRouteTypes(data: CanvasData): CanvasData` — returns a copy with each route's `routeType` normalized (routes with no `routeType` left untouched).

- [ ] **Step 1: Write the failing test**

```ts
// tests/engine/route-types.test.ts
import { describe, it, expect } from "vitest";
import {
  ROUTE_TYPES,
  ROUTE_TYPE_GROUPS,
  normalizeRouteType,
  normalizeCanvasRouteTypes,
} from "@/engine/route-types";
import type { CanvasData } from "@/engine/types";

describe("normalizeRouteType", () => {
  it("heals legacy lowercase to canonical casing", () => {
    expect(normalizeRouteType("slant")).toBe("Slant");
    expect(normalizeRouteType("post")).toBe("Post");
    expect(normalizeRouteType("GO")).toBe("Go");
  });

  it("is identity for already-canonical values", () => {
    expect(normalizeRouteType("Slant")).toBe("Slant");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeRouteType("  slant  ")).toBe("Slant");
  });

  it("passes through route-library names that are not pills, unchanged", () => {
    expect(normalizeRouteType("Dig / In")).toBe("Dig / In");
    expect(normalizeRouteType("Go / Fly")).toBe("Go / Fly");
    expect(normalizeRouteType("Bubble Screen")).toBe("Bubble Screen");
  });
});

describe("ROUTE_TYPES", () => {
  it("is the de-duplicated flattening of the groups and includes core pills", () => {
    const flat = ROUTE_TYPE_GROUPS.flatMap((g) => g.routes);
    expect([...ROUTE_TYPES]).toEqual(flat);
    expect(new Set(ROUTE_TYPES).size).toBe(ROUTE_TYPES.length);
    for (const t of ["Flat", "Slant", "Post", "Go", "Corner"]) {
      expect(ROUTE_TYPES).toContain(t);
    }
  });

  it("contains every named output the detector can produce", () => {
    // Contract: detectRouteType's named outputs must stay canonical.
    // ("Route" and "Unknown" are documented non-pill fallbacks.)
    const detectorNamed = ["Flat", "Drag", "Curl", "Post", "Corner", "Dig", "Out", "Go", "Slant"];
    for (const name of detectorNamed) {
      expect(ROUTE_TYPES).toContain(name);
    }
  });
});

describe("normalizeCanvasRouteTypes", () => {
  it("heals every route's casing and leaves missing routeType untouched", () => {
    const data: CanvasData = {
      players: [],
      routes: [
        { playerId: "a", waypoints: [], type: "solid", routeType: "slant" },
        { playerId: "b", waypoints: [], type: "solid" },
        { playerId: "c", waypoints: [], type: "solid", routeType: "Dig / In" },
      ],
      motions: [],
      meta: { formation: "", playType: "", side: "offense" },
    };
    const out = normalizeCanvasRouteTypes(data);
    expect(out.routes[0].routeType).toBe("Slant");
    expect(out.routes[1].routeType).toBeUndefined();
    expect(out.routes[2].routeType).toBe("Dig / In");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- route-types`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/engine/route-types.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- route-types`
Expected: PASS.

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Expected: all clean.

- [ ] **Step 6: Verify the `n()` → `detectRouteType` rename is already complete (no code change)**

Run: `npx eslint --no-eslintrc --version >/dev/null; grep -rn "\bn(" src/engine/constants.ts src/engine/play-canvas.tsx || echo "no n() callers"`
Expected: prints `no n() callers`. Then confirm `grep -rn "detectRouteType" src/engine` lists the export in `constants.ts` and the call in `play-canvas.tsx`. If any bare `n(` detector reference is found, rename it to `detectRouteType`; otherwise this spec item is satisfied with no change.

- [ ] **Step 7: Commit**

```bash
git add src/engine/route-types.ts tests/engine/route-types.test.ts
git commit -m "feat(designer): add canonical route-type vocabulary + normalization"
```

---

### Task 3: User-scoped draft storage helpers (pure)

**Files:**
- Create: `src/lib/draft-storage.ts`
- Test: `tests/lib/draft-storage.test.ts`

**Context / discovery:**
- Today drafts use a single global key space: written as `` `playforge-draft-${Date.now()}` `` and scanned by `k.startsWith("playforge-draft-")` (`designer/page.tsx:141,276,278`). This task extracts the scoping + one-time legacy adoption as pure, testable helpers over a small storage interface (so no `localStorage` is needed in tests). Task 8 wires them into the client against the real `localStorage`.
- Key formats are deliberately disjoint: legacy = `playforge-draft-<ts>` (hyphen after `draft`); scoped = `playforge-draft:<userId>-<ts>` (colon after `draft`). A scoped key never satisfies the legacy prefix and vice-versa.

**Interfaces:**
- Produces:
  - `interface DraftStorage { keys(): string[]; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`
  - `function scopedDraftKey(userId: string, timestamp: number): string`
  - `function isOwnDraftKey(key: string, userId: string): boolean`
  - `function isLegacyDraftKey(key: string): boolean`
  - `function findLatestOwnDraftKey(keys: string[], userId: string): string | null`
  - `function adoptLegacyDraftKeys(storage: DraftStorage, userId: string, now?: () => number): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/draft-storage.test.ts
import { describe, it, expect } from "vitest";
import {
  scopedDraftKey,
  isOwnDraftKey,
  isLegacyDraftKey,
  findLatestOwnDraftKey,
  adoptLegacyDraftKeys,
  type DraftStorage,
} from "@/lib/draft-storage";

class MemoryStorage implements DraftStorage {
  m = new Map<string, string>();
  constructor(init: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(init)) this.m.set(k, v);
  }
  keys() { return [...this.m.keys()]; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe("draft key helpers", () => {
  it("builds a scoped key", () => {
    expect(scopedDraftKey("alice", 123)).toBe("playforge-draft:alice-123");
  });

  it("recognizes only the current user's scoped keys", () => {
    expect(isOwnDraftKey("playforge-draft:alice-9", "alice")).toBe(true);
    expect(isOwnDraftKey("playforge-draft:bob-9", "alice")).toBe(false);
    expect(isOwnDraftKey("playforge-draft-9", "alice")).toBe(false);
  });

  it("recognizes only legacy keys", () => {
    expect(isLegacyDraftKey("playforge-draft-9")).toBe(true);
    expect(isLegacyDraftKey("playforge-draft:alice-9")).toBe(false);
  });

  it("finds the latest own draft, ignoring other users and legacy keys", () => {
    const keys = [
      "playforge-draft:alice-100",
      "playforge-draft:alice-300",
      "playforge-draft:bob-999",
      "playforge-draft-500",
      "unrelated",
    ];
    expect(findLatestOwnDraftKey(keys, "alice")).toBe("playforge-draft:alice-300");
    expect(findLatestOwnDraftKey(keys, "carol")).toBeNull();
  });
});

describe("adoptLegacyDraftKeys", () => {
  it("renames legacy keys into the user namespace, preserving timestamp and value", () => {
    const s = new MemoryStorage({
      "playforge-draft-777": JSON.stringify({ name: "Old" }),
      "playforge-draft:bob-1": "bobs",
      "playforge-draft:alice-2": "alices",
      "unrelated": "x",
    });
    adoptLegacyDraftKeys(s, "alice");
    expect(s.getItem("playforge-draft-777")).toBeNull();
    expect(s.getItem("playforge-draft:alice-777")).toBe(JSON.stringify({ name: "Old" }));
    expect(s.getItem("playforge-draft:bob-1")).toBe("bobs"); // other user untouched
    expect(s.getItem("playforge-draft:alice-2")).toBe("alices"); // existing own untouched
    expect(s.getItem("unrelated")).toBe("x");
  });

  it("is best-effort: a failure on one key does not abort the rest", () => {
    class FlakyStorage extends MemoryStorage {
      setItem(k: string, v: string) {
        if (v === "boom") throw new Error("quota");
        super.setItem(k, v);
      }
    }
    const s = new FlakyStorage({
      "playforge-draft-1": "boom",
      "playforge-draft-2": "ok",
    });
    expect(() => adoptLegacyDraftKeys(s, "alice")).not.toThrow();
    expect(s.getItem("playforge-draft:alice-2")).toBe("ok");
    expect(s.getItem("playforge-draft-2")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- draft-storage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/draft-storage.ts
const LEGACY_PREFIX = "playforge-draft-";
const SCOPED_PREFIX = "playforge-draft:";

export interface DraftStorage {
  keys(): string[];
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function scopedDraftKey(userId: string, timestamp: number): string {
  return `${SCOPED_PREFIX}${userId}-${timestamp}`;
}

function ownPrefix(userId: string): string {
  return `${SCOPED_PREFIX}${userId}-`;
}

export function isOwnDraftKey(key: string, userId: string): boolean {
  return key.startsWith(ownPrefix(userId));
}

export function isLegacyDraftKey(key: string): boolean {
  return key.startsWith(LEGACY_PREFIX);
}

/** The current user's latest draft key by lexicographic (== chronological) order. */
export function findLatestOwnDraftKey(
  keys: string[],
  userId: string,
): string | null {
  const own = keys.filter((k) => isOwnDraftKey(k, userId)).sort();
  return own.length ? own[own.length - 1] : null;
}

/**
 * One-time, best-effort migration of legacy `playforge-draft-*` keys into the
 * current user's namespace, preserving each key's timestamp. Each key is
 * migrated inside its own try/catch so a single failure (e.g. quota) never
 * aborts the rest or breaks designer load.
 */
export function adoptLegacyDraftKeys(
  storage: DraftStorage,
  userId: string,
  now: () => number = Date.now,
): void {
  for (const key of storage.keys()) {
    if (!isLegacyDraftKey(key)) continue;
    try {
      const value = storage.getItem(key);
      if (value === null) continue;
      const rawTs = key.slice(LEGACY_PREFIX.length);
      const ts = /^\d+$/.test(rawTs) ? Number(rawTs) : now();
      storage.setItem(scopedDraftKey(userId, ts), value);
      storage.removeItem(key);
    } catch {
      // best-effort: skip this key
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- draft-storage`
Expected: PASS.

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/draft-storage.ts tests/lib/draft-storage.test.ts
git commit -m "feat(designer): add user-scoped draft storage helpers"
```

---

### Task 4: Nudge helpers (pure)

> **AMENDMENT (2026-07-06, post-review controller decision):** `nudgePlayers` clamps the moved player to field bounds — x to `[0, FIELD.WIDTH]`, y to `[0, FIELD.HEIGHT]`. The original task omitted clamping; without it, held arrow keys push a player outside the visible canvas where it can't be seen or grabbed (drag is implicitly mouse-bounded; keyboard isn't). Signature unchanged; four edge-clamp tests + direct step-constant assertions added.

**Files:**
- Create: `src/engine/nudge.ts`
- Test: `tests/engine/nudge.test.ts`

**Interfaces:**
- Consumes: `CanvasPlayer` from `src/engine/types.ts`.
- Produces:
  - `const NUDGE_STEP = 0.5` — FIELD units per arrow press.
  - `const NUDGE_STEP_SHIFT = 2` — FIELD units per Shift+arrow press.
  - `const NUDGE_BURST_MS = 800` — a new undo entry starts when the gap since the last nudge exceeds this.
  - `function isNewNudgeBurst(now: number, lastNudgeAt: number, gapMs?: number): boolean`
  - `function nudgePlayers(players: CanvasPlayer[], playerId: string, dx: number, dy: number): CanvasPlayer[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/engine/nudge.test.ts
import { describe, it, expect } from "vitest";
import {
  isNewNudgeBurst,
  nudgePlayers,
  NUDGE_BURST_MS,
} from "@/engine/nudge";
import type { CanvasPlayer } from "@/engine/types";

const players: CanvasPlayer[] = [
  { id: "a", label: "A", x: 100, y: 200, side: "offense" },
  { id: "b", label: "B", x: 300, y: 400, side: "offense" },
];

describe("isNewNudgeBurst", () => {
  it("is true only when the gap exceeds the window", () => {
    expect(isNewNudgeBurst(2000, 1000)).toBe(true); // 1000ms gap > 800
    expect(isNewNudgeBurst(1500, 1000)).toBe(false); // 500ms gap
    expect(isNewNudgeBurst(1000 + NUDGE_BURST_MS, 1000)).toBe(false); // exactly 800, not >
    expect(isNewNudgeBurst(Infinity, 0)).toBe(true); // first-ever nudge
  });
});

describe("nudgePlayers", () => {
  it("moves only the target player and returns a new array", () => {
    const out = nudgePlayers(players, "a", 0.5, -0.5);
    expect(out).not.toBe(players);
    expect(out[0]).toEqual({ id: "a", label: "A", x: 100.5, y: 199.5, side: "offense" });
    expect(out[1]).toEqual(players[1]); // untouched
  });

  it("is a no-op copy when the player id is absent", () => {
    const out = nudgePlayers(players, "zzz", 5, 5);
    expect(out).toEqual(players);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- nudge`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/engine/nudge.ts
import type { CanvasPlayer } from "./types";

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

/** Return a new players array with `playerId` moved by (dx, dy) in FIELD units. */
export function nudgePlayers(
  players: CanvasPlayer[],
  playerId: string,
  dx: number,
  dy: number,
): CanvasPlayer[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, x: p.x + dx, y: p.y + dy } : p,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- nudge`
Expected: PASS.

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/nudge.ts tests/engine/nudge.test.ts
git commit -m "feat(designer): add nudge burst + move helpers"
```

---

### Task 5: Wire snapping + alignment guides into the canvas

**Files:**
- Modify: `src/engine/constants.ts:37-38` (add a `SNAP_GUIDE` entry to `FIELD.COLORS`)
- Modify: `src/engine/player-node.tsx` (add an `onDragMove` prop and wire it to the Group)
- Modify: `src/engine/play-canvas.tsx` (guides state, dragmove snap handler, guide rendering, clear-on-dragend)

**Interfaces:**
- Consumes: `computeSnap`, `SnapGuide` from `src/engine/snapping.ts` (Task 1).
- Produces: `PlayerNode` gains `onDragMove?: (id: string, e: KonvaEventObject<DragEvent>) => void`.

**Coordinate note (do not re-derive):** The existing `handlePlayerDragEnd` (`play-canvas.tsx:133-145`) converts the Konva node position to FIELD space with `node.x() / scaleX`, `node.y() / scaleY`, and commits that. The dragmove handler MUST read with the identical `/scaleX, /scaleY` and write the snapped FIELD position back with the exact inverse (`* scaleX, * scaleY`). This makes snapping self-consistent with the commit path regardless of how Konva reports coordinates in a scaled layer. Guides render in the same scaled interactive `Layer` using FIELD coordinates — the same basis in which players are declared (`Group x={player.x}`), so a guide at `coord` passes exactly through the aligned player.

**Testing note:** The repo has no react-konva component tests (canvas is unavailable under jsdom), so this task adds none — the snap math is already fully covered by Task 1. Verification is `tsc` + `lint` + `build` here, plus the browser QA in Task 9.

- [ ] **Step 1: Add the guide color to `FIELD.COLORS`**

In `src/engine/constants.ts`, inside `FIELD.COLORS`, add after the `PREVIEW_LINE` line (currently line 38):

```ts
    PREVIEW_LINE: "rgba(255,255,255,0.5)",
    // Alignment snap guide (designer drag only)
    SNAP_GUIDE: "rgba(245,158,11,0.9)",
```

- [ ] **Step 2: Add the `onDragMove` prop to `PlayerNode`**

In `src/engine/player-node.tsx`, extend `PlayerNodeProps` (after the `onDragEnd` line, ~line 11):

```ts
  onDragEnd: (id: string, x: number, y: number) => void;
  /** Fires continuously during a drag (designer only) with the live Konva event. */
  onDragMove?: (id: string, e: KonvaEventObject<DragEvent>) => void;
```

Add `onDragMove` to the destructured props (in the `export default function PlayerNode({ ... })` list, after `onDragEnd`). Add a handler next to `handleDragEnd` (~line 69):

```ts
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    onDragMove?.(player.id, e);
  };
```

Wire it on the draggable `Group` (add right after `onDragEnd={handleDragEnd}`, ~line 107):

```tsx
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
```

- [ ] **Step 3: Add guides state + dragmove handler to `PlayCanvas`**

In `src/engine/play-canvas.tsx`, add to the imports near line 11:

```ts
import { FIELD, detectRouteType } from "./constants";
import { computeSnap, type SnapGuide } from "./snapping";
```

Add guides state next to the other `useState` hooks (after the `cursorPos` state, ~line 88):

```ts
  /** Active alignment guides during a designer drag (event-handler state only). */
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
```

Add the dragmove handler immediately before `handlePlayerDragEnd` (~line 133):

```ts
  const handlePlayerDragMove = useCallback(
    (id: string, e: KonvaEventObject<DragEvent>) => {
      if (readOnly) return;
      const node = e.target;
      const proposed = { x: node.x() / scaleX, y: node.y() / scaleY };
      const player = canvasData.players.find((p) => p.id === id);
      if (!player) return;
      const { x, y, guides } = computeSnap(id, proposed, canvasData.players, {
        altHeld: e.evt.altKey,
        preDragY: player.y,
      });
      node.x(x * scaleX);
      node.y(y * scaleY);
      setActiveGuides(guides);
    },
    [readOnly, scaleX, scaleY, canvasData.players],
  );
```

- [ ] **Step 4: Clear guides on dragend**

In `handlePlayerDragEnd` (~line 133-145), add `setActiveGuides([]);` right after the `if (readOnly) return;` guard:

```ts
  const handlePlayerDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      setActiveGuides([]);
      const canvasX = x / scaleX;
      const canvasY = y / scaleY;
      // ...unchanged...
```

- [ ] **Step 5: Pass `onDragMove` to `PlayerNode` and render the guides**

In the players map (~line 510), pass the handler (only when editable, so preview attaches no snapping listener):

```tsx
                <PlayerNode
                  player={player}
                  isSelected={player.id === selectedPlayerId}
                  onSelect={handleSelectPlayer}
                  onDragEnd={handlePlayerDragEnd}
                  onDragMove={readOnly ? undefined : handlePlayerDragMove}
                  animatedPosition={...unchanged...}
                  ghostPosition={...unchanged...}
                />
```

Inside the interactive `<Layer scaleX={scaleX} scaleY={scaleY}>` (line 435), add the guide lines just before the `{/* Players */}` block (~line 500):

```tsx
          {/* Alignment snap guides (designer drag) */}
          {activeGuides.map((g, i) => (
            <Line
              key={`guide-${g.axis}-${i}`}
              points={
                g.axis === "x"
                  ? [g.coord, 0, g.coord, FIELD.HEIGHT]
                  : [0, g.coord, FIELD.WIDTH, g.coord]
              }
              stroke={FIELD.COLORS.SNAP_GUIDE}
              strokeWidth={1.5}
              dash={[8, 6]}
              listening={false}
            />
          ))}
```

(`Line` is already imported from `react-konva` at the top of the file.)

- [ ] **Step 6: Run the full verification quartet**

Run: `npm run test:run` (baseline unchanged — no new tests here), `npx tsc --noEmit`, `npm run lint` (**0 errors** — confirm no set-state-in-effect / ref-in-render warnings from the new event-handler state), `npm run build`.
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/constants.ts src/engine/player-node.tsx src/engine/play-canvas.tsx
git commit -m "feat(designer): snap dragged players to alignment guides"
```

---

### Task 6: Assignment panel consumes the canonical vocabulary + normalizes pill highlighting

**Files:**
- Modify: `src/components/play/assignment-panel.tsx` (import `ROUTE_TYPE_GROUPS`/`normalizeRouteType`; delete the local `routeGroups`; normalize the active-pill comparison)
- Test: `tests/components/play/assignment-panel.test.tsx` (add a legacy-casing highlight test)

**Interfaces:**
- Consumes: `ROUTE_TYPE_GROUPS`, `normalizeRouteType` from `src/engine/route-types.ts` (Task 2).

**This fixes the reported defect** that a play stored with a lowercase `routeType` (e.g. `"slant"`) fails to highlight its pill, because the current comparison is exact (`route.routeType === rt`, `assignment-panel.tsx:208`).

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe("AssignmentPanel", ...)` in `tests/components/play/assignment-panel.test.tsx`:

```tsx
  it("marks the pill active for a legacy lowercase routeType", () => {
    render(
      <AssignmentPanel
        player={player}
        route={{ ...route, routeType: "slant" }}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
      />,
    );
    const slant = screen.getByRole("button", { name: "Slant" });
    expect(slant.className).toContain("bg-primary");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- assignment-panel`
Expected: FAIL — the `"slant"` pill is not highlighted (exact comparison misses).

- [ ] **Step 3: Implement — consume canonical groups + normalize the comparison**

In `src/components/play/assignment-panel.tsx`:

1. Add the import near the top (after the `framer-motion` import):

```ts
import { ROUTE_TYPE_GROUPS, normalizeRouteType } from "@/engine/route-types";
```

2. Delete the local `const routeGroups = [ ... ] as const;` block (currently lines 18-35).

3. In the render, change `routeGroups.map((group) => (` to `ROUTE_TYPE_GROUPS.map((group) => (`.

4. Change the active-pill test (currently `const isActive = route.routeType === rt;`) to:

```tsx
                        {group.routes.map((rt) => {
                          const isActive =
                            route.routeType !== undefined &&
                            normalizeRouteType(route.routeType) === rt;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- assignment-panel`
Expected: PASS — both the existing `"Slant"` test and the new `"slant"` test highlight the pill.

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/play/assignment-panel.tsx tests/components/play/assignment-panel.test.tsx
git commit -m "fix(designer): highlight route pill for legacy-cased routeType"
```

---

### Task 7: Server wrapper + user-scoped drafts + route-type healing on load

**Files:**
- Move: `src/app/(coach)/designer/page.tsx` → `src/app/(coach)/designer/designer-client.tsx` (via `git mv`)
- Create: `src/app/(coach)/designer/page.tsx` (new thin server component)
- Modify: `src/app/(coach)/designer/designer-client.tsx` (accept `userId`; wire draft scoping/adoption; normalize on the three canvas load sites)

**Interfaces:**
- Consumes: `scopedDraftKey`, `isOwnDraftKey`, `findLatestOwnDraftKey`, `adoptLegacyDraftKeys`, `DraftStorage` from `src/lib/draft-storage.ts` (Task 3); `normalizeCanvasRouteTypes` from `src/engine/route-types.ts` (Task 2); `auth` from `src/lib/auth.ts`.
- Produces: `export function DesignerClient({ userId }: { userId: string })` (was `export default function DesignerPage()`).

**Discovery / rationale:**
- Nothing imports the designer page module (grep of `designer/page` / `designer-client` in `src/` is empty), so converting the default `DesignerPage` export to a named `DesignerClient` export is safe.
- The client uses `useSearchParams()`, which Next.js requires to sit inside a `<Suspense>` boundary when rendered from a server component — hence the wrapper wraps `<DesignerClient>` in `<Suspense>`.
- `deserializeCanvas` is deliberately NOT the healing site: `tests/engine/serialization.test.ts:6-26` asserts `serialize→deserialize` is identity for a `routeType: "post"` (lowercase) route. Healing there would break that contract. Instead, heal at the three designer load sites, all of which call `deserializeCanvas`: load-by-id (`:109`), draft restore (`:464`), version restore (`:866`). (Line numbers below refer to the file's pre-move positions.)
- The `userId` prop is consumed in this same task (draft scan + save), so no unused-var lint error is introduced.

**Testing note:** Server/page wiring has no unit test (the repo has none for pages, and `localStorage`/Next server context are unavailable under the unit harness). All extracted logic is already covered by the Task 2 and Task 3 helper tests; behavior is verified in the Task 9 browser QA.

- [ ] **Step 1: Move the client file**

```bash
git mv "src/app/(coach)/designer/page.tsx" "src/app/(coach)/designer/designer-client.tsx"
```

- [ ] **Step 2: Create the server wrapper `page.tsx`**

```tsx
// src/app/(coach)/designer/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DesignerClient } from "./designer-client";

export const dynamic = "force-dynamic";

export default async function DesignerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense fallback={null}>
      <DesignerClient userId={session.user.id} />
    </Suspense>
  );
}
```

- [ ] **Step 3: Change the client signature + add a `localStorage` adapter**

In `src/app/(coach)/designer/designer-client.tsx`, keep the `"use client";` first line. Change the component signature:

```tsx
export function DesignerClient({ userId }: { userId: string }) {
```

Add the new imports (with the other `@/lib` / `@/engine` imports near the top):

```ts
import {
  scopedDraftKey,
  isOwnDraftKey,
  findLatestOwnDraftKey,
  adoptLegacyDraftKeys,
  type DraftStorage,
} from "@/lib/draft-storage";
import { normalizeCanvasRouteTypes } from "@/engine/route-types";
```

Add a module-scope `localStorage` adapter (above the component; only ever invoked inside client effects/handlers, so `localStorage` is available at call time):

```ts
function browserDraftStorage(): DraftStorage {
  return {
    keys: () => Object.keys(localStorage),
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    removeItem: (k) => localStorage.removeItem(k),
  };
}
```

- [ ] **Step 4: Rewrite the draft scan effect (adopt legacy + scan own)**

Replace the existing draft scan effect (pre-move lines 138-147) with:

```tsx
  // Offer to restore a saved draft when opening the designer with no target.
  // One-time, best-effort: adopt legacy (pre-user-scoping) drafts into this user.
  useEffect(() => {
    if (searchParams.get("playId") || searchParams.get("playbookId")) return;
    const storage = browserDraftStorage();
    try {
      adoptLegacyDraftKeys(storage, userId);
    } catch {
      // adoption must never break designer load
    }
    const latest = findLatestOwnDraftKey(storage.keys(), userId);
    if (latest) setDraftKey(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 5: Scope the draft write in `handleSave`**

In the `else` (no-playbook) branch of `handleSave` (pre-move lines 275-282), replace the cleanup + write with:

```tsx
        // No playbook context — save to localStorage as fallback.
        // Cap stored drafts: keep only this user's latest.
        const storage = browserDraftStorage();
        storage
          .keys()
          .filter((k) => isOwnDraftKey(k, userId))
          .forEach((k) => storage.removeItem(k));
        const key = scopedDraftKey(userId, Date.now());
        storage.setItem(
          key,
          JSON.stringify({ name: playName, playType, canvasData }),
        );
```

Add `userId` to the `handleSave` `useCallback` dependency array (append it to the existing `[playName, playType, canvasData, searchParams, toast, filmUrl, filmTimestamp]`).

- [ ] **Step 6: Heal route-type casing at the three load sites**

Wrap each `deserializeCanvas(...)` that feeds the designer canvas with `normalizeCanvasRouteTypes(...)`:

- Load-by-id (pre-move line 109):
  ```tsx
  const canvas = normalizeCanvasRouteTypes(deserializeCanvas(play.canvasData));
  ```
- Draft restore (pre-move line 464):
  ```tsx
  const canvas = normalizeCanvasRouteTypes(deserializeCanvas(draft.canvasData));
  ```
- Version restore (pre-move line 866, inside `VersionHistory`'s `onRestore`):
  ```tsx
  const canvas = normalizeCanvasRouteTypes(deserializeCanvas(canvasData));
  ```
  (Leave the adjacent `pushHistory(canvasData as CanvasData)` line unchanged — out of scope.)

- [ ] **Step 7: Run the full verification quartet**

Run: `npm run test:run` (baseline unchanged), `npx tsc --noEmit`, `npm run lint` (**0 errors** — confirm `userId` and every new import is used), `npm run build` (confirm the server/client split builds and the `useSearchParams` Suspense boundary satisfies the build).
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(coach)/designer/page.tsx" "src/app/(coach)/designer/designer-client.tsx"
git commit -m "feat(designer): server wrapper + user-scoped drafts + route-type healing"
```

---

### Task 8: Arrow-key nudge (coalesced undo) + preview auto-play

**Files:**
- Modify: `src/app/(coach)/designer/designer-client.tsx` (nudge ref + handler + shortcuts; pass `autoPlay` to `AnimationControls`)

**Interfaces:**
- Consumes: `NUDGE_STEP`, `NUDGE_STEP_SHIFT`, `isNewNudgeBurst`, `nudgePlayers` from `src/engine/nudge.ts` (Task 4); the existing `autoPlay` prop of `AnimationControls` (`src/components/play/animation-controls.tsx:22-24, 116-125`).

**Discovery (both mechanisms already exist — this is wiring only):**
- **Keyboard hook needs NO extension.** `useKeyboardShortcuts` (`src/lib/use-keyboard-shortcuts.ts:38-64`) already matches arbitrary `e.key` values (including `"ArrowUp"`/`"ArrowDown"`/`"ArrowLeft"`/`"ArrowRight"`) and already disambiguates `shift`. Plain (non-shift) and shift variants are registered as separate entries because the matcher requires an exact `shift` match. `ignoreInputs: true` keeps arrows inert while typing in a name/notes field.
- **Preview playback already exists.** `AnimationControls` has an `autoPlay` prop that starts playback once on mount (400 ms timer → `setIsPlaying(true)`). The designer currently omits it. Because the controls mount only while `previewMode && animationData` are both true and fully unmount on preview exit (`handleTogglePreview` sets `animationData`/`animationState` to `null`), passing `autoPlay` makes playback auto-start exactly once per preview entry, and unmount-on-exit stops the rAF loop. That is the complete "enter preview → plays; exit → stops" behavior with a single prop.

**Testing note:** The coalescing decision and the move are unit-tested in Task 4 (`isNewNudgeBurst`, `nudgePlayers`); the ref/shortcut wiring and the one-prop preview change are verified by `tsc`/`lint`/`build` here and the Task 9 browser QA (undo-once-per-burst; preview auto-plays).

- [ ] **Step 1: Add the nudge imports + burst ref**

In `src/app/(coach)/designer/designer-client.tsx`, add the import:

```ts
import {
  NUDGE_STEP,
  NUDGE_STEP_SHIFT,
  isNewNudgeBurst,
  nudgePlayers,
} from "@/engine/nudge";
```

Add a ref next to `undoRef`/`redoRef` (~pre-move line 177):

```ts
  /** Timestamp (ms) of the last arrow nudge, for undo-burst coalescing. */
  const lastNudgeAtRef = useRef(0);
```

- [ ] **Step 2: Add the nudge handler**

Add this `useCallback` after `pushHistory` / near the other canvas handlers:

```tsx
  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (previewMode || !selectedPlayerId) return;
      const now = Date.now();
      // Start a new undo entry only when a burst begins (>800ms gap).
      if (isNewNudgeBurst(now, lastNudgeAtRef.current)) {
        pushHistory(canvasData);
      }
      lastNudgeAtRef.current = now; // ref write in an event handler: lint-safe
      setCanvasData({
        ...canvasData,
        players: nudgePlayers(canvasData.players, selectedPlayerId, dx, dy),
      });
      setDirty(true);
    },
    [previewMode, selectedPlayerId, canvasData, pushHistory],
  );
```

- [ ] **Step 3: Register the arrow shortcuts**

Append these eight entries to the array passed to `useKeyboardShortcuts([...])` (after the existing `"p"` preview entry, ~pre-move line 602):

```tsx
    { key: "ArrowUp", handler: () => nudge(0, -NUDGE_STEP), ignoreInputs: true },
    { key: "ArrowDown", handler: () => nudge(0, NUDGE_STEP), ignoreInputs: true },
    { key: "ArrowLeft", handler: () => nudge(-NUDGE_STEP, 0), ignoreInputs: true },
    { key: "ArrowRight", handler: () => nudge(NUDGE_STEP, 0), ignoreInputs: true },
    { key: "ArrowUp", shift: true, handler: () => nudge(0, -NUDGE_STEP_SHIFT), ignoreInputs: true },
    { key: "ArrowDown", shift: true, handler: () => nudge(0, NUDGE_STEP_SHIFT), ignoreInputs: true },
    { key: "ArrowLeft", shift: true, handler: () => nudge(-NUDGE_STEP_SHIFT, 0), ignoreInputs: true },
    { key: "ArrowRight", shift: true, handler: () => nudge(NUDGE_STEP_SHIFT, 0), ignoreInputs: true },
```

(Up = `-y` toward the top of the field; down = `+y`. FIELD `y` increases downward.)

- [ ] **Step 4: Turn on preview auto-play**

In the `AnimationControls` render (~pre-move lines 884-889), add the `autoPlay` prop:

```tsx
              <AnimationControls
                animationData={animationData}
                canvasData={canvasData}
                onFrameUpdate={handleAnimationFrame}
                isVisible={previewMode}
                autoPlay
              />
```

- [ ] **Step 5: Run the full verification quartet**

Run: `npm run test:run` (baseline unchanged), `npx tsc --noEmit`, `npm run lint` (**0 errors** — confirm no ref-in-render / set-state-in-effect warnings; the ref is written only inside the `nudge` event handler), `npm run build`.
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/designer/designer-client.tsx"
git commit -m "feat(designer): arrow-key nudge with coalesced undo + preview auto-play"
```

---

### Task 9: Close-out — gates + browser QA

**Files:** none (verification only).

This task runs the Phase 3b gate set on the whole branch and walks a manual browser QA covering every §1-§3 spec behavior. No commit unless a gate surfaces a fix.

- [ ] **Step 1: Full gate set (must all pass)**

Run each and confirm:
- `npm run test:run` — all pass; count ≥ 211 baseline + new tests from Tasks 1-4, 6 (snapping 8, route-types ~7, draft-storage ~6, nudge ~3, assignment-panel +1).
- `npx tsc --noEmit` — no errors.
- `npm run lint` — **0 errors** (no set-state-in-effect, no ref-in-render).
- `npm run build` — succeeds (server/client designer split builds; `useSearchParams` boundary satisfied).
- `git status` — clean working tree; all task commits present.

- [ ] **Step 2: Rename confirmation**

Confirm Task 2 Step 6 was satisfied: `grep -rn "\bn(" src/engine/constants.ts src/engine/play-canvas.tsx` returns nothing; `detectRouteType` is the exported detector. (Spec §3 rename item — already complete in the codebase.)

- [ ] **Step 3: Browser QA — precision placement (§1)**

Open the designer (`/designer`), pick a formation, then:
- [ ] Drag a player so its **x** nears another player's x → a dashed vertical guide appears through that x and the player snaps to it; release → the player stays snapped (one undo entry).
- [ ] Drag so its **y** nears another player's y → dashed horizontal guide + snap.
- [ ] Drag near the field's vertical center line → guide at `x = FIELD.WIDTH/2` + snap.
- [ ] Slide a player horizontally → it snaps back to its own pre-drag **y** (horizontal-slide guide).
- [ ] Hold **Alt/Option** while dragging → no snapping, no guides.
- [ ] All guides disappear on release; the drag is a single ⌘Z step.

- [ ] **Step 4: Browser QA — nudge (§1)**

- [ ] Select a player; press an arrow → moves 0.5 units; **Shift+arrow** → 2 units.
- [ ] Rapid arrow burst, then one ⌘Z → restores to the pre-burst position (burst = one undo entry).
- [ ] Pause > 0.8 s, nudge again → that nudge is a separate undo entry.
- [ ] Arrows do nothing while typing in the play-name/notes input.
- [ ] Arrows do nothing in preview mode or with no player selected.

- [ ] **Step 5: Browser QA — preview clarity (§2)**

- [ ] Enter Preview (toolbar button or `p`) → playback **auto-starts**; the scrubber still scrubs/replays/stops.
- [ ] Exit Preview → playback stops; re-entering auto-starts again.

- [ ] **Step 6: Browser QA — fixes (§3)**

- [ ] **Draft scoping/adoption:** In devtools, set a legacy key `localStorage.setItem("playforge-draft-1000", JSON.stringify({name:"Legacy", playType:"pass", canvasData:{players:[],routes:[],motions:[],meta:{formation:"",playType:"",side:"offense"}}}))`; reload `/designer` with no query params → the restore banner appears; after load, confirm the key was renamed to `playforge-draft:<yourUserId>-1000` and the legacy key is gone. A `playforge-draft:<otherUserId>-*` key is never offered.
- [ ] **Legacy-cased pills:** Open a play whose stored `routeType` is lowercase (e.g. hand-edit one, or an older play) → the matching Route Type pill is highlighted.
- [ ] **Regression:** draw a route (`d` + clicks + double-click), add motion (`m`), preview animation, mirror (`h`), undo/redo, and save — all behave as before.

- [ ] **Step 7: (If any fix was required) commit**

```bash
git add -A
git commit -m "fix(designer): phase 3c QA follow-ups"
```

Otherwise the branch is complete.

---
