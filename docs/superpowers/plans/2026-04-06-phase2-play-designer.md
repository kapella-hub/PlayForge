# PlayForge Phase 2: Play Designer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive play designer — a canvas-based football field where coaches create plays by positioning players, drawing routes, and previewing animations. Plus playbook CRUD and the designer page.

**Architecture:** Konva.js (react-konva) canvas engine isolated in `src/engine/`, integrated into the Next.js app via the `(coach)/designer` page. Plays are serialized to JSON and stored via Prisma. Formation templates provide quick-start positioning.

**Tech Stack:** react-konva, konva, TypeScript, Prisma, Next.js server actions, Vitest

---

## File Map

### New Files

```
src/
├── engine/
│   ├── types.ts                    # Canvas data types (CanvasPlayer, Route, CanvasData, AnimationData)
│   ├── constants.ts                # Field dimensions, colors, formation templates
│   ├── field-renderer.tsx          # Football field background (yard lines, hashes, numbers, end zones)
│   ├── player-node.tsx             # Draggable player circle with label
│   ├── route-line.tsx              # Bezier curve route with arrowhead
│   ├── play-canvas.tsx             # Main canvas component (composes field + players + routes)
│   └── serialization.ts           # Canvas state ↔ JSON conversion
├── app/
│   ├── (coach)/
│   │   ├── designer/
│   │   │   └── page.tsx            # Play designer page (full-screen canvas + panels)
│   │   └── playbooks/
│   │       ├── page.tsx            # Playbook list page
│   │       └── [id]/
│   │           └── page.tsx        # Single playbook with plays grid
│   └── api/
│       ├── playbooks/
│       │   └── route.ts            # CRUD for playbooks
│       └── plays/
│           └── route.ts            # CRUD for plays
├── components/
│   ├── play/
│   │   ├── formation-picker.tsx    # Formation template selector panel
│   │   ├── assignment-panel.tsx    # Right-side panel for selected player assignment
│   │   ├── play-toolbar.tsx        # Top toolbar (save, name, formation, play type)
│   │   └── play-card.tsx           # Play thumbnail card (used in playbook grid)
│   └── ui/
│       └── select.tsx              # Select/dropdown component
└── lib/
    └── actions/
        ├── playbook-actions.ts     # Server actions for playbook CRUD
        └── play-actions.ts         # Server actions for play CRUD
tests/
├── engine/
│   ├── serialization.test.ts       # Serialization round-trip tests
│   └── constants.test.ts           # Formation template validation tests
└── lib/
    └── actions/
        └── play-actions.test.ts    # Play action unit tests (mocked DB)
```

---

### Task 1: Install Canvas Dependencies & Engine Types

**Files:**
- Create: `src/engine/types.ts`, `src/engine/constants.ts`
- Test: `tests/engine/constants.test.ts`

- [ ] **Step 1: Install konva and react-konva**

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install konva react-konva
```

- [ ] **Step 2: Write the failing test for formation templates**

Create `tests/engine/constants.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { FORMATIONS, FIELD } from "@/engine/constants";

describe("FORMATIONS", () => {
  it("has at least 6 offensive formations", () => {
    const offensive = FORMATIONS.filter((f) => f.side === "offense");
    expect(offensive.length).toBeGreaterThanOrEqual(6);
  });

  it("has at least 4 defensive formations", () => {
    const defensive = FORMATIONS.filter((f) => f.side === "defense");
    expect(defensive.length).toBeGreaterThanOrEqual(4);
  });

  it("each formation has exactly 11 players", () => {
    for (const formation of FORMATIONS) {
      expect(formation.players).toHaveLength(11);
    }
  });

  it("each player has id, label, x, y within field bounds", () => {
    for (const formation of FORMATIONS) {
      for (const player of formation.players) {
        expect(player.id).toBeTruthy();
        expect(player.label).toBeTruthy();
        expect(player.x).toBeGreaterThanOrEqual(0);
        expect(player.x).toBeLessThanOrEqual(FIELD.WIDTH);
        expect(player.y).toBeGreaterThanOrEqual(0);
        expect(player.y).toBeLessThanOrEqual(FIELD.HEIGHT);
      }
    }
  });
});

