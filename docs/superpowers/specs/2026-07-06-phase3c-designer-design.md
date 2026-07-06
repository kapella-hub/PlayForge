# PlayForge Phase 3c — Designer Power: Editing Core + Fixes (Design Spec)

**Date:** 2026-07-06
**Status:** Approved scope ("Editing core + fixes", user-selected). Correction vs. the scoping option text: redo already exists (two-stack undo/redo with toolbar buttons and ⌘Z/⌘⇧Z) — the editing core is precision placement, not redo.
**Phase:** 3c of Phase 3 (3a hardening ✅ → 3b engagement ✅ → 3c designer power → 3d mobile/PWA)
**Branch:** `phase-3c-designer`, stacked on `phase-3b-engagement`

## Context

The designer already has a solid editing base: 50-deep undo + redo, duplicate, mirror (`h`), keyboard shortcuts (d/v/m/h/a/⌘Z/⌘⇧Z/⌘S/Escape/Backspace), version history with refetch-on-open, draft persistence, AI generation. What it lacks is *placement precision* (players are freehand-dragged with no snapping, alignment aid, or fine adjustment) and it carries four known defects/confusions from prior-phase reviews. This phase adds the precision layer and clears the fixes.

## 1. Precision placement (new capability)

- **Drag snapping + alignment guides** (`src/engine/play-canvas.tsx`, `player-node.tsx`): while dragging a player (designer only — `readOnly`/preview unaffected):
  - Snap targets: (a) other players' x and y coordinates (alignment), (b) the field's horizontal center line (x = FIELD.WIDTH/2), (c) the dragged player's own pre-drag y (making pure horizontal slides easy).
  - Threshold: 1.5 field units (FIELD coordinate space, not pixels — scale-independent).
  - While a snap is active, a dashed guide line renders through the aligned coordinate (full field width/height), in the engine's palette (a `FIELD.COLORS` entry — the canvas is siloed from CSS tokens by design). Guides clear on dragend.
  - **Alt/Option held disables snapping** (standard escape hatch). Implemented via Konva `dragmove` events (event-handler state only — the React Compiler lint rules stay clean; lint remains 0).
  - `handlePlayerDragEnd` continues to commit the final position through the existing `onChange` → `pushHistory` flow — one undo step per drag, unchanged.
- **Arrow-key nudge** (`designer/page.tsx`): with a player selected (and not in an input, not preview), arrow keys move it 0.5 field units; Shift+arrow = 2 units. History coalescing: a nudge burst (successive nudges <800 ms apart) is ONE undo entry — `pushHistory` fires only when a burst starts. Uses the existing `useKeyboardShortcuts` hook (which must gain arrow-key + `shift` support only if it lacks it — verify; its matcher already handles `shift`).

## 2. Preview clarity (QA-confirmed confusion)

- Entering Preview mode **auto-starts playback once** (the toolbar button says "Preview"; QA confirmed users expect it to play, not to arm a scrubber). The scrubber stays for scrub/replay/stop; exiting preview stops playback. No label change — behavior now matches the label.

## 3. Fixes

- **Draft key user-scoped** (`designer/page.tsx:141,276,278`): keys become `playforge-draft:<userId>-<timestamp>`; the restore scan filters by the current user's prefix. **Legacy `playforge-draft-*` keys are adopted once**: on first scan, any legacy key is renamed into the current user's namespace (drafts are valuable; silently orphaning them loses work — unlike the bell's cache, which was disposable). `userId` reaches the designer via a thin server wrapper: `designer/page.tsx` becomes a small server component reading the session and rendering the existing client component (moved to `designer-client.tsx`) with a `userId` prop — the same session→prop pattern as the bell, adapted for a page.
- **Canonical route-type vocabulary**: one module (`src/engine/route-types.ts`) exports the route-type union, display labels, and group structure; `route-picker.tsx`, `assignment-panel.tsx` (its `routeGroups` pills), and the engine's detection all consume it. `routeType` comparisons normalize case, and **legacy lowercase `routeType` values heal on play load** (normalized when canvasData is loaded into the designer, not just on next click).
- ~~**`n()` → `detectRouteType` rename**~~ *(struck 2026-07-06: this item was an investigation artifact — the survey command used `rg -rn`, and `-r` is ripgrep's `--replace` flag, which rewrote every `detectRouteType` match as the literal `n` in the output. The function has always been named `detectRouteType`; nothing to rename.)*

## Out of scope (unchanged backlog)

`--category-*` tokens and SVG viz palette (visual debt, parked); formation template saving; multi-select; route waypoint editing; canvas↔CSS token bridge; `canUndo/canRedo` ref-reads in designer JSX (works in practice — every history change pairs with a state update; churn risk exceeds benefit).

## Verification

- Per task: quartet — `npm run test:run` (211 baseline, grows), `npx tsc --noEmit`, `npm run lint` (**stays 0 errors**), `npm run build`.
- New unit tests: snapping math (pure helper — given players + drag position ± Alt, returns snapped position + active guides; all three target kinds + threshold boundary); nudge coalescing (burst = one history entry); route-type normalization (legacy lowercase heals; canonical set round-trips); draft key scoping + legacy adoption (pure helpers extracted for testability).
- Close-out: gates (Phase 3b set) + browser QA: drag-snap guides visible and Alt-disable works; nudge + undo-once-per-burst; preview auto-plays; draft restore across the upgrade (legacy adoption); route pills highlight for legacy-cased plays; regression pass on draw/motion/animation.

## Risks / notes

- Engine changes are additive (dragmove listeners + a guides layer); the animation path and Konva event flow for select/draw/motion are untouched. The Phase 3a "engine frozen" constraint applied to lint fixes, not to this phase's deliberate capability work.
- Snapping in FIELD units keeps behavior identical across canvas sizes/DPI.
- The `useKeyboardShortcuts` arrow handlers must not fire during rename/notes inputs (`ignoreInputs: true`) or in preview.
- Legacy draft adoption is a one-time, best-effort rename inside a try/catch — a failed adoption must never break designer load.
