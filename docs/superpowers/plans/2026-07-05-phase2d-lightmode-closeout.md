# PlayForge Phase 2d — Light Mode Ships + Phase Close-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return the theme toggle to app chrome, tune the light palette to WCAG AA, centralize the engine's leaked inline hexes, and run the Phase 2 dark+light QA close-out.

**Architecture:** This is the final slice of Phase 2. It assumes plans 2a (foundation: `@theme inline`, `@custom-variant dark`, pre-hydration script, new tokens `--primary-emphasis`/`--surface-1`/`--surface-2`/`--offense`/`--defense`, the `use-keyboard-shortcuts` hazard fix) and 2b/2c (every component and page migrated onto tokens) have landed. With components already token-driven, light mode "just works" except for a handful of light color *values* that fail contrast; this plan fixes those values, re-exposes the existing `ThemeToggle`, silos the canvas palette, and verifies the whole surface in both themes. No layout, effects, or dependencies change.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS v4 (`@theme inline` tokens), CVA + `cn()` for variants, Radix primitives, Konva/react-konva for the canvas engine, Vitest + Testing Library + jsdom for tests, Docker Compose dev DB with seeded accounts.

## Global Constraints

Every task's requirements implicitly include these (copied from the approved spec `docs/superpowers/specs/2026-07-05-phase2-design-system-design.md`):