describe("FIELD", () => {
  it("has standard dimensions", () => {
    expect(FIELD.WIDTH).toBeGreaterThan(0);
    expect(FIELD.HEIGHT).toBeGreaterThan(0);
    expect(FIELD.YARD_LINE_SPACING).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- tests/engine/constants.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Create `src/engine/types.ts`**

```typescript
export interface CanvasPlayer {
  id: string;
  label: string;
  x: number;
  y: number;
  side: "offense" | "defense";
}

export interface RouteWaypoint {
  x: number;
  y: number;
}

export interface Route {
  playerId: string;
  waypoints: RouteWaypoint[];
  type: "solid" | "dashed" | "thick";
  routeType?: string;
}

export interface CanvasData {
  players: CanvasPlayer[];
  routes: Route[];
  meta: {
    formation: string;
    playType: string;
    side: "offense" | "defense";
  };
}

export interface AnimationKeyframe {
  playerId: string;
  time: number;
  x: number;
  y: number;
}

export interface BallFlight {
  fromPlayerId: string;
  toPlayerId: string;
  time: number;
}

export interface AnimationData {
  keyframes: AnimationKeyframe[];
  duration: number;
  ballFlight?: BallFlight;
}

export interface FormationTemplate {
  id: string;
  name: string;
  side: "offense" | "defense";
  players: CanvasPlayer[];
}
```

- [ ] **Step 5: Create `src/engine/constants.ts`**

```typescript
import type { FormationTemplate } from "./types";

// Canvas field dimensions (in pixels at 1x zoom)
// Using a 1000x600 canvas, with field area roughly 900x500
// This represents a ~53.3 yard x ~30 yard view (half field width)
export const FIELD = {
  WIDTH: 1000,
  HEIGHT: 600,
  PADDING: 50,
  YARD_LINE_SPACING: 30, // pixels per 5 yards
  LINE_OF_SCRIMMAGE_Y: 350, // Y position of LOS
  HASH_WIDTH: 4,
  PLAYER_RADIUS: 16,
  COLORS: {
    FIELD: "#2d5a27",
    LINES: "#ffffff",
    OFFENSE: "#3b82f6",
    DEFENSE: "#ef4444",
    SELECTED: "#f59e0b",
    LOS: "#f59e0b",
    ROUTE: "#60a5fa",
    ROUTE_DASHED: "#94a3b8",
    ROUTE_BLOCK: "#f97316",
    ENDZONE: "#1a4a1a",
  },
} as const;

// Offensive formations (positions relative to LOS at FIELD.LINE_OF_SCRIMMAGE_Y)
// X: 0=left sideline, 1000=right sideline, 500=center
// Y: lower Y = closer to offense's end zone, higher Y = closer to defense

const OFFENSE_BASE = { side: "offense" as const };

export const FORMATIONS: FormationTemplate[] = [
  {
    id: "shotgun-2x2",
    name: "Shotgun 2x2",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 400, ...OFFENSE_BASE },
      { id: "RB", label: "RB", x: 540, y: 410, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 180, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 820, y: 350, ...OFFENSE_BASE },
      { id: "SL1", label: "H", x: 340, y: 350, ...OFFENSE_BASE },
      { id: "SL2", label: "Y", x: 660, y: 350, ...OFFENSE_BASE },
    ],
  },
  {
    id: "i-form",
    name: "I-Formation",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 380, ...OFFENSE_BASE },
      { id: "FB", label: "FB", x: 500, y: 410, ...OFFENSE_BASE },
      { id: "RB", label: "RB", x: 500, y: 440, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 180, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 820, y: 350, ...OFFENSE_BASE },
      { id: "TE", label: "TE", x: 620, y: 350, ...OFFENSE_BASE },
    ],
  },
  {
    id: "singleback",
    name: "Singleback",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 380, ...OFFENSE_BASE },
      { id: "RB", label: "RB", x: 500, y: 420, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 180, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 820, y: 350, ...OFFENSE_BASE },
      { id: "SL", label: "H", x: 340, y: 350, ...OFFENSE_BASE },
      { id: "TE", label: "TE", x: 620, y: 350, ...OFFENSE_BASE },
    ],
  },
  {
    id: "pistol",
    name: "Pistol",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 390, ...OFFENSE_BASE },
      { id: "RB", label: "RB", x: 500, y: 430, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 180, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 820, y: 350, ...OFFENSE_BASE },
      { id: "SL", label: "H", x: 340, y: 350, ...OFFENSE_BASE },
      { id: "TE", label: "TE", x: 620, y: 350, ...OFFENSE_BASE },
    ],
  },
  {
    id: "empty",
    name: "Empty (5 Wide)",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 400, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 140, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 860, y: 350, ...OFFENSE_BASE },
      { id: "SL1", label: "H", x: 300, y: 350, ...OFFENSE_BASE },
      { id: "SL2", label: "Y", x: 700, y: 350, ...OFFENSE_BASE },
      { id: "RB", label: "F", x: 380, y: 355, ...OFFENSE_BASE },
    ],
  },
  {
    id: "shotgun-trips",
    name: "Shotgun Trips",
    side: "offense",
    players: [
      { id: "C", label: "C", x: 500, y: 350, ...OFFENSE_BASE },
      { id: "LG", label: "LG", x: 460, y: 350, ...OFFENSE_BASE },
      { id: "RG", label: "RG", x: 540, y: 350, ...OFFENSE_BASE },
      { id: "LT", label: "LT", x: 420, y: 350, ...OFFENSE_BASE },
      { id: "RT", label: "RT", x: 580, y: 350, ...OFFENSE_BASE },
      { id: "QB", label: "QB", x: 500, y: 400, ...OFFENSE_BASE },
      { id: "RB", label: "RB", x: 450, y: 410, ...OFFENSE_BASE },
      { id: "WR1", label: "X", x: 180, y: 350, ...OFFENSE_BASE },
      { id: "WR2", label: "Z", x: 820, y: 350, ...OFFENSE_BASE },
      { id: "SL1", label: "H", x: 700, y: 350, ...OFFENSE_BASE },
      { id: "SL2", label: "Y", x: 760, y: 355, ...OFFENSE_BASE },
    ],
  },
  // Defensive formations
  {
    id: "4-3",
    name: "4-3",
    side: "defense",
    players: [
      { id: "DT1", label: "DT", x: 470, y: 320, side: "defense" },
      { id: "DT2", label: "DT", x: 530, y: 320, side: "defense" },
      { id: "DE1", label: "DE", x: 400, y: 320, side: "defense" },
      { id: "DE2", label: "DE", x: 600, y: 320, side: "defense" },
      { id: "MLB", label: "M", x: 500, y: 280, side: "defense" },
      { id: "WLB", label: "W", x: 400, y: 280, side: "defense" },
      { id: "SLB", label: "S", x: 600, y: 280, side: "defense" },
      { id: "CB1", label: "CB", x: 200, y: 300, side: "defense" },
      { id: "CB2", label: "CB", x: 800, y: 300, side: "defense" },
      { id: "FS", label: "FS", x: 500, y: 200, side: "defense" },
      { id: "SS", label: "SS", x: 600, y: 230, side: "defense" },
    ],
  },
  {
    id: "3-4",
    name: "3-4",
    side: "defense",
    players: [
      { id: "NT", label: "NT", x: 500, y: 320, side: "defense" },
      { id: "DE1", label: "DE", x: 410, y: 320, side: "defense" },
      { id: "DE2", label: "DE", x: 590, y: 320, side: "defense" },
      { id: "ILB1", label: "M", x: 460, y: 280, side: "defense" },
      { id: "ILB2", label: "M", x: 540, y: 280, side: "defense" },
      { id: "OLB1", label: "J", x: 370, y: 290, side: "defense" },
      { id: "OLB2", label: "S", x: 630, y: 290, side: "defense" },
      { id: "CB1", label: "CB", x: 200, y: 300, side: "defense" },
      { id: "CB2", label: "CB", x: 800, y: 300, side: "defense" },
      { id: "FS", label: "FS", x: 500, y: 200, side: "defense" },
      { id: "SS", label: "SS", x: 600, y: 230, side: "defense" },
    ],
  },
  {
    id: "nickel",
    name: "Nickel",
    side: "defense",
    players: [
      { id: "DT1", label: "DT", x: 470, y: 320, side: "defense" },
      { id: "DT2", label: "DT", x: 530, y: 320, side: "defense" },
      { id: "DE1", label: "DE", x: 400, y: 320, side: "defense" },
      { id: "DE2", label: "DE", x: 600, y: 320, side: "defense" },
      { id: "MLB", label: "M", x: 500, y: 280, side: "defense" },
      { id: "WLB", label: "W", x: 420, y: 280, side: "defense" },
      { id: "CB1", label: "CB", x: 200, y: 300, side: "defense" },
      { id: "CB2", label: "CB", x: 800, y: 300, side: "defense" },
      { id: "NB", label: "NB", x: 700, y: 300, side: "defense" },
      { id: "FS", label: "FS", x: 500, y: 200, side: "defense" },
      { id: "SS", label: "SS", x: 600, y: 230, side: "defense" },
    ],
  },
  {
    id: "dime",
    name: "Dime",
    side: "defense",
    players: [
      { id: "DT1", label: "DT", x: 470, y: 320, side: "defense" },
      { id: "DT2", label: "DT", x: 530, y: 320, side: "defense" },
      { id: "DE1", label: "DE", x: 400, y: 320, side: "defense" },
      { id: "DE2", label: "DE", x: 600, y: 320, side: "defense" },
      { id: "MLB", label: "M", x: 500, y: 280, side: "defense" },
      { id: "CB1", label: "CB", x: 180, y: 300, side: "defense" },
      { id: "CB2", label: "CB", x: 820, y: 300, side: "defense" },
      { id: "NB1", label: "NB", x: 300, y: 300, side: "defense" },
      { id: "NB2", label: "DB", x: 700, y: 300, side: "defense" },
      { id: "FS", label: "FS", x: 500, y: 200, side: "defense" },
      { id: "SS", label: "SS", x: 600, y: 230, side: "defense" },
    ],
  },
];

export function getFormationById(id: string): FormationTemplate | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function getFormationsBySize(side: "offense" | "defense"): FormationTemplate[] {
  return FORMATIONS.filter((f) => f.side === side);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test:run -- tests/engine/constants.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ tests/engine/ package.json package-lock.json
git commit -m "feat: add canvas engine types, field constants, and formation templates"
```

---

### Task 2: Field Renderer Component

**Files:**
- Create: `src/engine/field-renderer.tsx`

- [ ] **Step 1: Create `src/engine/field-renderer.tsx`**

This renders the football field background as Konva shapes.

```tsx
"use client";

import { Group, Rect, Line, Text } from "react-konva";
import { FIELD } from "./constants";

interface FieldRendererProps {
  width: number;
  height: number;
}

export function FieldRenderer({ width, height }: FieldRendererProps) {
  const scaleX = width / FIELD.WIDTH;
  const scaleY = height / FIELD.HEIGHT;

  const yardLines: JSX.Element[] = [];
  const hashMarks: JSX.Element[] = [];
  const numbers: JSX.Element[] = [];

  // Yard lines every 5 yards (from our LOS perspective)
  // We show about 30 yards of field vertically
  const numLines = 13; // ~60 yards of field
  const startY = FIELD.LINE_OF_SCRIMMAGE_Y - 6 * FIELD.YARD_LINE_SPACING;

  for (let i = 0; i < numLines; i++) {
    const y = startY + i * FIELD.YARD_LINE_SPACING;
    const yardNumber = 50 - Math.abs(i - 6) * 5; // Centered on 50

    yardLines.push(
      <Line
        key={`yl-${i}`}
        points={[FIELD.PADDING, y, FIELD.WIDTH - FIELD.PADDING, y]}
        stroke={FIELD.COLORS.LINES}
        strokeWidth={1}
        opacity={0.3}
      />
    );

    // Yard numbers on both sides
    if (yardNumber > 0 && yardNumber <= 50 && i % 2 === 0) {
      const displayNum = yardNumber === 50 ? "50" : String(yardNumber);
      numbers.push(
        <Text
          key={`num-l-${i}`}
          x={FIELD.PADDING + 10}
          y={y - 8}
          text={displayNum}
          fontSize={14}
          fontFamily="system-ui"
          fill={FIELD.COLORS.LINES}
          opacity={0.25}
        />
      );
      numbers.push(
        <Text
          key={`num-r-${i}`}
          x={FIELD.WIDTH - FIELD.PADDING - 30}
          y={y - 8}
          text={displayNum}
          fontSize={14}
          fontFamily="system-ui"
          fill={FIELD.COLORS.LINES}
          opacity={0.25}
        />
      );
    }

    // Hash marks
    const hashPositions = [FIELD.WIDTH * 0.37, FIELD.WIDTH * 0.63];
    for (const hx of hashPositions) {
      hashMarks.push(
        <Line
          key={`hash-${i}-${hx}`}
          points={[hx - 3, y, hx + 3, y]}
          stroke={FIELD.COLORS.LINES}
          strokeWidth={1}
          opacity={0.2}
        />
      );
    }
  }

  return (
    <Group scaleX={scaleX} scaleY={scaleY}>
      {/* Field background */}
      <Rect
        x={0}
        y={0}
        width={FIELD.WIDTH}
        height={FIELD.HEIGHT}
        fill={FIELD.COLORS.FIELD}
      />

      {/* End zones */}
      <Rect
        x={FIELD.PADDING}
        y={20}
        width={FIELD.WIDTH - 2 * FIELD.PADDING}
        height={40}
        fill={FIELD.COLORS.ENDZONE}
        opacity={0.5}
      />

      {/* Sidelines */}
      <Line
        points={[FIELD.PADDING, 20, FIELD.PADDING, FIELD.HEIGHT - 20]}
        stroke={FIELD.COLORS.LINES}
        strokeWidth={2}
        opacity={0.4}
      />
      <Line
        points={[FIELD.WIDTH - FIELD.PADDING, 20, FIELD.WIDTH - FIELD.PADDING, FIELD.HEIGHT - 20]}
        stroke={FIELD.COLORS.LINES}
        strokeWidth={2}
        opacity={0.4}
      />

      {/* Yard lines */}
      {yardLines}
      {hashMarks}
      {numbers}

      {/* Line of scrimmage */}
      <Line
        points={[FIELD.PADDING, FIELD.LINE_OF_SCRIMMAGE_Y, FIELD.WIDTH - FIELD.PADDING, FIELD.LINE_OF_SCRIMMAGE_Y]}
        stroke={FIELD.COLORS.LOS}
        strokeWidth={2}
        opacity={0.6}
        dash={[8, 4]}
      />
    </Group>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/field-renderer.tsx
git commit -m "feat: add football field renderer with yard lines, hashes, and LOS"
```

---

### Task 3: Player Node Component

**Files:**
- Create: `src/engine/player-node.tsx`

- [ ] **Step 1: Create `src/engine/player-node.tsx`**

```tsx
"use client";

import { Group, Circle, Text } from "react-konva";
import { FIELD } from "./constants";
import type { CanvasPlayer } from "./types";

interface PlayerNodeProps {
  player: CanvasPlayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export function PlayerNode({ player, isSelected, onSelect, onDragEnd }: PlayerNodeProps) {
  const fillColor = isSelected
    ? FIELD.COLORS.SELECTED
    : player.side === "offense"
    ? FIELD.COLORS.OFFENSE
    : FIELD.COLORS.DEFENSE;

  return (
    <Group
      x={player.x}
      y={player.y}
      draggable
      onClick={() => onSelect(player.id)}
      onTap={() => onSelect(player.id)}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(player.id, node.x(), node.y());
      }}
    >
      <Circle
        radius={FIELD.PLAYER_RADIUS}
        fill={fillColor}
        stroke={isSelected ? "#fff" : "transparent"}
        strokeWidth={2}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.3}
      />
      <Text
        text={player.label}
        fontSize={10}
        fontFamily="system-ui"
        fontStyle="bold"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        width={FIELD.PLAYER_RADIUS * 2}
        height={FIELD.PLAYER_RADIUS * 2}
        offsetX={FIELD.PLAYER_RADIUS}
        offsetY={FIELD.PLAYER_RADIUS}
      />
    </Group>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/player-node.tsx
git commit -m "feat: add draggable player node component with position labels"
```

---

### Task 4: Route Line Component

**Files:**
- Create: `src/engine/route-line.tsx`

- [ ] **Step 1: Create `src/engine/route-line.tsx`**

```tsx
"use client";

import { Group, Line, Arrow } from "react-konva";
import { FIELD } from "./constants";
import type { Route } from "./types";

interface RouteLineProps {
  route: Route;
  isSelected: boolean;
}

export function RouteLine({ route, isSelected }: RouteLineProps) {
  if (route.waypoints.length < 2) return null;

  // Flatten waypoints to [x1, y1, x2, y2, ...]
  const points = route.waypoints.flatMap((wp) => [wp.x, wp.y]);

  const strokeColor =
    route.type === "thick"
      ? FIELD.COLORS.ROUTE_BLOCK
      : route.type === "dashed"
      ? FIELD.COLORS.ROUTE_DASHED
      : FIELD.COLORS.ROUTE;

  const dash = route.type === "dashed" ? [8, 6] : undefined;
  const strokeWidth = route.type === "thick" ? 4 : isSelected ? 3 : 2;

  // Use Arrow for the last segment to get an arrowhead
  const lastTwo = points.slice(-4);
  const restPoints = points.slice(0, -2);

  return (
    <Group>
      {/* Main route line (all segments except last) */}
      {restPoints.length >= 4 && (
        <Line
          points={restPoints}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          tension={0.3}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {/* Last segment with arrowhead */}
      <Arrow
        points={lastTwo.length === 4 ? lastTwo : points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={strokeColor}
        dash={dash}
        tension={0}
        pointerLength={8}
        pointerWidth={6}
        lineCap="round"
      />
    </Group>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/route-line.tsx
git commit -m "feat: add route line component with bezier curves and arrowheads"
```

---

### Task 5: Serialization Module

**Files:**
- Create: `src/engine/serialization.ts`
- Test: `tests/engine/serialization.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/engine/serialization.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { serializeCanvas, deserializeCanvas, createEmptyCanvasData } from "@/engine/serialization";
import type { CanvasData } from "@/engine/types";

describe("serialization", () => {
  it("round-trips canvas data to JSON and back", () => {
    const data: CanvasData = {
      players: [
        { id: "QB", label: "QB", x: 500, y: 400, side: "offense" },
        { id: "WR1", label: "X", x: 180, y: 350, side: "offense" },
      ],
      routes: [
        {
          playerId: "WR1",
          waypoints: [
            { x: 180, y: 350 },
            { x: 180, y: 300 },
            { x: 250, y: 250 },
          ],
          type: "solid",
          routeType: "post",
        },
      ],
      meta: { formation: "shotgun-2x2", playType: "pass", side: "offense" },
    };

    const json = serializeCanvas(data);
    const parsed = deserializeCanvas(json);

    expect(parsed).toEqual(data);
  });

  it("creates valid empty canvas data", () => {
    const empty = createEmptyCanvasData();
    expect(empty.players).toEqual([]);
    expect(empty.routes).toEqual([]);
    expect(empty.meta.formation).toBe("");
    expect(empty.meta.playType).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    const result = deserializeCanvas(null);
    expect(result.players).toEqual([]);
  });

  it("handles malformed JSON gracefully", () => {
    const result = deserializeCanvas("not-json");
    expect(result.players).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/engine/serialization.test.ts
```

- [ ] **Step 3: Create `src/engine/serialization.ts`**

```typescript
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
  if (!json) return createEmptyCanvasData();

  try {
    const data = typeof json === "string" ? JSON.parse(json) : json;

    if (!data || typeof data !== "object") return createEmptyCanvasData();

    return {
      players: Array.isArray(data.players) ? data.players : [],
      routes: Array.isArray(data.routes) ? data.routes : [],
      meta: {
        formation: data.meta?.formation ?? "",
        playType: data.meta?.playType ?? "",
        side: data.meta?.side ?? "offense",
      },
    };
  } catch {
    return createEmptyCanvasData();
  }
}

export function serializeAnimation(data: AnimationData): string {
  return JSON.stringify(data);
}

export function deserializeAnimation(json: unknown): AnimationData {
  if (!json) return createEmptyAnimationData();

  try {
    const data = typeof json === "string" ? JSON.parse(json) : json;

    if (!data || typeof data !== "object") return createEmptyAnimationData();

    return {
      keyframes: Array.isArray(data.keyframes) ? data.keyframes : [],
      duration: typeof data.duration === "number" ? data.duration : 3,
      ballFlight: data.ballFlight ?? undefined,
    };
  } catch {
    return createEmptyAnimationData();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/engine/serialization.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/serialization.ts tests/engine/serialization.test.ts
git commit -m "feat: add canvas serialization with round-trip and error handling"
```

---

### Task 6: Play Canvas (Main Composed Component)

**Files:**
- Create: `src/engine/play-canvas.tsx`

- [ ] **Step 1: Create `src/engine/play-canvas.tsx`**

This is the main component that composes the field, players, and routes into an interactive canvas.

```tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { FieldRenderer } from "./field-renderer";
import { PlayerNode } from "./player-node";
import { RouteLine } from "./route-line";
import { FIELD } from "./constants";
import type { CanvasData, CanvasPlayer, Route, RouteWaypoint } from "./types";

interface PlayCanvasProps {
  canvasData: CanvasData;
  onChange: (data: CanvasData) => void;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  drawingRoute: boolean;
  readOnly?: boolean;
}

export function PlayCanvas({
  canvasData,
  onChange,
  selectedPlayerId,
  onSelectPlayer,
  drawingRoute,
  readOnly = false,
}: PlayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: FIELD.WIDTH, height: FIELD.HEIGHT });

  // Resize handler
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handlePlayerDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      // Scale coordinates back to canvas space
      const scaleX = FIELD.WIDTH / dimensions.width;
      const scaleY = FIELD.HEIGHT / dimensions.height;
      const canvasX = x * scaleX;
      const canvasY = y * scaleY;

      const updatedPlayers = canvasData.players.map((p) =>
        p.id === id ? { ...p, x: canvasX, y: canvasY } : p
      );
      onChange({ ...canvasData, players: updatedPlayers });
    },
    [canvasData, onChange, dimensions, readOnly]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (readOnly) return;

      // If clicking the stage background (not a player), handle route drawing or deselect
      const clickedOnEmpty = e.target === e.target.getStage();

      if (drawingRoute && selectedPlayerId && clickedOnEmpty) {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Scale to canvas coordinates
        const scaleX = FIELD.WIDTH / dimensions.width;
        const scaleY = FIELD.HEIGHT / dimensions.height;
        const canvasX = pos.x * scaleX;
        const canvasY = pos.y * scaleY;

        const existingRoute = canvasData.routes.find(
          (r) => r.playerId === selectedPlayerId
        );

        let updatedRoutes: Route[];
        if (existingRoute) {
          updatedRoutes = canvasData.routes.map((r) =>
            r.playerId === selectedPlayerId
              ? { ...r, waypoints: [...r.waypoints, { x: canvasX, y: canvasY }] }
              : r
          );
        } else {
          // Start from player position
          const player = canvasData.players.find((p) => p.id === selectedPlayerId);
          if (!player) return;
          const newRoute: Route = {
            playerId: selectedPlayerId,
            waypoints: [
              { x: player.x, y: player.y },
              { x: canvasX, y: canvasY },
            ],
            type: "solid",
          };
          updatedRoutes = [...canvasData.routes, newRoute];
        }
        onChange({ ...canvasData, routes: updatedRoutes });
      } else if (clickedOnEmpty) {
        onSelectPlayer(null);
      }
    },
    [canvasData, onChange, selectedPlayerId, drawingRoute, dimensions, onSelectPlayer, readOnly]
  );

  const scaleX = dimensions.width / FIELD.WIDTH;
  const scaleY = dimensions.height / FIELD.HEIGHT;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl bg-[#1a3a1a]">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ cursor: drawingRoute ? "crosshair" : "default" }}
      >
        <Layer>
          <FieldRenderer width={dimensions.width} height={dimensions.height} />
        </Layer>
        <Layer scaleX={scaleX} scaleY={scaleY}>
          {/* Routes (behind players) */}
          {canvasData.routes.map((route) => (
            <RouteLine
              key={route.playerId}
              route={route}
              isSelected={route.playerId === selectedPlayerId}
            />
          ))}
          {/* Player nodes */}
          {canvasData.players.map((player) => (
            <PlayerNode
              key={player.id}
              player={player}
              isSelected={player.id === selectedPlayerId}
              onSelect={readOnly ? () => {} : onSelectPlayer}
              onDragEnd={handlePlayerDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/play-canvas.tsx
git commit -m "feat: add main play canvas component with field, players, and route drawing"
```

---

### Task 7: Select UI Component

**Files:**
- Create: `src/components/ui/select.tsx`

- [ ] **Step 1: Create `src/components/ui/select.tsx`**

```tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "feat: add Select UI component"
```

---

### Task 8: Designer Page UI (Formation Picker, Assignment Panel, Toolbar)

**Files:**
- Create: `src/components/play/formation-picker.tsx`, `src/components/play/assignment-panel.tsx`, `src/components/play/play-toolbar.tsx`, `src/components/play/play-card.tsx`

- [ ] **Step 1: Create `src/components/play/formation-picker.tsx`**

```tsx
"use client";

import { FORMATIONS } from "@/engine/constants";
import type { FormationTemplate } from "@/engine/types";
import { cn } from "@/lib/utils";

interface FormationPickerProps {
  side: "offense" | "defense";
  selectedId: string | null;
  onSelect: (formation: FormationTemplate) => void;
}

export function FormationPicker({ side, selectedId, onSelect }: FormationPickerProps) {
  const formations = FORMATIONS.filter((f) => f.side === side);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {side === "offense" ? "Offensive" : "Defensive"} Formations
      </h3>
      <div className="space-y-1">
        {formations.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              f.id === selectedId
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/play/assignment-panel.tsx`**

```tsx
"use client";

import type { CanvasPlayer, Route } from "@/engine/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface AssignmentPanelProps {
  player: CanvasPlayer | null;
  route: Route | undefined;
  onClose: () => void;
  onDeleteRoute: (playerId: string) => void;
  onUpdateRouteType: (playerId: string, type: "solid" | "dashed" | "thick") => void;
}

const ROUTE_TYPES = [
  "slant", "out", "in", "corner", "post", "go", "curl", "dig",
  "flat", "wheel", "seam", "drag", "hitch", "fade",
];

export function AssignmentPanel({ player, route, onClose, onDeleteRoute, onUpdateRouteType }: AssignmentPanelProps) {
  if (!player) return null;

  return (
    <div className="w-72 border-l border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          {player.label} — {player.id}
        </h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Position</label>
          <Input value={player.label} readOnly className="text-sm" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">Side</label>
          <Input value={player.side} readOnly className="text-sm capitalize" />
        </div>

        {route && (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">Line Style</label>
              <Select
                value={route.type}
                onChange={(e) =>
                  onUpdateRouteType(player.id, e.target.value as "solid" | "dashed" | "thick")
                }
              >
                <option value="solid">Solid (Route)</option>
                <option value="dashed">Dashed (Option)</option>
                <option value="thick">Thick (Block)</option>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">Route Type</label>
              <Select defaultValue={route.routeType ?? ""}>
                <option value="">Auto-detect</option>
                {ROUTE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt.charAt(0).toUpperCase() + rt.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => onDeleteRoute(player.id)}
            >
              Delete Route
            </Button>
          </>
        )}

        {!route && (
          <p className="text-xs text-zinc-500">
            Select this player and click on the field with route drawing mode to add a route.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/play/play-toolbar.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Save, Pencil, MousePointer, Undo2 } from "lucide-react";

interface PlayToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  formation: string;
  playType: string;
  onPlayTypeChange: (type: string) => void;
  drawingRoute: boolean;
  onToggleDrawing: () => void;
  onSave: () => void;
  onUndo: () => void;
  saving: boolean;
  dirty: boolean;
}

export function PlayToolbar({
  name,
  onNameChange,
  formation,
  playType,
  onPlayTypeChange,
  drawingRoute,
  onToggleDrawing,
  onSave,
  onUndo,
  saving,
  dirty,
}: PlayToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Play name..."
        className="w-48 text-sm font-semibold"
      />

      <div className="text-xs text-zinc-500 px-2">{formation || "No formation"}</div>

      <Select
        value={playType}
        onChange={(e) => onPlayTypeChange(e.target.value)}
        className="w-32"
      >
        <option value="pass">Pass</option>
        <option value="run">Run</option>
        <option value="play_action">Play Action</option>
        <option value="screen">Screen</option>
        <option value="special">Special</option>
      </Select>

      <div className="flex-1" />

      <Button
        variant={drawingRoute ? "default" : "outline"}
        size="sm"
        onClick={onToggleDrawing}
      >
        {drawingRoute ? (
          <>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Drawing
          </>
        ) : (
          <>
            <MousePointer className="mr-1.5 h-3.5 w-3.5" /> Select
          </>
        )}
      </Button>

      <Button variant="ghost" size="icon" onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
        <Save className="mr-1.5 h-3.5 w-3.5" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/play/play-card.tsx`**

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlayCardProps {
  id: string;
  name: string;
  formation: string;
  playType: string;
  thumbnailUrl?: string | null;
}

export function PlayCard({ id, name, formation, playType, thumbnailUrl }: PlayCardProps) {
  return (
    <Link href={`/designer?playId=${id}`}>
      <Card className="group cursor-pointer transition-colors hover:border-zinc-600">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-[#1a3a1a]">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-green-700">
              No preview
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
            {name}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-zinc-500">{formation}</span>
            <Badge variant="outline">{playType}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/play/ src/components/ui/select.tsx
git commit -m "feat: add formation picker, assignment panel, play toolbar, and play card"
```

---

### Task 9: Server Actions for Playbook & Play CRUD

**Files:**
- Create: `src/lib/actions/playbook-actions.ts`, `src/lib/actions/play-actions.ts`

- [ ] **Step 1: Create `src/lib/actions/playbook-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateInviteCode } from "@/lib/utils";

export async function getPlaybooks(orgId: string) {
  return db.playbook.findMany({
    where: { orgId },
    include: { _count: { select: { plays: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPlaybook(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = formData.get("name") as string;
  const side = formData.get("side") as string;
  const orgId = formData.get("orgId") as string;

  if (!name || !side || !orgId) {
    throw new Error("Missing required fields");
  }

  const playbook = await db.playbook.create({
    data: {
      name,
      side: side as "offense" | "defense" | "special_teams",
      orgId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/playbooks");
  return playbook;
}

export async function deletePlaybook(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.playbook.delete({ where: { id } });
  revalidatePath("/playbooks");
}
```

- [ ] **Step 2: Create `src/lib/actions/play-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getPlay(id: string) {
  return db.play.findUnique({
    where: { id },
    include: { assignments: true, playbook: true },
  });
}

export async function getPlaysByPlaybook(playbookId: string) {
  return db.play.findMany({
    where: { playbookId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPlay(data: {
  playbookId: string;
  name: string;
  formation: string;
  playType: string;
  canvasData: unknown;
  animationData?: unknown;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const play = await db.play.create({
    data: {
      playbookId: data.playbookId,
      name: data.name,
      formation: data.formation,
      playType: data.playType as "run" | "pass" | "play_action" | "screen" | "special",
      canvasData: data.canvasData ?? {},
      animationData: data.animationData ?? {},
      notes: data.notes,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/playbooks/${data.playbookId}`);
  return play;
}

export async function updatePlay(
  id: string,
  data: {
    name?: string;
    formation?: string;
    playType?: string;
    canvasData?: unknown;
    animationData?: unknown;
    notes?: string;
    situationTags?: string[];
  }
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const play = await db.play.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.formation !== undefined && { formation: data.formation }),
      ...(data.playType !== undefined && {
        playType: data.playType as "run" | "pass" | "play_action" | "screen" | "special",
      }),
      ...(data.canvasData !== undefined && { canvasData: data.canvasData }),
      ...(data.animationData !== undefined && { animationData: data.animationData }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.situationTags !== undefined && { situationTags: data.situationTags }),
    },
  });

  revalidatePath(`/designer`);
  return play;
}

export async function deletePlay(id: string, playbookId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.play.delete({ where: { id } });
  revalidatePath(`/playbooks/${playbookId}`);
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/
git commit -m "feat: add server actions for playbook and play CRUD"
```

---

### Task 10: Play Designer Page

**Files:**
- Create: `src/app/(coach)/designer/page.tsx`

- [ ] **Step 1: Create `src/app/(coach)/designer/page.tsx`**

This is the full-screen play designer page that composes all the pieces together.

```tsx
"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { PlayToolbar } from "@/components/play/play-toolbar";
import { FormationPicker } from "@/components/play/formation-picker";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import { createEmptyCanvasData } from "@/engine/serialization";
import { FIELD } from "@/engine/constants";
import type { CanvasData, FormationTemplate, Route } from "@/engine/types";

// Dynamic import to avoid SSR issues with Konva
const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Loading canvas...</div> }
);

export default function DesignerPage() {
  const [canvasData, setCanvasData] = useState<CanvasData>(createEmptyCanvasData());
  const [playName, setPlayName] = useState("");
  const [playType, setPlayType] = useState("pass");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [history, setHistory] = useState<CanvasData[]>([]);

  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      setHistory((prev) => [...prev.slice(-19), canvasData]);
      setCanvasData(data);
      setDirty(true);
    },
    [canvasData]
  );

  const handleFormationSelect = useCallback(
    (formation: FormationTemplate) => {
      const newData: CanvasData = {
        players: formation.players.map((p) => ({ ...p })),
        routes: [],
        meta: {
          formation: formation.name,
          playType,
          side: formation.side,
        },
      };
      handleCanvasChange(newData);
      setSide(formation.side);
      setSelectedPlayerId(null);
      setDrawingRoute(false);
    },
    [playType, handleCanvasChange]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCanvasData(prev);
  }, [history]);

  const handleDeleteRoute = useCallback(
    (playerId: string) => {
      handleCanvasChange({
        ...canvasData,
        routes: canvasData.routes.filter((r) => r.playerId !== playerId),
      });
    },
    [canvasData, handleCanvasChange]
  );

  const handleUpdateRouteType = useCallback(
    (playerId: string, type: "solid" | "dashed" | "thick") => {
      handleCanvasChange({
        ...canvasData,
        routes: canvasData.routes.map((r) =>
          r.playerId === playerId ? { ...r, type } : r
        ),
      });
    },
    [canvasData, handleCanvasChange]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    // For now, log to console. Actual save will use server actions with a playbook context.
    console.log("Saving play:", { name: playName, playType, canvasData });
    setSaving(false);
    setDirty(false);
  }, [playName, playType, canvasData]);

  const selectedPlayer = canvasData.players.find((p) => p.id === selectedPlayerId) ?? null;
  const selectedRoute = selectedPlayerId
    ? canvasData.routes.find((r) => r.playerId === selectedPlayerId)
    : undefined;

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-[var(--background)]">
      <PlayToolbar
        name={playName}
        onNameChange={setPlayName}
        formation={canvasData.meta.formation}
        playType={playType}
        onPlayTypeChange={setPlayType}
        drawingRoute={drawingRoute}
        onToggleDrawing={() => setDrawingRoute(!drawingRoute)}
        onSave={handleSave}
        onUndo={handleUndo}
        saving={saving}
        dirty={dirty}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Formation picker */}
        <div className="hidden lg:block w-56 overflow-y-auto border-r border-zinc-800 bg-zinc-900/30 p-4 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSide("offense")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                side === "offense"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Offense
            </button>
            <button
              onClick={() => setSide("defense")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                side === "defense"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Defense
            </button>
          </div>
          <FormationPicker
            side={side}
            selectedId={canvasData.meta.formation ? undefined : null}
            onSelect={handleFormationSelect}
          />
        </div>

        {/* Canvas area */}
        <div className="flex-1 p-4">
          <PlayCanvas
            canvasData={canvasData}
            onChange={handleCanvasChange}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            drawingRoute={drawingRoute}
          />
        </div>

        {/* Right panel: Assignment details */}
        {selectedPlayerId && (
          <AssignmentPanel
            player={selectedPlayer}
            route={selectedRoute}
            onClose={() => setSelectedPlayerId(null)}
            onDeleteRoute={handleDeleteRoute}
            onUpdateRouteType={handleUpdateRouteType}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/designer/page.tsx
git commit -m "feat: add play designer page with canvas, formation picker, and assignment panel"
```

---

### Task 11: Playbook Pages (List + Detail)

**Files:**
- Create: `src/app/(coach)/playbooks/page.tsx`, `src/app/(coach)/playbooks/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/(coach)/playbooks/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getPlaybooks } from "@/lib/actions/playbook-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const playbooks = await getPlaybooks(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks</h1>
          <p className="text-sm text-zinc-500">{playbooks.length} playbook{playbooks.length !== 1 ? "s" : ""}</p>
        </div>
        {/* TODO: Add create playbook modal */}
      </div>

      {playbooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500">No playbooks yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((pb) => (
            <Link key={pb.id} href={`/playbooks/${pb.id}`}>
              <Card className="group cursor-pointer transition-colors hover:border-zinc-600">
                <CardHeader>
                  <CardTitle className="group-hover:text-indigo-400 transition-colors">
                    {pb.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge>{pb.side}</Badge>
                    <span className="text-xs text-zinc-500">
                      {pb._count.plays} play{pb._count.plays !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(coach)/playbooks/[id]/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPlaysByPlaybook } from "@/lib/actions/play-actions";
import { PlayCard } from "@/components/play/play-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlaybookDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const playbook = await db.playbook.findUnique({ where: { id } });
  if (!playbook) notFound();

  const plays = await getPlaysByPlaybook(id);

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/playbooks"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Playbooks
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{playbook.name}</h1>
            <p className="text-sm text-zinc-500">
              {plays.length} play{plays.length !== 1 ? "s" : ""} · {playbook.side}
            </p>
          </div>
          <Link href={`/designer?playbookId=${id}`}>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Play
            </Button>
          </Link>
        </div>
      </div>

      {plays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-zinc-500 mb-4">No plays yet.</p>
            <Link href={`/designer?playbookId=${id}`}>
              <Button size="sm">Create First Play</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plays.map((play) => (
            <PlayCard
              key={play.id}
              id={play.id}
              name={play.name}
              formation={play.formation}
              playType={play.playType}
              thumbnailUrl={play.thumbnailUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(coach\)/playbooks/
git commit -m "feat: add playbook list and detail pages with play grid"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: All tests pass (original 9 + new engine tests).

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run linting**

```bash
npm run lint
```

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

---

## Phase 2 Summary

After completing Phase 2, you have:

- ✅ Canvas engine with football field renderer, draggable player nodes, route drawing with arrowheads
- ✅ 10 formation templates (6 offense + 4 defense), each with 11 players
- ✅ Canvas serialization (JSON round-trip with error handling)
- ✅ Full-screen play designer page with formation picker, canvas, assignment panel
- ✅ Play toolbar with name, play type, drawing mode toggle, undo, save
- ✅ Server actions for playbook and play CRUD
- ✅ Playbook list and detail pages with play card grid
- ✅ Select UI component

**Next: Phase 3 — Learning System (Quizzes, Spaced Repetition, Player Progress)**