- **No new npm dependencies.** Use what `package.json` already ships.
- **Dark remains the default theme.** The root `<html>` defaults to `dark`; light is opt-in via the toggle / `localStorage["playforge-theme"]`.
- **Do not redesign light mode beyond contrast-correct token values.** No new layout, spacing, or effects — only adjust `.light` palette *values* where they fail WCAG AA.
- **`dark:` utilities are class-driven** (2a added `@custom-variant dark (&:where(.dark, .dark *))`), not `prefers-color-scheme`. A bare `dark:` utility now follows the app's `.dark` class.
- **Engine palette stays parallel and siloed.** Canvas colors live in `FIELD.COLORS` (Konva), never bridged to CSS tokens in Phase 2.
- **No `indigo-`, `violet-`, or `blue-` classes** remain in `src/app` or `src/components` (engine excluded). `zinc-`/`slate-`/`gray-` only in an agreed allowlist.
- **Verification contract, every task:** `npm run test:run` green (115 baseline + new tests), `npx tsc --noEmit` clean, `npm run lint` with **no new errors** (baseline is play-canvas.tsx's parked errors only; `use-keyboard-shortcuts.ts` was cleared in 2a), `npm run build` succeeds.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/components/ui/theme-toggle.tsx` | Token-styled theme cycle button (fix hardcoded `zinc` + redundant `dark:`) | 1 |
| `tests/components/theme-toggle.test.tsx` | **Create.** Pin cycle logic + token styling of the toggle | 1 |
| `src/app/(coach)/layout.tsx` | Re-add `<ThemeToggle />` to coach header | 1 |
| `src/components/layout/coach-sidebar.tsx` | Re-add Tooltip-wrapped `<ThemeToggle />` to sidebar footer | 1 |
| `src/app/(player)/layout.tsx` | Re-add `<ThemeToggle />` to player header | 1 |
| `src/app/globals.css` | Tune `.light` `--offense`/`--defense` to AA; ensure `--primary-emphasis` present in `.light` | 2 |
| `tests/lib/contrast.test.ts` | **Create.** Parse the committed `.light` palette and assert AA for named pairs | 2 |
| `src/engine/constants.ts` | Add named `FIELD.COLORS` entries for the leaked inline hexes | 3 |
| `src/engine/route-line.tsx` | Reference `FIELD.COLORS.ROUTE_SELECTED` / `ROUTE_GLOW_DEFENSE` | 3 |
| `src/engine/player-node.tsx` | Reference `FIELD.COLORS.PLAYER_RING_SELECTED` / `PLAYER_LABEL` | 3 |
| `src/engine/read-indicator.tsx` | Reference `FIELD.COLORS.SELECTED` / `SELECTED_GLOW` / `READ_ACTIVE_TEXT` | 3 |
| `src/engine/motion-arrow.tsx` | Reference `FIELD.COLORS.MOTION` | 3 |
| `src/engine/ball.tsx` | Reference `FIELD.COLORS.BALL_BODY` / `BALL_STROKE` | 3 |
| (no file) Phase close-out QA | Grep gates, dark+light route walk, final verification quartet | 4 |

---

## Task 1: Restore the theme toggle to app chrome

Phase 1 hid `ThemeToggle` in every chrome surface (commit `3fd6cd8`) because light mode was structurally broken. With tokens live, it returns. The component itself still hardcodes `zinc` classes and carries redundant `dark:` duplicates left over from the OS-media era; those are fixed here so the toggle looks right in *both* themes. The sun/moon/monitor icon logic reads the `theme` **value** (not a `dark:` utility), so 2a's class-driven `dark:` change does not affect it — only the styling classes need work.

**Files:**
- Modify: `src/components/ui/theme-toggle.tsx`
- Create: `tests/components/theme-toggle.test.tsx`
- Modify: `src/app/(coach)/layout.tsx`
- Modify: `src/components/layout/coach-sidebar.tsx`
- Modify: `src/app/(player)/layout.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `@/components/theme-provider` returning `{ theme: "dark"|"light"|"system"; setTheme: (t) => void }` (exists since Phase 1). `ThemeToggle` is a default-styled `<button>` with no props.
- Produces: `<ThemeToggle />` mounted in coach header, coach sidebar footer, and player header. No new exports or prop changes.

- [ ] **Step 1: Write the failing test** — `tests/components/theme-toggle.test.tsx`

The test mocks `@/components/theme-provider` (do **not** mount the real `ThemeProvider`: its `getSystemTheme()` calls `window.matchMedia`, which jsdom does not implement — cycling into `system` would throw a `TypeError` instead of asserting). Mocking `useTheme` isolates the cycle logic and the token styling.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { setTheme, state } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  state: { theme: "dark" as "dark" | "light" | "system" },
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: state.theme, setTheme }),
}));

import { ThemeToggle } from "@/components/ui/theme-toggle";

beforeEach(() => {
  setTheme.mockClear();
  state.theme = "dark";
});

describe("ThemeToggle cycle", () => {
  it("labels the current theme (Dark) and advances dark -> light", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Theme: Dark");
    fireEvent.click(btn);
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("advances light -> system", () => {
    state.theme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Theme: Light");
    fireEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("wraps system -> dark", () => {
    state.theme = "system";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Theme: System");
    fireEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});

describe("ThemeToggle styling", () => {
  it("uses theme tokens, not hardcoded zinc or redundant dark: variants", () => {
    render(<ThemeToggle />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-muted-foreground");
    expect(cls).toContain("hover:bg-secondary");
    expect(cls).toContain("hover:text-foreground");
    expect(cls).not.toMatch(/zinc-/);
    expect(cls).not.toMatch(/\bdark:/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/components/theme-toggle.test.tsx`
Expected: the three "cycle" tests PASS (logic already correct), the "styling" test FAILS — current className contains `text-zinc-400` and `dark:hover:*`.

- [ ] **Step 3: Fix the toggle's className to use tokens** — `src/components/ui/theme-toggle.tsx`

Replace the `<button>`'s `className` only. Leave imports, the `CYCLE` array, `next()`, and the `Icon`/`label` logic exactly as they are.

Replace:
```tsx
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white dark:hover:bg-zinc-800 dark:hover:text-white"
```
With:
```tsx
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
```

Rationale: `text-zinc-400 → text-muted-foreground`, `hover:bg-zinc-800 → hover:bg-secondary`, `hover:text-white → hover:text-foreground` (per the Phase 2 neutral-sweep table). The `dark:hover:*` pair was an OS-media-era duplicate; with tokens it is pure redundancy (and in light mode the old base `hover:bg-zinc-800` would paint a dark chip). Dropped.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/components/theme-toggle.test.tsx`
Expected: all four tests PASS.

- [ ] **Step 5: Re-add `<ThemeToggle />` to the coach header** — `src/app/(coach)/layout.tsx`

Add the import beside the other `@/components` imports:
```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
```
Then, in the header's right-side action group, place the toggle before `UserMenu`. Anchor on the `<UserMenu user={session.user} />` element (its wrapping `flex items-center gap-2` div is structural and survives the 2b sweep; do not anchor on the header's color classes, which 2b rewrote):
```tsx
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={session.user} />
          </div>
```

- [ ] **Step 6: Re-add the Tooltip-wrapped `<ThemeToggle />` to the sidebar footer** — `src/components/layout/coach-sidebar.tsx`

Add the import beside `NotificationBell`:
```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
```
In the footer group, insert a second `Tooltip` after the existing `NotificationBell` one (restores the exact markup Phase 1 removed; the local `Tooltip` helper and `collapsed` prop already exist in this file). Anchor on the `<Tooltip label="Notifications" show={collapsed}>` block; update the section comment:
```tsx
      {/* Notifications & theme */}
      <div className="space-y-1 border-t border-white/8 px-3 py-3">
        <Tooltip label="Notifications" show={collapsed}>
          <NotificationBell incoming={notifications} />
        </Tooltip>
        <Tooltip label="Toggle theme" show={collapsed}>
          <ThemeToggle />
        </Tooltip>
      </div>
```
(If 2b already tokenized `border-white/8` on this wrapper, keep whatever class 2b left — only the second `Tooltip` block is 2d's addition.)

- [ ] **Step 7: Re-add `<ThemeToggle />` to the player header** — `src/app/(player)/layout.tsx`

Add the import beside the other `@/components` imports:
```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";
```
Place the toggle between `NotificationBell` and `UserMenu` (its Phase 1 position). Anchor on the `<NotificationBell incoming={notifications} />` / `<UserMenu user={session.user} />` pair:
```tsx
        <div className="flex items-center gap-2">
          <NotificationBell incoming={notifications} />
          <ThemeToggle />
          <UserMenu user={session.user} />
        </div>
```

- [ ] **Step 8: Run the full verification quartet**

Run:
```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tests green (incl. the 4 new toggle tests), `tsc` clean, lint with no new errors, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/theme-toggle.tsx tests/components/theme-toggle.test.tsx "src/app/(coach)/layout.tsx" src/components/layout/coach-sidebar.tsx "src/app/(player)/layout.tsx"
git commit -m "feat: restore ThemeToggle to chrome and migrate it to tokens"
```

---

## Task 2: Light-mode contrast pass (AA)

With everything token-driven, audit the `.light` palette against WCAG AA (4.5:1 for normal text) for the pairs the spec names. Measured ratios against the current committed `.light` values (computed with the standard sRGB-luminance formula):

| Pair | Colors | Ratio | AA? |
|---|---|---|---|
| foreground on background | `#10201d` on `#f4f5ef` | 15.37 | ✅ |
| foreground on card | `#10201d` on `#ffffff` | 16.85 | ✅ |
| muted-foreground on background | `#5e746d` on `#f4f5ef` | 4.57 | ✅ (thin) |
| muted-foreground on card | `#5e746d` on `#ffffff` | 5.01 | ✅ |
| primary-foreground on primary | `#ffffff` on `#0f766e` | 5.47 | ✅ |
| primary-emphasis on background | `#0f766e` on `#f4f5ef` | 4.99 | ✅ |
| accent on background | `#b45309` on `#f4f5ef` | 4.58 | ✅ (thin) |
| accent on card | `#b45309` on `#ffffff` | 5.02 | ✅ |
| **offense on background** | `#3b82f6` on `#f4f5ef` | **3.35** | ❌ |
| **offense on card** | `#3b82f6` on `#ffffff` | **3.68** | ❌ |
| **defense on background** | `#ef4444` on `#f4f5ef` | **3.43** | ❌ |
| **defense on card** | `#ef4444` on `#ffffff` | **3.76** | ❌ |

**Only `--offense` and `--defense` fail** (their 2a values are the canvas blue/red, tuned for dark surfaces, not for text on a light ground). Fix — **light values only**; the dark `:root` values stay `#3b82f6`/`#ef4444` to keep matching the canvas:

- `--offense` (light) → `#1d4ed8` (blue-700): on background **6.11**, on card **6.70**, white-on-offense **6.70**.
- `--defense` (light) → `#b91c1c` (red-700): on background **5.90**, on card **6.47**, white-on-defense **6.47**.

Both keep an unmistakably blue/red hue while clearing AA in either badge design (colored-text-on-surface **or** white-text-on-fill — 2b owns which; the test pins both). `muted-foreground` (4.57) and `accent` (4.58) pass and are **left unchanged** — the spec says "darken *if not* ≥4.5"; nudging passing values would be the redesign the constraints forbid.

**Files:**
- Modify: `src/app/globals.css` (the `.light` block only)
- Create: `tests/lib/contrast.test.ts`

**Interfaces:**
- Consumes: the `.light` custom-property block in `globals.css`, which after 2a contains (at least) `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--accent`, `--primary-emphasis`, `--offense`, `--defense`.
- Produces: an AA-clean `.light` palette; a pure test asserting it. No exports.

- [ ] **Step 1: Write the failing test** — `tests/lib/contrast.test.ts`

The test reads the *committed* `.light` block from `globals.css` (so it pins the real palette, not a copy) and asserts AA. The parser matches hex tokens only, skipping any gradient/`rgba` props 2a added, and **throws a readable error** if a token the test needs is absent (a missing `--primary-emphasis` in `.light` would otherwise surface as an opaque `NaN` failure).

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** sRGB relative luminance per WCAG 2.x */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio in [1, 21] */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Parse the committed `.light` palette (hex tokens only) from globals.css */
function readLightPalette(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const block = css.match(/\.light\s*\{([^}]*)\}/)?.[1] ?? "";
  const vars: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[m[1]] = m[2];
  }
  return vars;
}

const p = readLightPalette();

function token(name: string): string {
  const v = p[name];
  if (!v) throw new Error(`missing --${name} (hex) in .light palette of globals.css`);
  return v;
}

const AA = 4.5; // normal-size text

describe("light palette meets WCAG AA (4.5:1) for core text pairs", () => {
  it("foreground on background", () =>
    void expect(contrast(token("foreground"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("foreground on card", () =>
    void expect(contrast(token("card-foreground"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("muted-foreground on background", () =>
    void expect(contrast(token("muted-foreground"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("muted-foreground on card", () =>
    void expect(contrast(token("muted-foreground"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("primary-foreground on primary", () =>
    void expect(contrast(token("primary-foreground"), token("primary"))).toBeGreaterThanOrEqual(AA));
  it("primary-emphasis on background", () =>
    void expect(contrast(token("primary-emphasis"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("accent on background", () =>
    void expect(contrast(token("accent"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("accent on card", () =>
    void expect(contrast(token("accent"), token("card"))).toBeGreaterThanOrEqual(AA));
});

describe("offense/defense badge text meets AA in either badge design", () => {
  // colored-text-on-surface (tinted-bg badge)
  it("offense on background", () =>
    void expect(contrast(token("offense"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("offense on card", () =>
    void expect(contrast(token("offense"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("defense on background", () =>
    void expect(contrast(token("defense"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("defense on card", () =>
    void expect(contrast(token("defense"), token("card"))).toBeGreaterThanOrEqual(AA));
  // white-text-on-fill (solid badge)
  it("white on offense", () =>
    void expect(contrast("#ffffff", token("offense"))).toBeGreaterThanOrEqual(AA));
  it("white on defense", () =>
    void expect(contrast("#ffffff", token("defense"))).toBeGreaterThanOrEqual(AA));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/contrast.test.ts`
Expected: the four offense/defense "on surface" assertions FAIL (~3.3–3.8 < 4.5). Every other pair PASSES. (If instead you get a `missing --primary-emphasis` / `missing --offense` throw, 2a did not add that token to `.light` — Step 3 fixes it.)

- [ ] **Step 3: Adjust the `.light` values** — `src/app/globals.css`

In the `.light { … }` block, set `--offense` and `--defense` to the AA values, and ensure `--primary-emphasis` is present with its spec'd light value (2a should have added it; add it here if the Step 2 run reported it missing). Do **not** touch the `:root` (dark) block.

Target `.light` lines:
```css
  --primary-emphasis: #0f766e;
  --offense: #1d4ed8;
  --defense: #b91c1c;
```
(These replace whatever `--offense: #3b82f6;` / `--defense: #ef4444;` 2a wrote into `.light`. Leave `muted-foreground`, `accent`, and all other `.light` values as-is.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/contrast.test.ts`
Expected: all 14 assertions PASS.

- [ ] **Step 5: Run the full verification quartet**

Run:
```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: all green. (`npm run build` recompiles Tailwind; the `.light` change is value-only, no utility surface change.)

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tests/lib/contrast.test.ts
git commit -m "fix: tune light offense/defense tokens to WCAG AA + pin palette contrast test"
```

---

## Task 3: Centralize the engine's leaked inline hexes

The canvas keeps its own Konva palette (`FIELD.COLORS`), but several components hardcode hexes inline instead of naming them there. Move each into `FIELD.COLORS` with a named entry — **same rendered values, just centralized**. Read each component before editing; the engine palette is not bridged to CSS tokens (spec §6). The three existing engine test files (`tests/engine/constants.test.ts`, `export.test.ts`, `serialization.test.ts`) assert formations, stage export, and serialization — none reads `FIELD.COLORS`, so adding keys keeps them green.

Inventory (verified by reading each file):

| File | Inline literal(s) | New/existing `FIELD.COLORS` entry |
|---|---|---|
| `route-line.tsx` | `"#ffffff"` ×5 (selected route stroke/fill, lines ~73, 75, 128, 138, 140) | `ROUTE_SELECTED: "#ffffff"` (new) |
| `route-line.tsx` | `"rgba(252,165,165,0.3)"` ×1 (defense route glow, line ~37) | `ROUTE_GLOW_DEFENSE: "rgba(252,165,165,0.3)"` (new) |
| `player-node.tsx` | `"#ffffff"` selected ring (line ~24) | `PLAYER_RING_SELECTED: "#ffffff"` (new) |
| `player-node.tsx` | `"#ffffff"` label text (line ~164) | `PLAYER_LABEL: "#ffffff"` (new) |
| `read-indicator.tsx` | active `fill: "#f59e0b"` | reuse existing `SELECTED` |
| `read-indicator.tsx` | active `stroke`/`glowColor: "#fbbf24"` | reuse existing `SELECTED_GLOW` |
| `read-indicator.tsx` | active `text: "#000"` | `READ_ACTIVE_TEXT: "#000"` (new) |
| `motion-arrow.tsx` | `MOTION_COLOR = "#06b6d4"` | `MOTION: "#06b6d4"` (new) |
| `ball.tsx` | body `fill="#8B4513"`, `stroke="#5C2D0A"` | `BALL_BODY`/`BALL_STROKE` (new) |

Notes: the read-indicator's active gold is the same "attention gold" as a selected player (its past/future states are alpha variants of `#f59e0b`/`#fbbf24`), so it reuses `SELECTED`/`SELECTED_GLOW` rather than duplicating the literals — its `past`/`future` `rgba(...)` variants stay inline (spec scopes "×3": the three active values). `ROUTE_GLOW_DEFENSE` is a one-line completeness add beyond the spec's literal "`#ffffff`×5" — the offense glow already used a constant (`ROUTE_GLOW`) while defense was inline; naming it removes the asymmetry. `ball.tsx`'s white laces (`fill="white"`) stay inline (spec scopes "ball browns").

**Files:**
- Modify: `src/engine/constants.ts`
- Modify: `src/engine/route-line.tsx`
- Modify: `src/engine/player-node.tsx`
- Modify: `src/engine/read-indicator.tsx`
- Modify: `src/engine/motion-arrow.tsx`
- Modify: `src/engine/ball.tsx`

**Interfaces:**
- Consumes: the existing `FIELD` object from `@/engine/constants` (imported as `import { FIELD } from "./constants";`).
- Produces: new `FIELD.COLORS` keys — `ROUTE_SELECTED`, `ROUTE_GLOW_DEFENSE`, `PLAYER_RING_SELECTED`, `PLAYER_LABEL`, `READ_ACTIVE_TEXT`, `MOTION`, `BALL_BODY`, `BALL_STROKE` — all string literal hex/rgba values under the existing `as const`.

- [ ] **Step 1: Add the named entries to `FIELD.COLORS`** — `src/engine/constants.ts`

Inside the `COLORS: { … }` object (keep `as const`), add these keys (place after `PREVIEW_LINE`, before the closing `}` of `COLORS`):
```ts
    // Route / player accents (formerly inline literals)
    ROUTE_SELECTED: "#ffffff",
    ROUTE_GLOW_DEFENSE: "rgba(252,165,165,0.3)",
    PLAYER_RING_SELECTED: "#ffffff",
    PLAYER_LABEL: "#ffffff",
    // Read-indicator active-state number
    READ_ACTIVE_TEXT: "#000",
    // Motion arrow
    MOTION: "#06b6d4",
    // Ball
    BALL_BODY: "#8B4513",
    BALL_STROKE: "#5C2D0A",
```

- [ ] **Step 2: Point `route-line.tsx` at the named entries** — `src/engine/route-line.tsx`

`FIELD` is already imported. Replace the defense glow literal:
```tsx
  const glowColor =
    side === "offense"
      ? FIELD.COLORS.ROUTE_GLOW
      : FIELD.COLORS.ROUTE_GLOW_DEFENSE;
```
Then replace all five `"#ffffff"` occurrences (the `isSelected ? "#ffffff" : baseColor` stroke/fill expressions in both the 2-waypoint and multi-waypoint branches) with `FIELD.COLORS.ROUTE_SELECTED`, e.g.:
```tsx
          stroke={isSelected ? FIELD.COLORS.ROUTE_SELECTED : baseColor}
          fill={isSelected ? FIELD.COLORS.ROUTE_SELECTED : baseColor}
```
(Do the same for the `<Line>`/`<Arrow>` in the multi-waypoint branch — 5 replacements total. The `WAYPOINT` dots already use `FIELD.COLORS.WAYPOINT`; leave them.)

- [ ] **Step 3: Point `player-node.tsx` at the named entries** — `src/engine/player-node.tsx`

`FIELD` is already imported. In `getPlayerColors`'s selected branch, replace the ring literal:
```tsx
      ring: FIELD.COLORS.PLAYER_RING_SELECTED,
```
In the label `<Text>`, replace `fill="#ffffff"`:
```tsx
        fill={FIELD.COLORS.PLAYER_LABEL}
```
(Leave the non-selected `ring: "rgba(255,255,255,0.3)"` values — those are alpha rings, not the pure `#ffffff` in scope.)

- [ ] **Step 4: Point `read-indicator.tsx` at the named entries** — `src/engine/read-indicator.tsx`

Add the import (this file does not currently import `FIELD`):
```tsx
import { FIELD } from "./constants";
```
In the `colors.active` object, replace the three active literals:
```tsx
    active: {
      fill: FIELD.COLORS.SELECTED,
      stroke: FIELD.COLORS.SELECTED_GLOW,
      text: FIELD.COLORS.READ_ACTIVE_TEXT,
      opacity: 1,
      glowColor: FIELD.COLORS.SELECTED_GLOW,
      glowRadius: 12,
    },
```
(Leave the `past`/`future` `rgba(...)` values unchanged.)

- [ ] **Step 5: Point `motion-arrow.tsx` at the named entry** — `src/engine/motion-arrow.tsx`

Add the import and redefine `MOTION_COLOR` off the constant (keeps the rest of the file's `MOTION_COLOR` references intact — minimal diff):
```tsx
import { FIELD } from "./constants";
```
Replace:
```tsx
const MOTION_COLOR = "#06b6d4"; // bright cyan/teal
```
With:
```tsx
const MOTION_COLOR = FIELD.COLORS.MOTION; // bright cyan/teal
```

- [ ] **Step 6: Point `ball.tsx` at the named entries** — `src/engine/ball.tsx`

Add the import (this file does not currently import `FIELD`):
```tsx
import { FIELD } from "./constants";
```
On the football body `<Ellipse>`, replace the two brown literals:
```tsx
        fill={FIELD.COLORS.BALL_BODY}
        stroke={FIELD.COLORS.BALL_STROKE}
```
(Leave the laces `fill="white"` and the `rgba(0,0,0,…)` shadows inline.)

- [ ] **Step 7: Run the engine tests, then the full verification quartet**

Run:
```bash
npm run test:run -- tests/engine
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: `tests/engine/*` green (values are byte-identical; nothing serialization/export/formation-related changed), full suite green, `tsc` clean, lint no new errors, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/engine/constants.ts src/engine/route-line.tsx src/engine/player-node.tsx src/engine/read-indicator.tsx src/engine/motion-arrow.tsx src/engine/ball.tsx
git commit -m "refactor(engine): centralize leaked inline hexes into FIELD.COLORS"
```

---

## Task 4: Phase 2 close-out QA (dark + light)

The final gate for Phase 2: prove the grep gates hold, walk every route in **both** themes with screenshots, and run the full verification quartet one last time. This task changes no source (any defect found is fixed in the owning file — a token *value* if a surface reads wrong, per the spec's "the token value, not the call site, is the fix"). Its deliverable is the passing gates + a reviewed screenshot set.

**Files:**
- No source files. Produces: grep-gate output, dark+light screenshots per route, verification-quartet output.

**Interfaces:**
- Consumes: seeded dev DB (`docker-compose.dev.yml`), coach account `coach@playforge.dev`, invite code `PLAY01`. All routes token-driven (2b/2c) with `<ThemeToggle />` mounted (Task 1).
- Produces: no code. A go/no-go QA record.

- [ ] **Step 1: Run the grep gates**

```bash
# Gate A — zero indigo/violet/blue classes in app + components (engine excluded)
rg -n "\b(indigo|violet|blue)-" src/app src/components ; echo "exit=$?"
# Gate B — zinc/slate/gray only in the agreed allowlist
rg -n "\b(zinc|slate|gray)-" src/app src/components ; echo "exit=$?"
```
Expected: **Gate A** prints nothing (`exit=1` from ripgrep = zero matches). If any line prints, it is a Phase 2 miss — fix it in the owning file (map to the token per the spec §2/§4 tables) before proceeding. **Gate B** prints only entries on the allowlist agreed in plans 2b/2c; any new/unlisted match is a failure. `theme-toggle.tsx` must **not** appear in either gate (Task 1 cleared it).

- [ ] **Step 2: Start the dev server against the seeded DB**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev
```
Confirm the app serves on its dev port and the DB is seeded (if empty: `npm run db:seed`). Sign in as `coach@playforge.dev` (seeded coach). For player routes, use a seeded player (e.g. `marcus@playforge.dev`) or the invite code `PLAY01`.

- [ ] **Step 3: Walk every route in BOTH themes, screenshotting each**

For each route: load it, screenshot in dark, click `ThemeToggle` to light, screenshot in light. Drive with Playwright (dev server + captures). Routes:

*Coach (15):* `/dashboard`, `/playbooks`, `/playbooks/[id]` (open a seeded playbook), `/designer`, `/roster`, `/quizzes`, `/quizzes/[id]` (open a seeded quiz), `/quizzes/create`, `/analytics`, `/practice`, `/practice/[id]` (open a seeded practice plan), `/game-plans`, `/game-plans/[id]` (open a seeded game plan), `/settings`, `/settings/files`.

*Player (6):* `/home`, `/plays`, `/plays/[id]` (open a seeded play), `/quiz`, `/quiz/[id]` (open a seeded quiz to reach the run view), `/progress`.

*Auth (3):* `/login`, `/signup`, `/join` (or `/join?code=PLAY01`) — signed out.

Per screenshot, verify:
- **No dark-hardcoded remnants in light mode** — no near-black panels/text, no white-on-white, no dark chips (the theme-toggle hover was a known offender — confirm it's a light chip now).
- **Focus rings visible in both themes** — tab to an interactive element; the global `:focus-visible` ring (`--ring` at the offset) is visible on both grounds.
- **Overlays themed** — open a toast (trigger a save), a dialog (e.g. confirm-delete on roster, change-password in settings), and a dropdown/select (user menu, a designer `<select>`); confirm background/border/text follow the theme.
- **Designer canvas** — the Konva field renders identically to before Task 3 (colors unchanged); the surrounding chrome follows the theme.

- [ ] **Step 4: Fix any defect in the owning file, re-screenshot**

If a surface reads wrong, adjust the **token value** in `globals.css` (not the call site) or the specific component the defect lives in, re-run the affected screenshot, and note it. Re-run Gate A/B after any fix. (Expected: none, if 2b/2c were thorough — but this is the safety net.)

- [ ] **Step 5: Run the final full verification quartet**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tests green (115 baseline + Task 1/2 additions), `tsc` clean, `npm run lint` with **no new errors** vs. the play-canvas.tsx parked baseline, `npm run build` succeeds.

- [ ] **Step 6: Tear down and commit the QA record**

```bash
docker compose -f docker-compose.dev.yml down
```
If any fix was made in Step 4, commit it:
```bash
git add -A
git commit -m "fix: light-mode contrast/theming corrections from Phase 2 QA"
```
(If Steps 1–5 passed clean with no fixes, there is nothing to commit — the close-out is a verification gate, and Phase 2 is complete.)

---

## Self-Review

**1. Spec coverage** (§5 light mode except the 2a-owned pre-hydration script, §6 engine, close-out QA):

- §5 "`ThemeToggle` returns to the coach header, coach sidebar footer, and player header" → Task 1 (Steps 5–7), plus the token fix (Steps 1–4) the removed component needed.
- §5 "Light values audited/tuned once components consume tokens (contrast pass: AA for text on background/card/primary)" → Task 2 (audit table + offense/defense fix + pinning test).
- §5 pre-hydration script → **explicitly out of scope** (2a owns it); this plan does not touch `src/app/layout.tsx`'s `<html>` class. ✓
- §5 "Close-out: full dark+light visual QA across every route with screenshots" → Task 4 (Step 3 route walk).
- §6 engine centralization (route-line ×5, player-node ×2, read-indicator ×3, motion-arrow, ball browns) → Task 3, item-by-item, with the reuse/scoping notes.
- Verification "grep gates … `@theme` utilities compile" → Task 4 (Steps 1, 5).

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Every code step shows the exact literal to add/replace; every command shows expected output. Contrast values are measured, not asserted vaguely.

**3. Type consistency:** `FIELD.COLORS` keys introduced in Task 3 Step 1 (`ROUTE_SELECTED`, `ROUTE_GLOW_DEFENSE`, `PLAYER_RING_SELECTED`, `PLAYER_LABEL`, `READ_ACTIVE_TEXT`, `MOTION`, `BALL_BODY`, `BALL_STROKE`) are the exact names referenced in Steps 2–6. `useTheme()`'s `{ theme, setTheme }` shape in the Task 1 mock matches `src/components/theme-provider.tsx`. The contrast test reads token names (`card-foreground`, `primary-foreground`, `primary-emphasis`, `offense`, `defense`) that exist in `.light` after 2a + Task 2 Step 3; the parser throws a named error if one is missing rather than producing a silent `NaN`.

**Known cross-plan assumptions (flagged for the executor):**
- 2a must have added `--primary-emphasis`, `--offense`, `--defense` to the **`.light`** block (not only `:root`). Task 2 Step 2/3 detect and repair a missing `--primary-emphasis`; if `--offense`/`--defense` are absent from `.light`, add them with the AA values in Step 3.
- The offense/defense **badge design** (tinted-bg vs. solid-fill) is 2b's; Task 2's test pins **both** directions so either design passes at the chosen values.
- Task 4's zinc/slate/gray allowlist is defined by 2b/2c; the close-out verifies against it rather than redefining it.
