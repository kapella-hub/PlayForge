# Phase 2c — Accent Unification + Neutral Sweep (Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every hardcoded color class in `src/app` + `src/components` onto the Phase 2 design tokens — unifying the accent (emerald/indigo/violet/blue → teal `primary` family + semantic roles) and mechanically warming the neutrals (zinc/slate/gray/white/black → token utilities) — visiting each surface exactly once and applying §2 + §4 of the spec together.

**Architecture:** This is a pure presentation migration: class-string swaps only, no markup-structure or behavior changes, engine (`src/engine`) untouched. It consumes the token utilities and re-skinned primitives that plans 2a (token foundation) and 2b (primitives) land first; it produces a codebase with zero `indigo-/violet-/blue-` and zero un-allowlisted `zinc-/slate-/gray-` classes. Work is decomposed by **surface** (a directory or a hotspot file), ordered by the census hotspot ranking. Each task ends with build + typecheck + lint + test + before/after screenshot review of its own routes.

**Tech Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS v4 (`@theme inline`) · CVA + `cn()` · Radix primitives · Konva (engine, excluded) · Vitest · Playwright (screenshot review via MCP).

---

## Global Constraints

Every task's requirements implicitly include this section. **The two mapping tables below are copied verbatim from the approved spec (`docs/superpowers/specs/2026-07-05-phase2-design-system-design.md`) and are BINDING.** The lettered decisions (D1–D15) resolve the ruleset gaps and role-dependent calls the census surfaced; they are equally binding so executors do not each decide.

### Interfaces consumed (plans 2a + 2b land first — treat as EXISTING)

- **Token utilities** (from `@theme inline` in `globals.css`): `bg-background` / `text-foreground` / `bg-card` / `text-card-foreground` / `bg-primary` / `text-primary-foreground` / `text-primary-emphasis` / `bg-secondary` / `text-secondary-foreground` / `bg-muted` / `text-muted-foreground` / `bg-accent` / `text-destructive` / `border-border` / `ring-ring` / `text-success` / `text-warning` / `bg-offense` / `bg-defense` — plus all standard color-utility forms (`text-*`, `bg-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, `from-*`, `shadow-*`) and opacity modifiers (`/10`, `/20`, `/85`, …). `dark:` follows the `.dark` class.
- **CSS classes** `surface-1` / `surface-2` (plain classes, applied as `className="… surface-2"`, **not** `bg-surface-2`).
- **Re-skinned primitives (2b):** Button, Badge (+`offense`/`defense` variants), Card, Input, Toast, Select (native wrapper), SegmentedControl, Dialog family. Where 2b already migrated a call site, USE the primitive; do NOT re-map its shell classes. 2b covers: **6 dialogs** (confirm-dialog, player-card dialog, change-password-dialog, designer print panel, create-game-plan-dialog, new-playbook-dialog), **3 segmented toggles** (designer offense/defense side toggle, print-mode Playbook/Wristband toggle, animation-controls speed toggle), **6 native `<select>`s** (play-toolbar Format + Coverage, ai-generator formation, playbook-filters formation + sort, quiz-create question-type, + any others found), **badge side variants** in the playbooks pages. **A 2b-touched file is NOT removed from this sweep — only the specific shell/primitive region is excluded; all its other content classes (form labels, helper text, buttons that are still raw, error banners, surrounding layout) are IN SCOPE.**

### §2 — Accent unification (semantic role table, VERBATIM)

| Today | Becomes |
|---|---|
| `emerald-600/500` buttons, rings, toggles | `primary` / `ring` |
| `emerald-300/400` text accents | `primary-emphasis` |
| indigo (panels, avatar, quiz CTA, Select ring, toast info, leaderboard chips, level/XP) | `primary` family (interactive) or `accent` (amber, for highlight/gamification) per call site |
| violet (AI generator) | `primary` family; AI affordances may use `accent` for the "spark" moments |
| blue (install tracker) | `primary` (progress) / `success` (complete) |
| offense/defense badges (`default`/`destructive` today) | new `offense` / `defense` badge variants |
| stat-card ad-hoc colors (white/green/amber/indigo) | `foreground` / `success` / `accent` / `primary-emphasis` |

Rule: interactive/navigational emphasis → primary family; celebratory/highlight/gamification → accent (amber); state colors stay semantic (success/warning/destructive). No indigo, violet, or blue classes remain in `src/app` or `src/components` when Phase 2 closes (engine excluded).

### §4 — Mechanical neutral sweep (canonical mapping, VERBATIM)

Canonical mapping (dark-theme anchored; slate/gray/neutral treated as zinc):

| Hardcoded | Token utility |
|---|---|
| `text-white`, `text-zinc-50/100/200` | `text-foreground` |
| `text-zinc-300` | `text-foreground/85` (or `text-secondary-foreground` where it labels a surface) |
| `text-zinc-400/500` | `text-muted-foreground` |
| `text-zinc-600` | `text-muted-foreground/70` |
| `bg-zinc-950`, `bg-black/*` page grounds | `bg-background` |
| `bg-zinc-900`, `bg-zinc-900/50` | `bg-card` (surfaces) or `bg-secondary` (insets/tracks) |
| `bg-zinc-800`, `bg-white/[0.04-0.06]` | `bg-secondary` or `bg-surface-1` per role |
| `border-zinc-700/800`, `border-white/8-10` | `border-border` (opacity variants allowed) |
| `ring-offset-zinc-900/950` | `ring-offset-background` |
| `hover:border-zinc-700` card hovers | Card's own token hover (remove per-page overrides) |

> Note: the table writes `bg-surface-1` — read this as the plain class **`surface-1`** (per the consumed interface).

### How to apply (READ BEFORE EDITING — line numbers, global vs per-occurrence)

2c executes **after** 2a + 2b land, and 2b rewrites ~a third of these files (6 dialogs, 3 segmented toggles, 6 selects). Therefore:

- **Line numbers in this plan are pre-2a/2b locators — approximate. The binding key is the exact class string in its surrounding `className` context**, not the line. Find the string; if 2b already removed it (a migrated shell/select/toggle), it is out of scope — skip it.
- **Mechanical rows may be applied file-globally** (a given before-string maps to exactly one token): `text-white`(non-fill)→`text-foreground`, `text-zinc-400/500`→`text-muted-foreground`, `text-zinc-600`→`text-muted-foreground/70`, `text-zinc-700`→`text-muted-foreground/60`, `border-zinc-700/800`/`border-white/8-10`→`border-border`, `ring-offset-zinc-900/950`→`ring-offset-background`, `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70`.
- **Role-dependent rows MUST be applied per-occurrence — never global-replace them** — the same before-string maps to different tokens by role: `bg-zinc-900/*` (card vs secondary, D1), `bg-zinc-800/*` (secondary vs surface-1, D1), `text-zinc-300` (foreground/85 vs secondary-foreground, e.g. progress-page badge-tile labels → secondary-foreground), `text-white` (foreground vs `primary-foreground` on a colored fill, D2), `bg-black/*` (background ground vs kept scrim, D9), `red-*` (destructive vs defense, D8), `green-*` (success vs decorative field-green, D13). Each such occurrence is enumerated per-file below with its resolved token — follow those, do not sweep.

### Central decisions (D1–D15) — binding resolutions

- **D1 — Surface role convention** (resolves every `bg-zinc-900/*` and `bg-zinc-800/*`):
  - **`bg-card`** — floating/elevated containers: modals, popovers, dropdown menus, floating toolbars/panels over the canvas, sticky table cells, grid **cards**, empty-state cards, standalone sub-panels.
  - **`bg-secondary`** — insets: form inputs/selects/textareas, segmented-control tracks, progress-bar tracks, chips/pills/kbd, hover rows, inset info boxes, quiz option rows, avatar/number circles, dividers-as-fill.
  - **`surface-1`** — a raised tile sitting ON a card that needs slight elevation (the progress-page badge tiles).
  - Off-scale opacity (`/50…/95`) **drops to the solid token** UNLESS the element is a translucent overlay where translucency is load-bearing (floating over-canvas buttons → `bg-card/70`; sticky header already `bg-[var(--background)]/75` → `bg-background/75`; scrims → see D9). When in doubt, drop it.
- **D2 — Text/chips on a colored fill** → the shared on-color foreground `text-primary-foreground` (there is **no** `accent-foreground`/`success-foreground`/`offense-foreground` token). Applies to text on any `bg-primary/accent/success/warning/offense/defense/destructive` fill. On-color translucent white chips: `bg-white/NN` → `bg-primary-foreground/NN`; `text-white/NN` → `text-primary-foreground/NN` (opacity preserved). This keeps on-color whites out of the gate without an allowlist.
- **D3 — Old-accent glow remap** (arbitrary values encoding the old accent):
  - emerald `rgba(5,150,105,a)` / `rgba(16,185,129,a)` → **`rgba(15,118,110,a)`** (primary).
  - indigo `rgba(99,102,241,a)` / violet / blue → **`rgba(15,118,110,a)`** (primary), or `rgba(20,184,166,a)` (ring) for a pure glow.
  - Colored Tailwind shadow utilities `shadow-{emerald,indigo,cyan,…}-N/M` → `shadow-primary/M` (or `shadow-offense/M` / `shadow-defense/M` for unit glows).
  - Neutral black shadows `rgba(0,0,0,a)` and `shadow-lg/md/sm/2xl` → **KEEP**.
  - `bg-emerald-600` + `hover:bg-emerald-500` pairs collapse to `bg-primary` + **`hover:bg-primary/90`** (preserve a hover delta rather than making base == hover).
- **D4 — Ruleset-gap neutrals** (shades the §4 table omits):
  - `text-zinc-700` → `text-muted-foreground/60`
  - `bg-zinc-700`, `hover:bg-zinc-700` → `bg-secondary`, `hover:bg-secondary/80`
  - `border-zinc-600`, `hover:border-zinc-600`, `hover:border-zinc-500` → `border-border`; `focus:border-zinc-600` → `focus:border-ring`
  - `bg-zinc-300/10` (silver medal tint) → `bg-foreground/10`
  - off-scale border opacity preserved: `border-zinc-800/50` → `border-border/50`
- **D5 — Amber: state vs highlight** (both tokens resolve to `#d97706`, so this is a semantic-only choice, visually identical): dirty/unsaved/alert/attention/reminder/"learning" STATE → **`warning`**; celebratory/gamification/spark/"AI"/level/XP/streak/rank/medal HIGHLIGHT → **`accent`**.
- **D6 — Emerald confirm/save Check icon** (`text-emerald-500` on an inline save/confirm ✓ button) → **`text-success`** (the checkmark idiom is a success affordance; keeps a semantic green rather than turning teal).
- **D7 — Mode banners** (designer + play-toolbar): **draw → `primary`**, **motion → `accent`**, **preview → `success`**. Consequences: the motion banner shifts cyan→amber, and the preview mode button shifts amber→green; both accepted so the three modes stay distinct in token hues. The canvas motion arrow stays cyan (`#06b6d4`) — it is the siloed engine palette per spec §6, so a slight UI(amber)/canvas(cyan) motion mismatch is intentional. In `play-toolbar.tsx`, stay strictly class-strings-only: **keep the `ModeButton` `color` union and its `activeClass` map KEYS unchanged, and remap only the map VALUES** (the `emerald` key now yields `bg-primary text-primary-foreground`, `cyan` → `bg-accent text-primary-foreground`, `amber` → `bg-success text-primary-foreground`). This needs no `tsc`/call-site change. (Optional, out-of-scope cleanup: rename the keys/union `emerald|cyan|amber` → `primary|accent|success` and the four call-site `color=` literals; if done, re-run `tsc` and list it as a deviation.)
- **D8 — Offense / defense**: a class tagging an **offensive** unit/side (blue: `bg-blue-600`, `text-blue-400`, `shadow-blue-500/25`) → `offense` family (`bg-offense`, `text-offense`, `shadow-offense/25`); a **defensive** unit/side (red) → `defense` family. These are distinct from destructive (delete/error) red and from mode banners — do NOT collapse them.
- **D9 — Scrims**: a full-screen modal/nav **overlay** `bg-black/40..70` → **KEEP `bg-black/NN`** (allowlisted; a scrim must dim content in both themes and there is no scrim token). Page **grounds** (`bg-zinc-950`, solid `bg-black`) → `bg-background`.
- **D10 — SVG `stroke=`/`fill=` hex PROPS** (route-picker, formation-picker, assignment-panel line/dot previews: `stroke="#60a5fa"`, `fill="#f87171"`, etc.) → **OUT OF SCOPE for 2c.** They are React props (not className strings) and are a parallel viz palette per spec §6; leave them as-is and record them as a parked follow-up. Only Tailwind `fill-*`/`stroke-*` **classes** migrate (e.g. `fill-amber-400` → `fill-warning`, `fill-zinc-900` → `fill-card`). Confirm `fill-*`/`stroke-*` generate for `@theme` colors during the build step; if a color doesn't emit a utility, fall back to `fill-[var(--card)]` / `fill-[var(--warning)]`.
- **D11 — Mastery status scale** (mastery-heatmap `masteryColors` L25–28; progress-page `MASTERY_COLORS` L20–24 — the SAME 4-state scale): mastered → `success`, reviewing → `primary`, learning → `warning`, new → `destructive` (applied to `bg`/`text`/bar-segment, tinted e.g. `bg-success/20`). Resolve both files' scales identically and eyeball contrast in the stacked breakdown bar.
- **D12 — Play-type categorical badge palette** (play-library `playTypeBadge` L27–42: pass=blue, run=emerald, play_action=amber, screen=purple, special=pink, default=zinc): **RESOLVED BY TEAM LEAD — KEEP the color-coding.** This is informational categorical color (a scanning aid for coaches), not accent sprawl; collapsing it destroys information. The palette values stay exactly as-is at this one call site, allowlisted in the Task 8 gates with the comment "play-type categorical palette — tokenize as --category-* in Phase 3". No new tokens this phase.
- **D13 — Decorative field-green** (`bg-green-900/30` empty-thumbnail placeholders: game-plan/play-list L174, play-card L59) → `bg-secondary` (neutral inset; NOT `success` — it is decorative field-green, not a state).
- **D14 — `print-layout.tsx`**: EXCLUDE from tokenization except the two `text-zinc-500 print:hidden` helper lines (L44, L104 → `text-muted-foreground`). Every `bg-white` / `text-black` / `text-gray-*` / `border-gray-*` / `border-black` is intentional print ink/paper (much already scoped by `print:`). Allowlist these in the gate.
- **D15 — Google "G" SVG fills** (login + signup OAuth button: `fill="#4285F4"` etc.) → brand-mandated, allowlisted, keep.

### Verification contract (every task)

Run from repo root, all must pass:
- `npm run test:run` — 115 baseline green (regression guard; **no new tests** — class swaps have no unit-testable behavior, YAGNI). One existing assertion needs updating (Task 5: `assignment-panel.test.tsx:33` asserts the active pill's `bg-indigo-600`); a repo-wide grep of `tests/**` for color-class assertions (`toHaveClass`/`toContain`/`emerald-|indigo-|zinc-`) found ONLY that one — every other test is color-agnostic.
- `npx tsc --noEmit` — clean.
- `npm run lint` — **no new errors** vs the post-2a/2b baseline (2c touches none of the pre-existing lint-error files).
- `npm run build` — succeeds; confirms `@theme` utilities (including any `fill-*`/`stroke-*`) compile.
- **Screenshot review** (sweep tasks): with the dev server up, capture each task's named routes before AND after, and eyeball **near-identical (not pixel-identical)** dark rendering — neutrals intentionally warm toward the token values. If any surface reads wrong, the fix is the token value in `globals.css` (a 2a concern), not the call site.

**Dev server for screenshots:** `docker compose -f docker-compose.dev.yml up -d` (dev DB, seeded), then `npm run dev`, then dev-login as `coach@playforge.dev` (seed org `PLAY01`). Capture via Playwright MCP (`browser_navigate` + `browser_take_screenshot`) or manually.

### Hard constraints

- No new npm dependencies.
- Class strings only (plus swapping to the 2b primitive where a call site is noted, and the one `ModeButton` color-literal rename in D7). No markup-structure or behavior changes.
- `src/engine/**` is untouched.
- Each file is edited in exactly ONE task (overlaps resolved explicitly below).

### Overlap resolutions (each file visited once)

- **stat-card**: the component default + internal classes are edited in **Task 3** (`src/components/analytics/stat-card.tsx`). The `color=` prop values passed by call sites are edited where those call sites live — **Task 2** (dashboard/analytics pages). Task 3 does not touch pages; Task 2 does not touch the component.
- **dashboard**: the page `src/app/(coach)/dashboard/page.tsx` → **Task 2**; the component `src/components/dashboard/dashboard-client.tsx` → **Task 3**.
- **install-tracker**: physically in `src/components/analytics/` → owned by **Task 3** (its blue→primary/success mapping lives there; the spec's mention under the play-components surface is satisfied in Task 3).
- **App-shell layouts** (`src/app/(coach)/layout.tsx`, `src/app/(player)/layout.tsx`) → **Task 1** (they render the chrome alongside coach-sidebar/player-tabs).
- **components/player/** (`player-home-client.tsx`) → **Task 4** (player-facing, consumed by /home).
- **Dialog/select/toggle shells** already migrated by 2b are excluded in whatever task owns the file, but the file's non-shell content is migrated there.

---

## Task 1: Layout chrome + page-transition + auth pages

**Files:**
- Modify: `src/components/layout/coach-sidebar.tsx`
- Modify: `src/components/layout/player-tabs.tsx`
- Modify: `src/components/layout/user-menu.tsx`
- Modify: `src/components/account/change-password-dialog.tsx` (content only — dialog shell is 2b)
- Modify: `src/components/ui/page-transition.tsx` (verify only — no color classes)
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(coach)/layout.tsx`
- Modify: `src/app/(player)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`
- Modify: `src/app/(auth)/join/page.tsx`

**Interfaces:**
- Consumes: token utilities + `surface-1`/`surface-2` classes (2a); Button/Input/Card/Spinner primitives (2b, already token-styled).
- Produces: the panel-gradient → `surface-2` precedent and the `text-emerald-300|text-indigo-400` link → `text-primary-emphasis` unification that later tasks mirror.

**Routes to screenshot:** `/login`, `/signup`, `/join`, plus `/dashboard` (coach sidebar + header) and `/home` (player tabs + header).

- [ ] **Step 1: `coach-sidebar.tsx`**
  - Logo (L84): `bg-emerald-600 font-bold text-white text-sm shadow-[0_10px_24px_rgba(5,150,105,0.25)]` → `bg-primary font-bold text-primary-foreground text-sm shadow-[0_10px_24px_rgba(15,118,110,0.25)]` (D2, D3).
  - Logo word (L91): `text-white` → `text-foreground`.
  - Collapse button (L100): `text-zinc-400 … hover:bg-white/[0.06] hover:text-white` → `text-muted-foreground … hover:bg-secondary hover:text-foreground` (D1).
  - Tooltip (L59): `bg-zinc-900 … text-white shadow-lg` → `bg-card … text-card-foreground shadow-lg` (D1); arrow (L62) `fill-zinc-900` → `fill-card` (fallback `fill-[var(--card)]` per D10).
  - Group label (L113): `text-zinc-500` → `text-muted-foreground`.
  - Nav active (L131): `bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.2)]` → `bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(15,118,110,0.2)]` (D2, D3).
  - Nav inactive (L132): `text-zinc-400 hover:bg-white/[0.05] hover:text-white` → `text-muted-foreground hover:bg-secondary hover:text-foreground`.
  - Badge dot (L138): `bg-orange-400` → `bg-accent` (D5, attention highlight).
  - Notifications border (L152): `border-t border-white/8` → `border-t border-border`.
  - Mobile hamburger (L168): `border border-white/10 bg-zinc-950/80 text-white` → `border border-border bg-background/80 text-foreground`.
  - Mobile overlay scrim (L182): `bg-black/60` → **KEEP** (D9).
  - Mobile aside (L189) + desktop aside (L200): `border-r border-white/8 bg-[linear-gradient(180deg,rgba(15,29,26,0.98),rgba(8,17,15,0.98))]` → `border-r border-border surface-2` (drop the arbitrary gradient in favor of the `surface-2` class).

- [ ] **Step 2: `player-tabs.tsx`**
  - Nav panel (L20): `border-t border-white/8 bg-[linear-gradient(180deg,rgba(15,29,26,0.98),rgba(8,17,15,0.96))] … md:border` → `border-t border-border surface-2 … md:border`.
  - Active tab (L29): `text-emerald-300 md:bg-white/[0.06]` → `text-primary-emphasis md:bg-secondary`.
  - Inactive tab (L29): `text-zinc-500` → `text-muted-foreground`.
  - Active icon (L32): `text-emerald-300` → `text-primary-emphasis`.

- [ ] **Step 3: `user-menu.tsx`**
  - Avatar (L46): `bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700` → `bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90` (D2).
  - Menu panel (L61): `border border-zinc-800 bg-zinc-900 … shadow-xl` → `border border-border bg-card … shadow-xl` (D1).
  - Divider (L63): `border-b border-zinc-800` → `border-b border-border`.
  - Name (L64): `text-white` → `text-foreground`. Email (L65): `text-zinc-500` → `text-muted-foreground`.
  - Menu items (L69, L76): `text-zinc-400 hover:bg-zinc-800 hover:text-white` → `text-muted-foreground hover:bg-secondary hover:text-foreground` (×2).

- [ ] **Step 3b: `change-password-dialog.tsx`** (launched from user-menu; content only — dialog shell is 2b)
  - Content: error banner (L86) `border border-red-500/20 bg-red-500/10 … text-red-400` → `border border-destructive/20 bg-destructive/10 … text-destructive`; labels (L91, L103, L116) `text-zinc-300` → `text-foreground/85` (×3).
  - EXCLUDE (2b shell): overlay (L65) `bg-black/60`; content (L66) `border-zinc-700/60 bg-zinc-900`; title (L69) `text-white`; description (L72) `text-zinc-400`; close-X (L78) `text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300`. If 2b has NOT migrated this dialog to `ui/dialog.tsx` (verify), also apply: overlay → KEEP `bg-black/60` (D9); content `bg-zinc-900`→`bg-card`, `border-zinc-700/60`→`border-border/60`; title `text-white`→`text-foreground`; description `text-zinc-400`→`text-muted-foreground`; close-X `text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300`→`text-muted-foreground hover:bg-secondary hover:text-foreground/85`.

- [ ] **Step 4: `page-transition.tsx`** — read to confirm zero color classes; no edit. (Prevents a false "missed file".)

- [ ] **Step 5: `(auth)/layout.tsx`**
  - Root (L7): `bg-[var(--background)]` → `bg-background`.
  - Glow (L9): `bg-emerald-500/12` → `bg-primary/12`. Glow (L10): `bg-amber-500/10` → `bg-accent/10` (D5, decorative).
  - Sheen (L11): `bg-gradient-to-b from-white/6 to-transparent` → `bg-gradient-to-b from-foreground/[0.06] to-transparent` (neutral top sheen; on dark `foreground`≈white so near-identical; light-mode nuance is handled by 2a's light tuning).

- [ ] **Step 6: `(coach)/layout.tsx`**
  - Root (L32): `bg-[var(--background)]` → `bg-background`.
  - Header (L36): `border-b border-white/8 bg-[var(--background)]/75` → `border-b border-border bg-background/75`.
  - Brand (L38): `text-emerald-300/80` → `text-primary-emphasis/80`.

- [ ] **Step 7: `(player)/layout.tsx`**
  - Root (L52): `bg-[var(--background)]` → `bg-background`.
  - Header (L53): `border-b border-white/8 bg-[var(--background)]/75` → `border-b border-border bg-background/75`.
  - Brand (L55): `text-emerald-300/80` → `text-primary-emphasis/80`.
  - Subtitle (L58): `text-zinc-500` → `text-muted-foreground`.

- [ ] **Step 8: `login/page.tsx`**
  - Logo (L88): `bg-emerald-600 … text-white shadow-[0_16px_40px_rgba(5,150,105,0.28)]` → `bg-primary … text-primary-foreground shadow-[0_16px_40px_rgba(15,118,110,0.28)]` (D2, D3).
  - Heading (L92): `text-white` → `text-foreground`. Subtitle (L93): `text-zinc-400` → `text-muted-foreground`.
  - Error banner (L99): `border border-red-500/20 bg-red-500/10 … text-red-400` → `border border-destructive/20 bg-destructive/10 … text-destructive`.
  - Labels (L107, L120): `text-zinc-300` → `text-foreground/85` (×2, form labels).
  - Password eye buttons (L136): `text-zinc-500 hover:text-zinc-200` → `text-muted-foreground hover:text-foreground`.
  - OR dividers (L151, L153, L176, L178): `bg-zinc-800` → `bg-border` (×4, `h-px` rules). OR labels (L152, L177): `text-zinc-500` → `text-muted-foreground` (×2).
  - Footer links (L197, L203): `text-emerald-300 hover:underline` → `text-primary-emphasis hover:underline` (×2). Footer text (L195, L201): `text-zinc-500` → `text-muted-foreground` (×2).
  - Google "G" SVG `fill="#4285F4|#34A853|#FBBC05|#EA4335"` (L162–165): **KEEP** (D15).

- [ ] **Step 9: `signup/page.tsx`**
  - Logo (L78): `bg-emerald-600 … text-white shadow-[0_16px_40px_rgba(5,150,105,0.28)]` → `bg-primary … text-primary-foreground shadow-[0_16px_40px_rgba(15,118,110,0.28)]`.
  - Heading (L82): `text-white` → `text-foreground`. Subtitle (L83): `text-zinc-400` → `text-muted-foreground`.
  - Error banner (L89): `border border-red-500/20 bg-red-500/10 … text-red-400` → `border border-destructive/20 bg-destructive/10 … text-destructive`.
  - Labels (L96, L100, L104, L108, L122): `text-zinc-300` → `text-foreground/85` (×5).
  - Password eye buttons (L115, L129): `text-zinc-500 hover:text-zinc-200` → `text-muted-foreground hover:text-foreground` (×2).
  - Footer text (L140): `text-zinc-500` → `text-muted-foreground`. Footer link (L142): `text-emerald-300 hover:underline` → `text-primary-emphasis hover:underline`.

- [ ] **Step 10: `join/page.tsx`**
  - InviteCodeInput (L84): `border border-zinc-700 bg-zinc-800/50 … text-white … focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 … focus:border-indigo-500 focus:bg-zinc-800` → `border border-border bg-secondary … text-foreground … focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background … focus:border-ring focus:bg-secondary`.
  - Logo (L217): `bg-indigo-600 … text-white shadow-lg shadow-indigo-600/25` → `bg-primary … text-primary-foreground shadow-lg shadow-primary/25` (D2, D3).
  - Heading (L221): `text-white` → `text-foreground`. Subtitle (L222): `text-zinc-500` → `text-muted-foreground`.
  - Error banner (L232): `bg-red-500/10 border border-red-500/20 … text-red-400` → `bg-destructive/10 border border-destructive/20 … text-destructive`.
  - Labels (L240, L252, L264, L277, L289, L312): `text-zinc-300` → `text-foreground/85` (×6).
  - Password eye buttons (L305, L328): `text-zinc-500 hover:text-zinc-200` → `text-muted-foreground hover:text-foreground` (×2).
  - Footer text (L340): `text-zinc-500` → `text-muted-foreground`. Footer link (L342): `text-indigo-400 hover:underline` → `text-primary-emphasis hover:underline` (unifies with login/signup's link color).

- [ ] **Step 11: Verify** — run the full verification contract; screenshot `/login`, `/signup`, `/join`, `/dashboard`, `/home` before/after.

- [ ] **Step 12: Commit**
```bash
git add src/components/layout src/components/account/change-password-dialog.tsx src/components/ui/page-transition.tsx "src/app/(auth)" "src/app/(coach)/layout.tsx" "src/app/(player)/layout.tsx"
git commit -m "feat(2c): tokenize layout chrome + auth pages — panels to surface-2, accent to primary"
```

---

## Task 2: Coach pages (except designer + quiz-create)

**Files (Modify):** `src/app/(coach)/dashboard/page.tsx`, `playbooks/page.tsx`, `playbooks/[id]/page.tsx`, `playbooks/new-playbook-dialog.tsx`, `roster/page.tsx`, `quizzes/page.tsx`, `quizzes/[id]/page.tsx`, `quizzes/[id]/quiz-detail-client.tsx`, `analytics/page.tsx`, `practice/page.tsx`, `practice/[id]/page.tsx`, `practice/[id]/editor.tsx`, `game-plans/page.tsx`, `game-plans/[id]/page.tsx`, `game-plans/create-game-plan-dialog.tsx`, `settings/page.tsx`, `settings/files/page.tsx`.

**Interfaces:**
- Consumes: tokens (2a); Card/Button/Input/Badge/ConfirmDialog + the migrated new-playbook-dialog & create-game-plan-dialog **shells** (2b); the StatCard component after **Task 3** rationalizes its default (call sites here pass `color=` token strings).
- Produces: nothing later tasks depend on.

**Routes to screenshot:** `/dashboard`, `/playbooks`, `/playbooks/[id]`, `/roster`, `/quizzes`, `/quizzes/[id]`, `/analytics`, `/practice`, `/practice/[id]`, `/game-plans`, `/game-plans/[id]`, `/settings`, `/settings/files`.

Apply the shared patterns everywhere they appear in these files: `hover:bg-zinc-800` (icon/ghost buttons) → `hover:bg-secondary`; `hover:text-zinc-300` → `hover:text-foreground/85`; `text-zinc-700` (empty-state icons) → `text-muted-foreground/60` (D4); `bg-zinc-800` inset chip/circle → `bg-secondary`.

- [ ] **Step 1: `dashboard/page.tsx`**
  - Mechanical: `text-zinc-400`→`text-muted-foreground` (L90, L110); `text-zinc-500`→`text-muted-foreground` (L139, L152, L158); `border-zinc-800`→`border-border` (L147→ its bg below); `text-zinc-100`→`text-foreground` (L149).
  - StatCard `color=` props: L54 `"text-white"`→`"text-foreground"`; L62 `"text-green-400"`→`"text-success"`; L69 `"text-amber-400"`→`"text-accent"`; L78 `"text-indigo-400"`→`"text-primary-emphasis"` (spec stat-card row: foreground/success/accent/primary-emphasis).
  - Inactive-players alert (D5, warning state): L103 `border-amber-500/50`→`border-warning/50`; L105 `text-amber-400`→`text-warning`; L117 `bg-amber-500/10 … text-amber-400`→`bg-warning/10 … text-warning`.
  - L147 active-game-plan play row: `bg-zinc-900/50`→`bg-secondary` (inset row, D1).

- [ ] **Step 2: `playbooks/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L30, L83); `text-zinc-500`→`text-muted-foreground` (L31, L41, L63, L82, L116); `border-zinc-800`→`border-border` (L39); `text-zinc-600`→`text-muted-foreground/70` (L67, L120); `text-zinc-700`→`text-muted-foreground/60` (L40).
  - Card hover overrides: L50, L91 `hover:border-zinc-700` → **REMOVE** (Card owns hover).
  - "Shared" outline Badge (L108): `border-indigo-500/50 text-indigo-400` → `border-primary/50 text-primary-emphasis`.
  - EXCLUDE: the offense/defense `<Badge variant=…>` at L54–59, L97–105 (2b side variants).

- [ ] **Step 3: `playbooks/[id]/page.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L53, L87, L95); `text-white`→`text-foreground` (L61); `border-zinc-800`→`border-border` (L93); `text-zinc-600`→`text-muted-foreground/70` (L96); `text-zinc-700`→`text-muted-foreground/60` (L94).
  - Back link (L53): `hover:text-zinc-300` → `hover:text-foreground/85`.
  - EXCLUDE: side Badge at L62–66 (2b).

- [ ] **Step 4: `playbooks/new-playbook-dialog.tsx`** (content only — dialog shell is 2b)
  - EXCLUDE (2b shell): L64 overlay `bg-black/60`; L65 content `border-zinc-700/60 bg-zinc-900`; L67 title `text-zinc-100`; L70–72 close-X.
  - Content: labels (L80, L91) `text-zinc-400`→`text-muted-foreground`; L104 `text-zinc-400 … hover:text-zinc-200`→`text-muted-foreground … hover:text-foreground`.
  - Side toggle track (L94): `bg-zinc-800/80`→`bg-secondary`. Active toggle (L103): `bg-indigo-600 text-white`→`bg-primary text-primary-foreground` (D2).

- [ ] **Step 5: `roster/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L35, L48, L78); `text-zinc-500`→`text-muted-foreground` (L36, L63, L83); `text-zinc-100`→`text-foreground` (L60).
  - Coach avatar (L55): `bg-emerald-500/20 … text-emerald-400`→`bg-primary/20 … text-primary-emphasis` (decorative brand accent, not success).
  - Coach role pill (L67): `bg-emerald-500/10 … text-emerald-400`→`bg-primary/10 … text-primary-emphasis`.

- [ ] **Step 6: `quizzes/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L25, L55); `text-zinc-500`→`text-muted-foreground` (L26, L42, L59); `border-zinc-800`→`border-border` (L40); `text-zinc-600`→`text-muted-foreground/70` (L43); `text-zinc-700`→`text-muted-foreground/60` (L41); `shadow-indigo-500/25`→`shadow-primary/25` (L32).
  - "Create Quiz" CTA (L32, raw `<Link>`): `bg-indigo-600 … text-white … hover:bg-indigo-500`→`bg-primary … text-primary-foreground … hover:bg-primary/90` (D2, D3).
  - Card hover (L53): `hover:border-zinc-700` → **REMOVE**.

- [ ] **Step 7: `quizzes/[id]/page.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L34, L43, L61); `border-zinc-800`→`border-border` (L42); `text-zinc-600`→`text-muted-foreground/70` (L44); `text-zinc-400`→`text-muted-foreground` (L54); `text-zinc-200`→`text-foreground` (L58).
  - Back arrow (L34): `hover:bg-zinc-800`→`hover:bg-secondary`; `hover:text-zinc-300`→`hover:text-foreground/85`.
  - Question-number circle (L54): `bg-zinc-800`→`bg-secondary`.

- [ ] **Step 8: `quizzes/[id]/quiz-detail-client.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L96, L110); `text-white`→`text-foreground` (L103).
  - Save-confirm ✓ (L82): `text-emerald-500`→`text-success` (D6); `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Cancel X (L96): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Rename pencil (L110): `hover:bg-zinc-800`→`hover:bg-secondary`; `hover:text-zinc-300`→`hover:text-foreground/85`.

- [ ] **Step 9: `analytics/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L45); `text-zinc-500`→`text-muted-foreground` (L46); `text-zinc-400`→`text-muted-foreground` (L84).
  - StatCard props: L56 `"text-white"`→`"text-foreground"`; L61 `"text-green-400"`→`"text-success"`; L66 `"text-amber-400"`→`"text-accent"`; L71 `"text-indigo-400"`→`"text-primary-emphasis"`.
  - Inactive-players alert (D5): L77 `border-amber-500/50`→`border-warning/50`; L79 `text-amber-400`→`text-warning`; L91 `bg-amber-500/10 … text-amber-400`→`bg-warning/10 … text-warning`.

- [ ] **Step 10: `practice/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L26, L48); `text-zinc-500`→`text-muted-foreground` (L27, L37, L52); `border-zinc-800`→`border-border` (L35); `text-zinc-600`→`text-muted-foreground/70` (L38); `text-zinc-700`→`text-muted-foreground/60` (L36).
  - Card hover (L46): `hover:border-zinc-700` → **REMOVE**.

- [ ] **Step 11: `practice/[id]/page.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L48); back link (L48) `hover:text-zinc-300`→`hover:text-foreground/85`.

- [ ] **Step 12: `practice/[id]/editor.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L218, L296); `border-zinc-800`→`border-border` (L239, L268); `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70` (L239); `text-red-400`→`text-destructive` (L255); `text-zinc-500`→`text-muted-foreground` (L276, L283, L315, L321, L340, L375); `hover:text-white`→`hover:text-foreground` (L276, L283); `hover:text-red-400`→`hover:text-destructive` (L321); `text-zinc-400`→`text-muted-foreground` (L335, L357); `text-zinc-600`→`text-muted-foreground/70` (L365).
  - Input hovers/focus (L218, L296): `hover:border-zinc-700`→`hover:border-border` (these are `<input>` borders, **map, do not remove**); `focus:border-zinc-600`→`focus:border-ring` (D4).
  - Total-duration pill (L228): `bg-zinc-800 … text-zinc-300`→`bg-secondary … text-secondary-foreground` (labels a pill surface).
  - Notes textarea (L239): `text-zinc-300`→`text-foreground/85`; `focus:border-zinc-600`→`focus:border-ring`.
  - Delete-plan hover (L255): `hover:text-red-300 hover:border-red-800`→`hover:text-destructive hover:border-destructive/40` (D-red opacity).
  - Period card panel (L268): `bg-zinc-900/50`→`bg-card` (standalone bordered sub-panel, D1).
  - Play-selector chips (L354–357): selected `bg-indigo-600 text-white`→`bg-primary text-primary-foreground`; unselected base `bg-zinc-800`→`bg-secondary`; `hover:bg-zinc-700`→`hover:bg-secondary/80` (D4); `hover:text-zinc-300`→`hover:text-foreground/85`.
  - KEEP `bg-transparent`/`border-transparent` (L218, L239, L296) and `print:*` (no color).

- [ ] **Step 13: `game-plans/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L26, L53); `text-zinc-500`→`text-muted-foreground` (L27, L37, L63); `border-zinc-800`→`border-border` (L35); `text-zinc-600`→`text-muted-foreground/70` (L38); `text-zinc-700`→`text-muted-foreground/60` (L36).
  - Card hover (L47): `hover:border-zinc-700` → **REMOVE**.
  - Active game-plan highlight border (L49): `border-indigo-500`→`border-primary`.
  - "Active" status Badge (L57): `bg-indigo-600 … text-white hover:bg-indigo-600`→`bg-primary … text-primary-foreground hover:bg-primary` (D2; app-supplied className, not the 2b variant).

- [ ] **Step 14: `game-plans/[id]/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L62); `text-zinc-500`→`text-muted-foreground` (L69).
  - "Active" status Badge (L64): `bg-indigo-600 … text-white hover:bg-indigo-600`→`bg-primary … text-primary-foreground hover:bg-primary` (same as Step 13).

- [ ] **Step 15: `game-plans/create-game-plan-dialog.tsx`** (content only)
  - EXCLUDE (2b shell): L67 overlay `bg-black/60`; L68 content `border-zinc-700/60 bg-zinc-900`; L70 title `text-zinc-100`; L73–75 close-X.
  - Content: form labels (L83, L95, L105) `text-zinc-400`→`text-muted-foreground` (×3).

- [ ] **Step 16: `settings/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L33); `text-zinc-500`→`text-muted-foreground` (L34, L47, L53, L59, L79); `text-zinc-100`→`text-foreground` (L48, L54, L78); `text-zinc-400`→`text-muted-foreground` (L60); `text-zinc-600`→`text-muted-foreground/70` (L83).
  - Card hover (L72): `hover:border-zinc-700` → **REMOVE**.
  - Team Files icon container (L74): `bg-emerald-500/10`→`bg-primary/10`. Icon (L75): `text-emerald-400`→`text-primary-emphasis`.

- [ ] **Step 17: `settings/files/page.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L203, L209, L256, L313, L337, L338, L374, L386, L394, L401, L408); `text-white`→`text-foreground` (L208); `border-zinc-800`→`border-border` (L221, L311); `text-zinc-600`→`text-muted-foreground/70` (L222, L314); `border-red-500/30`→`border-destructive/30` (L228); `text-red-400`→`text-destructive` (L229); `text-zinc-400`→`text-muted-foreground` (L244, L265, L275); `text-zinc-200`→`text-foreground` (L383); `hover:text-red-400`→`hover:text-destructive` (L408); `text-zinc-700`→`text-muted-foreground/60` (L312).
  - Back arrow (L203): `hover:bg-zinc-800`→`hover:bg-secondary`; `hover:text-zinc-300`→`hover:text-foreground/85`.
  - Add-form Card border (L238): `border-emerald-500/30`→`border-primary/30` (active-form accent, not success — mirrors quiz-create).
  - Category chips (L255–256): selected `bg-indigo-500/20 text-indigo-300`→`bg-primary/20 text-primary-emphasis`; unselected base `bg-zinc-800`→`bg-secondary`; `hover:text-zinc-300`→`hover:text-foreground/85`.
  - Save-edit ✓ (L363): `text-emerald-500`→`text-success` (D6); `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Cancel-edit (L374), external-link (L394), edit-pencil (L401), delete (L408): each `hover:bg-zinc-800`→`hover:bg-secondary`; L394/L401 also `hover:text-zinc-300`→`hover:text-foreground/85`.

- [ ] **Step 18: Verify** — full contract; screenshot all 13 routes before/after.

- [ ] **Step 19: Commit**
```bash
git add "src/app/(coach)/dashboard" "src/app/(coach)/playbooks" "src/app/(coach)/roster" "src/app/(coach)/quizzes/page.tsx" "src/app/(coach)/quizzes/[id]" "src/app/(coach)/analytics" "src/app/(coach)/practice" "src/app/(coach)/game-plans" "src/app/(coach)/settings"
git commit -m "feat(2c): tokenize coach pages — neutrals to tokens, indigo/emerald to primary, alerts to warning"
```

---

## Task 3: Analytics / game-plan / quiz / roster / dashboard components

**Files (Modify):** `src/components/analytics/stat-card.tsx`, `analytics/leaderboard.tsx`, `analytics/mastery-heatmap.tsx`, `analytics/install-tracker.tsx`, `game-plan/play-list.tsx`, `quiz/quiz-flow.tsx`, `quiz/quiz-card.tsx`, `quiz/multiple-choice.tsx`, `roster/player-card.tsx`, `roster/invite-code-card.tsx`, `dashboard/dashboard-client.tsx`.

**Interfaces:**
- Consumes: tokens (2a); Card/Badge/DropdownMenu + the migrated player-card dialog **shell** (2b).
- Produces: **StatCard** with `color` default `text-foreground` (Task 2's call sites already pass token strings — no signature change; the `color` prop stays `string`).

**Routes to screenshot:** `/dashboard`, `/analytics` (stat-card, leaderboard, mastery-heatmap, install-tracker), `/roster` (player-card, invite-code-card), and a quiz-taking view for quiz-flow/multiple-choice/quiz-card (player `/quiz/[id]`).

- [ ] **Step 1: `stat-card.tsx`**
  - Default prop (L15): `color = "text-white"` → `color = "text-foreground"`.
  - Label (L23), icon (L24): `text-zinc-500`→`text-muted-foreground`. Subtitle (L28): `text-zinc-400`→`text-muted-foreground`.

- [ ] **Step 2: `leaderboard.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L46, L68, L82, L107); `text-zinc-400`→`text-muted-foreground` (L55, L122, L141, L144); `border-zinc-800`→`border-border` (L68); `border-zinc-800/50`→`border-border/50` (L93); `hover:text-zinc-200`→`hover:text-foreground` (L55); `text-white`→`text-foreground` (L115).
  - Active filter chip (L54): `bg-indigo-600 text-white`→`bg-primary text-primary-foreground` (D2).
  - Inactive filter chip (L55): `bg-zinc-800`→`bg-secondary`; `hover:bg-zinc-700`→`hover:bg-secondary/80` (D4).
  - Row hover (L93): `hover:bg-zinc-800/30`→`hover:bg-secondary/30`.
  - Score/name body figures (L115, L131, L135): `text-zinc-300`→`text-foreground/85`.
  - Position pill (L122): `bg-zinc-800`→`bg-secondary`.
  - Medals (gamification, D5): gold L19 `text-yellow-400`+`bg-yellow-400/10`→`text-accent`+`bg-accent/10`; L129 `text-yellow-400`→`text-accent`; silver L20 `text-zinc-300`+`bg-zinc-300/10`→`text-foreground/85`+`bg-foreground/10` (D4); bronze L21 `text-amber-600`+`bg-amber-600/10`→`text-accent`+`bg-accent/10`; L134 `text-amber-600`→`text-accent`.

- [ ] **Step 3: `mastery-heatmap.tsx`**
  - Mechanical: `border-zinc-800`→`border-border` (L41, L49, L75); `text-zinc-400`→`text-muted-foreground` (L53, L59, L110); `text-zinc-500`→`text-muted-foreground` (L41, L80); `text-zinc-100`→`text-foreground` (L77).
  - Surfaces (D1): L41, L49 `bg-zinc-900/50`→`bg-card`; L53, L76 sticky cell `bg-zinc-900`→`bg-card`.
  - Not-viewed cells (L90, L118): `bg-zinc-800`→`bg-secondary`.
  - `masteryColors` scale (L25–28, D11): L25 `bg-green-500`→`bg-success`; L26 `bg-indigo-500`→`bg-primary`; L27 `bg-amber-500`→`bg-warning`; L28 `bg-red-500`→`bg-destructive`.

- [ ] **Step 4: `install-tracker.tsx`**
  - Mechanical: `border-zinc-800`→`border-border` (L17, L40); `text-zinc-500`→`text-muted-foreground` (L17, L46); `text-zinc-400`→`text-muted-foreground` (L25, L52, L66); `text-zinc-100`→`text-foreground` (L43).
  - Surfaces (L17, L40): `bg-zinc-900/50`→`bg-card`.
  - Progress bars: tracks (L58, L72) `bg-zinc-800`→`bg-secondary`; "Viewed" fill (L60) `bg-blue-500`→`bg-primary` (progress); "Quiz Passed" fill (L74) `bg-green-500`→`bg-success` (complete).

- [ ] **Step 5: `play-list.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L153, L192, L243, L249, L265, L270); `text-zinc-600`→`text-muted-foreground/70` (L154, L171, L182); `text-zinc-400`→`text-muted-foreground` (L206, L214, L222, L280); `text-white`→`text-foreground` (L188); `hover:text-white`→`hover:text-foreground` (L206, L214); `text-zinc-200`→`text-foreground` (L238, L262); `hover:text-zinc-300`→`hover:text-foreground/85` (L243, L280); `border-zinc-800`→`border-border` (L152); `border-zinc-700`→`border-border` (L280); `hover:bg-red-900/30`→`hover:bg-destructive/30` (L222); `hover:text-red-400`→`hover:text-destructive` (L222).
  - Card hover (L162): `hover:border-zinc-700` → **REMOVE**.
  - Order-number circle (L166): `bg-zinc-800`→`bg-secondary`; `text-zinc-300`→`text-foreground/85`.
  - Icon-button/picker-item hovers (L206, L214, L243, L259): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Thumbnail placeholder (L174): `bg-green-900/30`→`bg-secondary` (D13, decorative).
  - Add-play dashed hover (L280): `hover:border-zinc-600`→`hover:border-border` (D4).

- [ ] **Step 6: `quiz-flow.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L88, L89, L113, L154); `text-zinc-400`→`text-muted-foreground` (L90, L134); `text-zinc-500`→`text-muted-foreground` (L102, L114, L155); `border-zinc-800`→`border-border` (L109); submit-error (L180) `border-red-500/30 bg-red-500/10 text-red-400`→`border-destructive/30 bg-destructive/10 text-destructive`.
  - Complete ✓ (L87): `text-green-400`→`text-success`.
  - XP-earned text (L95): `text-indigo-400`→`text-accent` (D5, gamification).
  - New-badge item (L109): `bg-zinc-900/60`→`bg-secondary` (D1).
  - Progress bar: track (L161) `bg-zinc-800`→`bg-secondary`; fill (L163) `bg-blue-500`→`bg-primary`.

- [ ] **Step 7: `quiz-card.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L35); `text-zinc-500`→`text-muted-foreground` (L40); overdue badge (L55) `border-red-800 … text-red-400`→`border-destructive … text-destructive`.
  - Card hover (L28): `hover:border-zinc-700` → **REMOVE**.
  - Quiz-icon badge (L30): `bg-blue-900/30`→`bg-primary/30`; glyph (L31) `text-blue-400`→`text-primary-emphasis` (decorative icon accent → primary).

- [ ] **Step 8: `multiple-choice.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L38); `border-zinc-800`→`border-border` (L45); `text-zinc-200`→`text-foreground` (L69).
  - Default option (L45): `bg-zinc-900/50`→`bg-secondary`; `hover:border-zinc-600`→`hover:border-border` (D4).
  - A/B/C/D label chip (L66): `bg-zinc-800`→`bg-secondary`; `text-zinc-300`→`text-foreground/85`.
  - Correct (L47, L51, L73): `border-green-700 bg-green-900/30`→`border-success bg-success/30`; `border-green-700/50 bg-green-900/20`→`border-success/50 bg-success/20`; `text-green-400`→`text-success`.
  - Incorrect (L49, L76): `border-red-700 bg-red-900/30`→`border-destructive bg-destructive/30`; `text-red-400`→`text-destructive`.

- [ ] **Step 9: `player-card.tsx`** (dialog shell is 2b)
  - Mechanical: `text-zinc-100`→`text-foreground` (L81); `text-zinc-500`→`text-muted-foreground` (L84, L96, L126); `text-zinc-600`→`text-muted-foreground/70` (L89); `hover:text-white`→`hover:text-foreground` (L96); `text-white`→`text-foreground` (L115, L135); `text-zinc-400`→`text-muted-foreground` (L118); `hover:text-zinc-300`→`hover:text-foreground/85` (L126); `border-white/10`→`border-border` (L135); error (L152) `border-red-500/20 bg-red-500/10 text-red-400`→`border-destructive/20 bg-destructive/10 text-destructive`.
  - Avatar initial (L77): `bg-emerald-500/20`→`bg-primary/20`; `text-emerald-400`→`text-primary-emphasis` (decorative brand, not success).
  - Dropdown-trigger hover (L96): `hover:bg-white/[0.06]`→`hover:bg-secondary`.
  - Dialog close hover (L126): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Temp-password code field (L135): `bg-white/[0.04]`→`bg-secondary`.
  - EXCLUDE (2b shell): overlay (L111) `bg-black/60`, panel (L112) `bg-zinc-900 border-zinc-700/60`, close-X. If 2b did NOT migrate this dialog (verify), then also apply: overlay → KEEP `bg-black/60` (D9), panel `bg-zinc-900`→`bg-card` + `border-zinc-700/60`→`border-border/60`.

- [ ] **Step 10: `invite-code-card.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L79); `text-zinc-500`→`text-muted-foreground` (L225, L248).
  - Invite-code display box (L79): `bg-zinc-800`→`bg-secondary`. QR container (L216): `bg-zinc-800/50`→`bg-secondary`.

- [ ] **Step 11: `dashboard-client.tsx`**
  - Greeting (L63): `text-white`→`text-foreground`. Subtitle (L66): `text-zinc-400`→`text-muted-foreground`.

- [ ] **Step 12: Verify** — full contract; screenshot `/dashboard`, `/analytics`, `/roster`, `/quiz/[id]` before/after.

- [ ] **Step 13: Commit**
```bash
git add src/components/analytics src/components/game-plan src/components/quiz src/components/roster src/components/dashboard
git commit -m "feat(2c): tokenize analytics/quiz/roster components — progress bars, medals, mastery scale to tokens"
```

---

## Task 4: Player app + player components

**Files (Modify):** `src/app/(player)/home/page.tsx`, `plays/page.tsx`, `plays/[id]/page.tsx`, `plays/[id]/assignment-toggle.tsx`, `quiz/page.tsx`, `quiz/[id]/page.tsx`, `progress/page.tsx`, `src/components/player/player-home-client.tsx`.

**Interfaces:**
- Consumes: tokens (2a); Card/Button primitives (2b).
- Produces: nothing later tasks depend on.

**Gamification rule (D5):** level / XP / streak / rank / medal → `accent` (amber). Interactive/navigational (toggles, section headers, position badge, "reviewing" status) → `primary`. "Mastered"/"complete" → `success`. Mastery scale (D11) matches Task 3's heatmap.

**Routes to screenshot:** `/home`, `/plays`, `/plays/[id]`, `/quiz`, `/quiz/[id]`, `/progress`.

- [ ] **Step 1: `home/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L116, L142, L175, L206, L231); `text-zinc-500`→`text-muted-foreground` (L87, L94, L146, L180, L228); `text-zinc-400`→`text-muted-foreground` (L210); `text-zinc-600`→`text-muted-foreground/70` (L215, L234); `text-green-400`→`text-success` (L205, mastery Trophy).
  - Level badge (L82): `bg-indigo-600/20`→`bg-accent/20`; `text-indigo-400`→`text-accent` (gamification).
  - XP bar: track (L98) `bg-zinc-800`→`bg-secondary`; fill (L100) `bg-indigo-500`→`bg-accent`.
  - No-plays notice (L111, L113): `border-l-amber-500`→`border-l-warning`; `text-amber-400`→`text-warning` (attention state, D5).
  - Due-for-review (L128, L130, L141): `border-l-amber-500`→`border-l-warning`; `text-amber-400`→`text-warning` (×2, L130 label + L141 icon). Row hover (L138): `hover:bg-zinc-800/50`→`hover:bg-secondary/50`.
  - Quizzes section (L161, L163, L174): `border-l-indigo-500`→`border-l-primary`; `text-indigo-400`→`text-primary-emphasis` (×2, nav/content). Row hover (L171): `hover:bg-zinc-800/50`→`hover:bg-secondary/50`.

- [ ] **Step 2: `plays/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L40); `text-zinc-500`→`text-muted-foreground` (L41, L49); `text-zinc-600`→`text-muted-foreground/70` (L50); `border-zinc-800`→`border-border` (L47); `text-zinc-700`→`text-muted-foreground/60` (L48).

- [ ] **Step 3: `plays/[id]/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L84); `text-zinc-500`→`text-muted-foreground` (L109, L130); `text-zinc-400`→`text-muted-foreground` (L117).
  - Position badge (L91): `border-indigo-500/40`→`border-primary/40`; `text-indigo-400`→`text-primary-emphasis` (info/nav).
  - Coach notes body (L133): `text-zinc-300`→`text-foreground/85`.

- [ ] **Step 4: `plays/[id]/assignment-toggle.tsx`**
  - Mechanical: `text-zinc-400`→`text-muted-foreground` (L32, L43, L67); `hover:text-zinc-200`→`hover:text-foreground` (L32, L43); `text-zinc-500`→`text-muted-foreground` (L60, L72); `text-zinc-200`→`text-foreground` (L64).
  - Track (L26): `bg-zinc-800/80`→`bg-secondary`.
  - Active toggles (L31, L41): `bg-indigo-600`→`bg-primary`; `text-white`→`text-primary-foreground` (D2; interactive selection → primary).

- [ ] **Step 5: `quiz/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L22); `text-zinc-500`→`text-muted-foreground` (L23, L31); `text-zinc-600`→`text-muted-foreground/70` (L32); `border-zinc-800`→`border-border` (L29); `text-zinc-700`→`text-muted-foreground/60` (L30).

- [ ] **Step 6: `quiz/[id]/page.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L32); `text-zinc-600`→`text-muted-foreground/70` (L33); `border-zinc-800`→`border-border` (L30); `text-zinc-700`→`text-muted-foreground/60` (L31).

- [ ] **Step 7: `progress/page.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L93, L109, L150, L288); `text-zinc-500`→`text-muted-foreground` (L94, L112, L128, L153, L165, L193, L207, L229, L267, L279); `text-zinc-600`→`text-muted-foreground/70` (L208, L291); `border-zinc-800`→`border-border` (L205); `text-zinc-700`→`text-muted-foreground/60` (L206).
  - `MASTERY_COLORS` scale (L20–24, D11): mastered L21 `bg-green-900/30`→`bg-success/20`, `text-green-400`→`text-success`, `bg-green-500`→`bg-success`; reviewing L22 `bg-indigo-900/30`→`bg-primary/20`, `text-indigo-400`→`text-primary-emphasis`, `bg-indigo-500`→`bg-primary`; learning L23 `bg-amber-900/30`→`bg-warning/20`, `text-amber-400`→`text-warning`, `bg-amber-500`→`bg-warning`; new L24 `bg-red-900/30`→`bg-destructive/20`, `text-red-400`→`text-destructive`, `bg-red-500`→`bg-destructive`.
  - Level circle (L105): `bg-indigo-600`→`bg-accent`; `text-white`→`text-primary-foreground` (D2, on-color; gamification level).
  - Streak pill (L118, L120): `bg-amber-900/30`→`bg-accent/20`; `text-amber-400`→`text-accent` (gamification).
  - XP bar: track (L132) `bg-zinc-800`→`bg-secondary`; fill (L134) `bg-indigo-500`→`bg-accent`.
  - Rank Trophy (L146, L147): `bg-amber-600/20`→`bg-accent/20`; `text-amber-400`→`text-accent`.
  - Earned-badge tile (L173, L177): `bg-zinc-800/50`→`surface-1` (raised tile, D1); `text-zinc-300`→`text-secondary-foreground` (labels the tile).
  - Locked-badge tile (L189): `bg-zinc-800/20`→`surface-1`.

- [ ] **Step 8: `player-home-client.tsx`**
  - Mechanical: `text-white`→`text-foreground` (L44).
  - AnimatedProgressBar (L59, L61): track `bg-zinc-800`→`bg-secondary`; fill `bg-green-500`→`bg-success` (mastery, not XP).
  - PulseWrapper glow (L80): the framer-motion `boxShadow` stops `rgba(245,158,11,a)` (amber-500) → `rgba(217,119,6,a)` (accent token, D3/D5) — normalize each stop; keep the `0 / 0.1 / 0` alpha ramp.

- [ ] **Step 9: Verify** — full contract; screenshot all 6 player routes before/after.

- [ ] **Step 10: Commit**
```bash
git add "src/app/(player)/home" "src/app/(player)/plays" "src/app/(player)/quiz" "src/app/(player)/progress" src/components/player
git commit -m "feat(2c): tokenize player app — gamification to accent, nav to primary, mastery scale to tokens"
```

---

## Task 5: Play components (except play-toolbar)

**Files (Modify):** `src/components/play/play-library.tsx`, `assignment-panel.tsx`, `ai-generator.tsx`, `playbook-filters.tsx`, `route-picker.tsx`, `formation-picker.tsx`, `player-plays-filters.tsx`, `share-playbook.tsx`, `version-history.tsx`, `print-layout.tsx`, `play-viewer.tsx`, `animation-controls.tsx`, `film-link.tsx`, `play-card.tsx`, and the test `tests/components/play/assignment-panel.test.tsx` (assertion follows the class change).

**Interfaces:**
- Consumes: tokens + `offense`/`defense`/`surface-*` (2a); Button/Input/Card/DropdownMenu + the 2b Select wrapper (ai-generator formation select, playbook-filters selects) + the 2b SegmentedControl (animation-controls speed toggle).
- Produces: nothing later tasks depend on.

**Recurring rules here:** surface trichotomy (D1: modal/panel/grid-card → `bg-card`; input/track/chip/hover → `bg-secondary`); indigo → `primary`; card `hover:border-zinc-700` → REMOVE (drop the paired `hover:bg-zinc-800/60` too); offense/defense classes → tokens (D8); SVG hex props out of scope (D10); scrims kept (D9).

**Routes to screenshot:** `/designer` (open the Play Library, AI Generator, route picker, formation picker, version history, film-link, animation controls), `/plays/[id]` (play-viewer, play-card), and the print preview.

- [ ] **Step 1: `play-library.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L73, L81, L99, L112, L131, L134); `hover:text-zinc-300`→`hover:text-foreground/85` (L73, L99, L112); `border-zinc-800`→`border-border` (L69, L125); `border-zinc-700/60`→`border-border/60` (L67); `border-zinc-700/50`→`border-border/50` (L87); `text-zinc-100`→`text-foreground` (L70); `text-zinc-200`→`text-foreground` (L87, L128); `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70` (L87); `group-hover:text-white`→`group-hover:text-foreground` (L128); `text-zinc-600`→`text-muted-foreground/70` (L158).
  - Scrim (L66): `bg-black/50` → **KEEP** (D9).
  - Modal container (L67): `bg-zinc-900`→`bg-card`.
  - Search input (L87): `bg-zinc-800/50`→`bg-secondary`; `focus:border-indigo-500/50`→`focus:border-primary/50`.
  - Category tabs (L98, L111): `bg-indigo-500/20 text-indigo-300`→`bg-primary/20 text-primary-emphasis`.
  - Card item (L125): `bg-zinc-900/50`→`bg-card`; `hover:border-zinc-700` → **REMOVE**; `hover:bg-zinc-800/60` → **REMOVE**.
  - Import CTA (L149): `bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30`→`bg-primary/20 text-primary-emphasis hover:bg-primary/30`.
  - Ghost hovers (L73, L99, L112): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - **Play-type badge palette (L30–40, D12 — RESOLVED: KEEP AS-IS):** do NOT modify the `playTypeBadge` map (pass/run/play_action/screen/special/default keep their existing classes verbatim, including the default's `bg-zinc-500/20 text-zinc-300`). Add the comment line directly above the map: `// play-type categorical palette — tokenize as --category-* in Phase 3 (allowlisted in Phase 2 gates)`. Migrate everything ELSE in this file per the tables.

- [ ] **Step 2: `assignment-panel.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L143, L170, L197, L231, L257); `text-zinc-600`→`text-muted-foreground/70` (L160, L203); `hover:text-zinc-300`→`hover:text-foreground/85` (L160); `text-zinc-400`→`text-muted-foreground` (L217, L247, L258); `hover:text-zinc-200`→`hover:text-foreground` (L217); `text-white`→`text-foreground` (L140, heading on panel); `border-zinc-700/50`→`border-border/50` (L56, L247); `border-zinc-800`→`border-border` (L256); `border-white/[0.06]`→`border-border` (L123).
  - Active line-style button (L55, L96): `border-indigo-500/60 bg-indigo-500/10`→`border-primary/60 bg-primary/10`; `text-indigo-300`→`text-primary-emphasis`.
  - Inactive line-style (L56): `bg-zinc-800/50`→`bg-secondary`; `hover:border-zinc-600`→`hover:border-border` (D4).
  - Panel container (L123): `bg-zinc-900/90`→`bg-card`.
  - Player circle text (L131): `text-white`→`text-primary-foreground` (on offense/defense fill).
  - **Offense (L133, D8):** `bg-blue-600`→`bg-offense`; `shadow-blue-500/25`→`shadow-offense/25`. Offense label (L149): `text-blue-400`→`text-offense`.
  - **Defense (L134, D8):** `bg-red-600`→`bg-defense`; `shadow-red-500/25`→`shadow-defense/25`. Defense label (L151): `text-red-400`→`text-defense`.
  - Middot (L145): `text-zinc-700`→`text-muted-foreground/60` (D4).
  - Active route-type pill (L216): `bg-indigo-600 text-white`→`bg-primary text-primary-foreground`.
  - Inactive route-type pill (L217): `bg-zinc-800`→`bg-secondary`; `hover:bg-zinc-700`→`hover:bg-secondary/80`.
  - Waypoints chip (L231): `bg-zinc-800/50`→`bg-secondary`.
  - **Clear-Route DESTRUCTIVE button (L240, D8):** `border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10`→`border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10` (delete action, NOT defense).
  - Mirror button (L247): `bg-zinc-800/50 … hover:bg-zinc-800`→`bg-secondary … hover:bg-secondary/80`. Kbd chip (L258): `bg-zinc-800`→`bg-secondary`.
  - SVG line-preview `stroke="#818cf8"`/`"#a1a1aa"` (L66, L76, L87): **OUT OF SCOPE** (D10).
  - **Test update:** `tests/components/play/assignment-panel.test.tsx:33` asserts the active "Slant" pill `.className` `toContain("bg-indigo-600")` — change to `toContain("bg-primary")` to match the L216 pill remap. (This is the only test in `tests/**` that asserts on a 2c-changed color class.)

- [ ] **Step 3: `ai-generator.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L101, L226, L230); `text-zinc-400`→`text-muted-foreground` (L111, L130, L185, L213); `hover:text-zinc-300`→`hover:text-foreground/85` (L101); `hover:text-zinc-200`→`hover:text-foreground` (L213); `text-zinc-600`→`text-muted-foreground/70` (L205, L225); `text-zinc-100`→`text-foreground` (L95); `text-white`→`text-foreground` (L119, textarea); `text-zinc-300`→`text-foreground/85` (L136); `border-zinc-800`→`border-border` (L92, L224); `border-zinc-700/50`→`border-border/50` (L119, L136); `placeholder-zinc-600`→`placeholder-muted-foreground/70` (L119); `border-white/[0.06]`→`border-border` (L89).
  - Panel container (L89): `bg-zinc-900/95`→`bg-card`.
  - AI spark icon (L94): `text-violet-400`→`text-accent` (D5 highlight/spark).
  - Textarea (L119) + formation select (L136): `bg-zinc-800/80`→`bg-secondary`; `focus:border-violet-500/50`→`focus:border-primary/50`. (If 2b migrated the formation select to the Select wrapper, EXCLUDE L136's inner classes.)
  - Generate CTA (L151): `bg-violet-600 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500`→`bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90` (D2, D3).
  - Error box (L168): `border-red-500/20 bg-red-500/10 text-red-400`→`border-destructive/20 bg-destructive/10 text-destructive`.
  - Success box (L180, L181): `border-emerald-500/20 bg-emerald-500/10`→`border-success/20 bg-success/10`; `text-emerald-400`→`text-success` (generation success state).
  - "Apply to Canvas" CTA (L195): `bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500`→`bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90` (an action CTA → primary, even inside the success block).
  - Ghost hovers (L101, L213): `hover:bg-zinc-800`→`hover:bg-secondary`. Kbd chips (L226, L230): `bg-zinc-800`→`bg-secondary`.

- [ ] **Step 4: `playbook-filters.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L100, L128, L143, L192); `text-zinc-400`→`text-muted-foreground` (L152, L171); `hover:text-zinc-200`→`hover:text-foreground` (L152, L171); `text-zinc-300`→`text-foreground/85` (L115, L132); `text-zinc-600`→`text-muted-foreground/70` (L184); `text-white`→`text-foreground` (L106); `border-zinc-800`→`border-border` (L106, L115, L132, L191); `placeholder-zinc-600`→`placeholder-muted-foreground/70` (L106); divider (L163) `bg-zinc-700/50`→`bg-border`.
  - Search input (L106): `bg-zinc-900/50`→`bg-secondary`; `focus:border-indigo-500/50`→`focus:border-primary/50`.
  - Selects (L115, L132): `bg-zinc-900/50 … focus:border-indigo-500/50`→`bg-secondary … focus:border-primary/50`. (If 2b migrated these to the Select wrapper, EXCLUDE their inner classes.)
  - Play-type track (L144): `bg-zinc-800/80`→`bg-secondary`. Active segment (L151): `bg-indigo-600 text-white shadow-sm`→`bg-primary text-primary-foreground shadow-sm`.
  - Situation pills (L168–171): active `bg-indigo-600 text-white`→`bg-primary text-primary-foreground`; inactive `bg-zinc-800 … hover:bg-zinc-700 hover:text-zinc-200`→`bg-secondary … hover:bg-secondary/80 hover:text-foreground`.
  - Clear-all link (L200): `text-indigo-400 hover:text-indigo-300`→`text-primary-emphasis hover:text-primary`.

- [ ] **Step 5: `route-picker.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L112, L120, L142); `hover:text-zinc-300`→`hover:text-foreground/85` (L112, L142); `text-zinc-100`→`text-foreground` (L109); `text-zinc-200`→`text-foreground` (L126, L160); `group-hover:text-white`→`group-hover:text-foreground` (L160); `text-zinc-600`→`text-muted-foreground/70` (L170); `border-zinc-800`→`border-border` (L108, L156); `border-zinc-700/60`→`border-border/60` (L106); `border-zinc-700/50`→`border-border/50` (L126); `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70` (L126).
  - Scrim (L105): `bg-black/50` → **KEEP** (D9).
  - Modal container (L106): `bg-zinc-900`→`bg-card`.
  - Search input (L126): `bg-zinc-800/50`→`bg-secondary`; `focus:border-indigo-500/50`→`focus:border-primary/50`.
  - Active tab (L141): `bg-indigo-500/20 text-indigo-300`→`bg-primary/20 text-primary-emphasis`.
  - Card item (L156): `bg-zinc-900/50`→`bg-card`; `hover:border-zinc-700` → **REMOVE**; `hover:bg-zinc-800/60` → **REMOVE**.
  - Ghost hovers (L112, L142): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - SVG route-preview hex (L57, L63, L70): **OUT OF SCOPE** (D10).

- [ ] **Step 6: `formation-picker.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L110, L117, L125); `hover:text-zinc-300`→`hover:text-foreground/85` (L117); `text-zinc-200`→`text-foreground` (L106, L131); `text-zinc-400`→`text-muted-foreground` (L158); `group-hover:text-zinc-200`→`group-hover:text-foreground` (L158); `text-zinc-600`→`text-muted-foreground/70` (L173); `border-zinc-800`→`border-border` (L147); `border-zinc-700/50`→`border-border/50` (L131); `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70` (L131).
  - Close hover (L117): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Filter input (L131): `bg-zinc-800/50`→`bg-secondary`; `focus:border-indigo-500/50`→`focus:border-primary/50`.
  - Selected card (L146): `border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]`→`border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(15,118,110,0.15)]` (D3 glow).
  - Unselected card (L147): `bg-zinc-900/50`→`bg-card`; `hover:border-zinc-700` → **REMOVE**; `hover:bg-zinc-800/60` → **REMOVE**.
  - Selected label (L158): `text-indigo-300`→`text-primary-emphasis`. Check icon (L164): `text-indigo-400`→`text-primary-emphasis`.
  - SVG minimap dot hex (L45–48): **OUT OF SCOPE** (D10).

- [ ] **Step 7: `player-plays-filters.tsx`**
  - Mechanical: `text-zinc-500`→`text-muted-foreground` (L55, L67, L94, L116); `text-zinc-400`→`text-muted-foreground` (L76); `hover:text-zinc-200`→`hover:text-foreground` (L76); `text-white`→`text-foreground` (L61, L113); `text-zinc-600`→`text-muted-foreground/70` (L87, L124); `border-zinc-800`→`border-border` (L61, L93); `placeholder-zinc-600`→`placeholder-muted-foreground/70` (L61).
  - Search input (L61): `bg-zinc-900/50 … focus:border-indigo-500/50`→`bg-secondary … focus:border-primary/50`.
  - Play-type track (L68): `bg-zinc-800/80`→`bg-secondary`. Active segment (L75): `bg-indigo-600 text-white shadow-sm`→`bg-primary text-primary-foreground shadow-sm`.
  - Clear link (L100): `text-indigo-400 hover:text-indigo-300`→`text-primary-emphasis hover:text-primary`.
  - Card hover (L109): `hover:border-zinc-700` → **REMOVE**.

- [ ] **Step 8: `share-playbook.tsx`**
  - Mechanical: `border-zinc-800`→`border-border` (L76); `text-white`→`text-foreground` (L78, L117); `text-zinc-500`→`text-muted-foreground` (L81, L108, L120); `hover:text-zinc-300`→`hover:text-foreground/85` (L81).
  - Panel container (L76): `bg-[#111122]`→`bg-card` (D-arbitrary hex → nearest surface).
  - Shared-with row (L114): `bg-zinc-800/50`→`bg-secondary`.
  - Error text (L104): `text-red-400`→`text-destructive`. Revoke button (L126): `text-red-400 hover:text-red-300`→`text-destructive hover:text-destructive/90`.

- [ ] **Step 9: `version-history.tsx`**
  - Mechanical: `border-white/[0.06]`→`border-border` (L70); `border-zinc-800`→`border-border` (L73); `text-zinc-100`→`text-foreground` (L74); `text-zinc-500`→`text-muted-foreground` (L80, L90, L93, L139); `hover:text-zinc-300`→`hover:text-foreground/85` (L80); `text-zinc-200`→`text-foreground` (L113); `text-zinc-400`→`text-muted-foreground` (L144).
  - Panel (L70): `bg-zinc-900/95`→`bg-card`.
  - Close hover (L80): `hover:bg-zinc-800`→`hover:bg-secondary`.
  - Selected item (L108): `border-indigo-500/50 bg-indigo-500/10`→`border-primary/50 bg-primary/10`.
  - Item hover (L109): `hover:bg-zinc-800/80`→`hover:bg-secondary`; keep `border-transparent`.
  - "Latest" badge (L116): `bg-indigo-600/20 … text-indigo-400`→`bg-primary/20 … text-primary-emphasis`.
  - Restore button (L128): `bg-indigo-600 … text-white … hover:bg-indigo-500`→`bg-primary … text-primary-foreground … hover:bg-primary/90` (D2).

- [ ] **Step 10: `print-layout.tsx`** (D14 — print paper, mostly EXCLUDED)
  - ONLY change the two screen-context helpers: L44, L104 `text-zinc-500 print:hidden`→`text-muted-foreground print:hidden`.
  - KEEP all `bg-white` / `text-black` / `text-gray-*` / `border-gray-*` / `border-black` / `border-zinc-700` (L52, L60, L71, L75, L79, L85, L112, L115, L116, L117, L129, L137, L138, L141, L148) — intentional print ink/paper; allowlisted in the gate.

- [ ] **Step 11: `play-viewer.tsx`**
  - Download button (L75): `bg-zinc-900/70`→`bg-card/70`; `text-zinc-400`→`text-muted-foreground`; `hover:bg-zinc-800`→`hover:bg-secondary`; `hover:text-white`→`hover:text-foreground`.

- [ ] **Step 12: `animation-controls.tsx`** (speed toggle is 2b)
  - Mechanical: `border-white/[0.08]`→`border-border` (L214); `bg-zinc-950/80`→`bg-card` (floating control bar → card, D1); `text-zinc-400`→`text-muted-foreground` (L219, L226, L246, L253, L289); `hover:text-white`→`hover:text-foreground` (L219, L226, L246, L253).
  - Transport hovers (L219, L226, L246, L253): `hover:bg-white/10`→`hover:bg-secondary`.
  - Play/pause button (L234): `bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 … hover:bg-indigo-500 hover:shadow-indigo-500/50`→`bg-primary text-primary-foreground shadow-lg shadow-primary/30 … hover:bg-primary/90 hover:shadow-primary/50` (D2, D3).
  - Scrubber track (L264): `bg-zinc-700/60`→`bg-secondary`. Fill (L267): `bg-gradient-to-r from-indigo-500 to-indigo-400`→`from-primary to-primary-emphasis`. Thumb (L283): `bg-indigo-500`→`bg-primary`; keep `border-white` (high-contrast thumb ring) or → `border-foreground` (choose `border-foreground` for token purity).
  - EXCLUDE (2b speed toggle, L294–309): container `bg-zinc-800/60`, active `bg-indigo-600 text-white`, inactive `text-zinc-400 hover:text-zinc-200`.

- [ ] **Step 13: `film-link.tsx`**
  - Mechanical: `text-zinc-400`→`text-muted-foreground` (L44, L53); `border-zinc-700/50`→`border-border` (L50, L62); `text-zinc-200`→`text-foreground` (L50, L62); `placeholder:text-zinc-600`→`placeholder:text-muted-foreground/70` (L50, L62).
  - Input fields (L50, L62): `bg-zinc-800/80`→`bg-secondary`; `focus:border-indigo-500/50`→`focus:border-ring`.
  - Watch-film links (L70, L100): `text-indigo-400 hover:text-indigo-300`→`text-primary-emphasis hover:text-primary`.

- [ ] **Step 14: `play-card.tsx`**
  - Mechanical: `text-zinc-600`→`text-muted-foreground/70` (L68); `text-white`→`text-foreground` (L72); `text-zinc-500`→`text-muted-foreground` (L74); `text-zinc-400`→`text-muted-foreground` (L88); `hover:text-white`→`hover:text-foreground` (L88, L96); `text-zinc-300`→`text-foreground/85` (L96).
  - Card hover (L57): `hover:border-zinc-700` → **REMOVE**.
  - Thumbnail placeholder (L59): `bg-green-900/30`→`bg-secondary` (D13).
  - Dropdown-trigger (L88): `bg-zinc-900/70`→`bg-card/70`; `hover:bg-zinc-800`→`hover:bg-secondary`. Menu-item hover (L96): `hover:bg-zinc-800`→`hover:bg-secondary`.

- [ ] **Step 15: Verify** — full contract; screenshot `/designer` (with each overlay opened), `/plays/[id]`, print preview before/after.

- [ ] **Step 16: Commit**
```bash
git add src/components/play/play-library.tsx src/components/play/assignment-panel.tsx src/components/play/ai-generator.tsx src/components/play/playbook-filters.tsx src/components/play/route-picker.tsx src/components/play/formation-picker.tsx src/components/play/player-plays-filters.tsx src/components/play/share-playbook.tsx src/components/play/version-history.tsx src/components/play/print-layout.tsx src/components/play/play-viewer.tsx src/components/play/animation-controls.tsx src/components/play/film-link.tsx src/components/play/play-card.tsx tests/components/play/assignment-panel.test.tsx
git commit -m "feat(2c): tokenize play components — offense/defense tokens, indigo/violet to primary, spark to accent"
```

---

## Task 6: Designer page + play-toolbar (the giant surface)

**Files (Modify):** `src/app/(coach)/designer/page.tsx`, `src/components/play/play-toolbar.tsx`.

**Interfaces:**
- Consumes: tokens + `surface-*` (2a); Button/Card + the 2b Dialog (print panel), 2b SegmentedControl (side toggle, print-mode toggle), 2b Select (Format, Coverage).
- Produces: nothing later tasks depend on.

**Mode colors (D7):** draw → `primary`, motion → `accent`, preview → `success`. In `play-toolbar.tsx` rename the `ModeButton` `color` union `"emerald"|"cyan"|"amber"` → `"primary"|"accent"|"success"`, its `activeClass` map keys, and the three call-site `color=` literals.

**Routes to screenshot:** `/designer` — each mode (draw / motion / preview), toolbar dirty (Unsaved) and clean (Saved) states, the overflow popover, and the print dialog.

- [ ] **Step 1: `designer/page.tsx` — neutrals & surfaces**
  - Mechanical: `text-zinc-400`→`text-muted-foreground` (L689, L972, L1033); `text-zinc-500`→`text-muted-foreground` (L770, L918, L937, L1040); `text-zinc-600`→`text-muted-foreground/70` (L766, L796); `text-zinc-300`→`text-foreground/85` (L767, L783, L914, L931, L1041); `text-zinc-200`→`text-foreground` (L679); `hover:text-white`→`hover:text-foreground` (L689, L783, L914); `hover:text-zinc-200`→`hover:text-foreground` (L959, L972); `hover:text-zinc-300`→`hover:text-foreground/85` (L937); kbd chips (L798, L800, L802, L918) `bg-zinc-800`→`bg-secondary`; `border-white/10`→`border-border` (L679, L783); `border-white/[0.08]`→`border-border` (L818); `border-white/[0.06]`→`border-border` (L929, L959, L972); `border-zinc-700`→`border-border` (L765); `border-zinc-800`→`border-border` (L1032); `border-zinc-700/60`→`border-border/60` (L914); `hover:bg-zinc-800`→`hover:bg-secondary` (L914, L959, L972); Play Library button (L783) `bg-white/[0.04] … hover:bg-white/[0.08]`→`bg-secondary … hover:bg-secondary`.
  - Surfaces (D1): draft toast (L679) `bg-zinc-900/95`→`bg-card`; empty-state card (L765) `bg-zinc-900/50`→`bg-card`; formation panel (L818) `bg-zinc-950/95`→`bg-card`; pick-route button (L914) `bg-zinc-900/80`→`bg-card`; film panel (L929) `bg-zinc-900/95`→`bg-card`; film toggle (L959) `bg-zinc-900/80`→`bg-card`; formation-toggle button (L972) `bg-zinc-900/80`→`bg-card`; preview info box (L1032) `bg-zinc-900/50`→`bg-secondary`.

- [ ] **Step 2: `designer/page.tsx` — accents, CTAs, mode banners**
  - Restore CTA (L683): `bg-emerald-600 … text-white … hover:bg-emerald-500`→`bg-primary … text-primary-foreground … hover:bg-primary/90` (D2, D3).
  - **DRAW banner (L707):** `bg-emerald-600/90 … text-white`→`bg-primary/90 … text-primary-foreground`. Its Esc kbd chip (L710) `bg-white/20`→`bg-primary-foreground/20` (D2).
  - **MOTION banner (L729):** `bg-cyan-600/90 … text-white`→`bg-accent/90 … text-primary-foreground` (D7). Esc kbd chip (L736) `bg-white/20`→`bg-primary-foreground/20`.
  - Empty-state heading (L767): `text-zinc-300`→`text-foreground/85` (already in Step 1 mechanical — apply once).
  - Open-Formations CTA (L776): `bg-emerald-600 … text-white shadow-[0_12px_30px_rgba(5,150,105,0.28)] … hover:bg-emerald-500`→`bg-primary … text-primary-foreground shadow-[0_12px_30px_rgba(15,118,110,0.28)] … hover:bg-primary/90`.
  - AI Generator button (L791, D5 highlight): `border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100`→`border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent`.
  - Pick-route hover border (L914): `hover:border-emerald-500/40`→`hover:border-primary/40`.
  - Film-active indicator (L959, D5 highlight): `text-amber-400`→`text-accent` (default `text-zinc-400`→`text-muted-foreground` already mechanical).
  - Print CTA (L1050): `bg-emerald-600 … text-white shadow-lg shadow-emerald-500/25 … hover:bg-emerald-500`→`bg-primary … text-primary-foreground shadow-lg shadow-primary/25 … hover:bg-primary/90`.
  - Preview name span (L1041): `text-zinc-300`→`text-foreground/85` (in Step 1 mechanical).
  - EXCLUDE (2b): side toggle (L821–842), print Dialog shell (L994–1057 — overlay `bg-black/60` KEEP per D9; content/title/close-X are 2b), print-mode toggle (L1008–1028). If 2b has NOT yet claimed the print dialog body, apply Step 1/2 mappings to L1032/L1050 as written; otherwise they move with 2b.

- [ ] **Step 3: `play-toolbar.tsx` — neutrals & surfaces**
  - Mechanical: `text-zinc-400`→`text-muted-foreground` (L177, L242, L432, L459); `text-zinc-500`→`text-muted-foreground` (L258, L276, L365, L371, L491, L494); `hover:text-zinc-200`→`hover:text-foreground` (L177, L242, L432, L459); formation pill + kbd (L160, L494) `bg-zinc-800`→`bg-secondary`; `bg-white/[0.05]`→`bg-secondary` (L168, L188, L381); `hover:bg-white/[0.08]`→`hover:bg-secondary` (L242, L459); `bg-white/[0.08]`→`bg-secondary` (L243); `hover:bg-white/[0.06]`→`hover:bg-secondary` (L488); `text-zinc-200`→`text-foreground` (L243); `text-zinc-300`→`text-foreground/85` (L488); `border-white/[0.08]`→`border-border` (L141, L253); `border-white/[0.06]`→`border-border` (L295, L346); `hover:border-white/10`→`hover:border-border` (L153, input).
  - Root toolbar (L141): `bg-zinc-950/80`→`bg-card` (floating surface, D1). Overflow popover (L253): `bg-zinc-950/95`→`bg-card`.
  - Dividers (L165, L185, L225): `bg-zinc-700/60`→`bg-border` (×3, `h-4 w-px` rules).
  - Name input text (L150): `text-white`→`text-foreground`. Name input focus border (L152): `border-emerald-500/50`→`border-ring/50`.

- [ ] **Step 4: `play-toolbar.tsx` — mode buttons, states, save**
  - Play-type active segment (L176): `bg-emerald-600 text-white shadow-sm`→`bg-primary text-primary-foreground shadow-sm`.
  - **ModeButton `activeClass` map (L419–423) — remap VALUES only; keep the map keys and the `color` union (L414) + call sites (L193/L201/L209/L219) UNCHANGED (D7 default, stays class-strings-only, no `tsc` impact):**
    - `emerald` value `"bg-emerald-600 text-white"` → `"bg-primary text-primary-foreground"` (Select + Draw resolve here).
    - `cyan` value `"bg-cyan-600 text-white"` → `"bg-accent text-primary-foreground"` (Motion).
    - `amber` value `"bg-amber-500 text-white"` → `"bg-success text-primary-foreground"` (Preview).
    - (Optional cleanup, not required: rename keys/union `emerald|cyan|amber` → `primary|accent|success` and the four `color=` literals; if done, re-run `tsc`, and flag as a deviation.)
  - Unsaved dot (L364, D5 state): `fill-amber-400 text-amber-400`→`fill-warning text-warning` (fallback `fill-[var(--warning)]` per D10).
  - Saved check (L369): `text-emerald-500`→`text-success` (D6).
  - Save button (L380): `bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.28)] hover:bg-emerald-500`→`bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(15,118,110,0.28)] hover:bg-primary/90` (D2, D3).
  - ⌘S kbd chip (L391): `bg-white/10 … text-white/50`→`bg-primary-foreground/10 … text-primary-foreground/50` (on-color, D2).
  - OverflowItem active (L487): `bg-emerald-600/20 text-emerald-300`→`bg-primary/20 text-primary-emphasis`.
  - EXCLUDE (2b Select): Format `<select>` (L261–269), Coverage `<select>` + Shield (L280–291).

- [ ] **Step 5: Verify** — full contract (`tsc` especially, for the `ModeButton` union change); screenshot `/designer` in draw/motion/preview modes, toolbar unsaved/saved, print dialog before/after.

- [ ] **Step 6: Commit**
```bash
git add "src/app/(coach)/designer/page.tsx" src/components/play/play-toolbar.tsx
git commit -m "feat(2c): tokenize designer + play-toolbar — mode banners to primary/accent/success, CTAs to primary"
```

---

## Task 7: Quiz-create client (selected/correct unification)

**Files (Modify):** `src/app/(coach)/quizzes/create/quiz-create-client.tsx`.

**Interfaces:**
- Consumes: tokens (2a); Button/Input/Card + the 2b Select wrapper (question-type `<select>`).
- Produces: nothing later tasks depend on.

**Unification rule:** selected/active/interactive (was indigo) → `primary`; correct-answer marker (was emerald) → `success`; incorrect/delete (was red) → `destructive`; the active-form-card accent border (was emerald, NOT a correctness signal) → `primary`.

**Routes to screenshot:** `/quizzes/create` — the play-question form and the custom-question form, with a correct answer marked and a template/category pill selected; the save bar.

- [ ] **Step 1: Mechanical neutrals**
  - `text-white`→`text-foreground` (L199, L237); `text-zinc-200`→`text-foreground` (L314); `text-zinc-400`→`text-muted-foreground` (L213, L223, L376, L395, L479, L514); `text-zinc-500`→`text-muted-foreground` (L194, L200, L270, L288, L295, L304, L332, L348, L355, L571); `text-zinc-600`→`text-muted-foreground/70` (L271, L284); `text-zinc-700`→`text-muted-foreground/60` (L269); `hover:text-zinc-300`→`hover:text-foreground/85` (L194, L288, L295, L348); `hover:bg-zinc-800`→`hover:bg-secondary` (L194, L288, L295, L348, L355); `border-zinc-800`→`border-border` (L268, L570); `hover:text-red-400`→`hover:text-destructive` (L355, delete).

- [ ] **Step 2: Selected / correct / interactive unification**
  - Preview correct row (L325): `bg-emerald-500/10 text-emerald-400`→`bg-success/10 text-success`.
  - Preview non-correct row (L326): `bg-zinc-800/50 text-zinc-400`→`bg-secondary text-muted-foreground`.
  - Play-form Card accent border (L369): `border-emerald-500/30`→`border-primary/30` (active-form accent, NOT correctness).
  - Play-form template pill selected (L406): `bg-indigo-500/20 text-indigo-300`→`bg-primary/10 text-primary-emphasis`.
  - Play-form template pill unselected (L407): `bg-zinc-800 text-zinc-500 hover:text-zinc-300`→`bg-secondary text-muted-foreground hover:text-foreground/85`.
  - Play-form correct-marker active (L429): `border-emerald-500 bg-emerald-500/20 text-emerald-400`→`border-success bg-success/10 text-success`.
  - Play-form marker not-correct (L430): `border-zinc-700 text-zinc-500 hover:border-zinc-500`→`border-border text-muted-foreground hover:border-border` (D4).
  - Custom-form Card accent border (L472): `border-emerald-500/30`→`border-primary/30`.
  - Custom-form category pill selected (L490): `bg-indigo-500/20 text-indigo-300`→`bg-primary/10 text-primary-emphasis`.
  - Custom-form category pill unselected (L491): `bg-zinc-800 text-zinc-500 hover:text-zinc-300`→`bg-secondary text-muted-foreground hover:text-foreground/85`.
  - Custom-form correct-marker active (L525): `border-emerald-500 bg-emerald-500/20 text-emerald-400`→`border-success bg-success/10 text-success`.
  - Custom-form marker not-correct (L526): `border-zinc-700 text-zinc-500 hover:border-zinc-500`→`border-border text-muted-foreground hover:border-border`.
  - Save-bar panel (L570): `border border-zinc-800 bg-zinc-900/80`→`border border-border bg-card` (standalone action bar, D1).
  - EXCLUDE (2b Select): question-type `<select>` (L379–390): `border-zinc-700 bg-zinc-800/50 text-zinc-100 focus-visible:ring-indigo-500` route to the 2b Select wrapper.

- [ ] **Step 3: Verify** — full contract; screenshot `/quizzes/create` (both forms, a marked-correct answer, a selected pill, the save bar) before/after. Confirm the old indigo-selected / emerald-correct mix now reads as primary-selected + success-correct consistently.

- [ ] **Step 4: Commit**
```bash
git add "src/app/(coach)/quizzes/create/quiz-create-client.tsx"
git commit -m "feat(2c): unify quiz-create — selected to primary, correct-answer to success"
```

---

## Task 8: Grep gates + full phase-close verification

**Files:** none modified — this task is the acceptance gate. It also carries the two justified allowlists.

**Interfaces:**
- Consumes: the migrated tree (Tasks 1–7).
- Produces: proof that Phase 2c's §2 + §4 goals hold.

**Allowlists (justified exceptions):**
1. `src/components/play/print-layout.tsx` — print paper/ink (`bg-white`, `text-black`, `text-gray-*`, `border-gray-*`, `border-black`, plus `border-zinc-700` on the paper cards), per D14. These render a light print view, not app UI.
2. Google "G" OAuth SVG fills in `login/page.tsx` + `signup/page.tsx` (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`), per D15 — brand-mandated.
3. Modal/nav scrims `bg-black/40..70` (coach-sidebar mobile overlay, play-library + route-picker modal scrims, and any 2b dialog overlays), per D9 — a scrim must dim in both themes.
4. The `playTypeBadge` categorical palette in `src/components/play/play-library.tsx` (blue/emerald/amber/purple/pink/zinc chips), per D12 — informational play-type color-coding kept by team-lead decision; tokenize as `--category-*` in Phase 3.

- [ ] **Step 1: Accent gate — must be ZERO (excluding the print allowlist file)**

Run (Windows PowerShell or Git Bash — ripgrep):
```bash
rg -n --glob 'src/app/**' --glob 'src/components/**' 'indigo-|violet-' src/
rg -n --glob 'src/app/**' --glob 'src/components/**' '\bblue-' src/ | rg -v 'print-layout.tsx|play-library.tsx'
```
Expected: **no matches.** (`offense` is a token, not a `blue-` class, so it will not appear.) If any line prints, fix it in the owning task's file and re-run.

- [ ] **Step 2: Neutral gate — ZERO outside the print allowlist**
```bash
rg -n 'zinc-|slate-|gray-|neutral-' src/app src/components | rg -v 'src/components/play/print-layout.tsx|src/components/play/play-library.tsx'
```
Expected: **no matches.** Any hit outside `print-layout.tsx` is a miss — fix in the owning task.

- [ ] **Step 3: White/black + arbitrary-hex gate (advisor extension) — only the allowlist remains**
```bash
rg -n '(text|bg|border|fill|stroke|ring|from|via|to|divide|outline|ring-offset)-(white|black)' src/app src/components | rg -v 'print-layout.tsx'
rg -n '\[#' src/app src/components | rg -v 'print-layout.tsx'
```
Expected matches ONLY: `bg-black/40..70` scrims (allowlist 3), `bg-primary-foreground/*` on-color chips (these contain `-foreground`, not bare `white`, so they will NOT match), and the Google `#…` fills in login/signup (allowlist 2). Anything else — e.g. a stray `text-white`, `bg-white/[0.06]`, or `bg-[#111122]` — is a miss; fix it. (`bg-primary-foreground` and `border-border` deliberately do not match the white/black pattern.)

- [ ] **Step 4: SVG-hex parked-scope confirmation (informational, not a failure)**
```bash
rg -n 'stroke="#|fill="#' src/app src/components
```
Expected: the route-picker / formation-picker / assignment-panel preview hexes (D10) and Google fills (D15). These are the documented parked-scope set — record them in the phase-close notes; they are NOT gate failures.

- [ ] **Step 5: Full build/typecheck/lint/test**
```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tests 115 green; `tsc` clean; lint no new errors vs the post-2a/2b baseline; build succeeds (confirms every `@theme` utility used — including `fill-warning`/`fill-card`, `bg-offense`/`bg-defense`, `text-primary-emphasis`, `surface-1`/`surface-2` — compiles).

- [ ] **Step 6: Dark visual QA sweep**

With `docker compose -f docker-compose.dev.yml up -d`, `npm run dev`, dev-login `coach@playforge.dev`: capture all routes (coach 13, player 6, auth 3, designer with each mode) and confirm near-identical dark rendering vs the pre-2c baseline. Record the before/after set. (Full **dark+light** QA is the Phase-2-close task in the light-mode plan, not 2c — 2c is dark-anchored.)

- [ ] **Step 7: Commit the verification record**
```bash
git commit --allow-empty -m "chore(2c): phase-close gates green — zero indigo/violet/blue, neutrals tokenized"
```

---

## Self-Review

**1. Spec coverage.** §2 accent table: emerald buttons/rings → primary/ring (Tasks 1–7); emerald-300/400 → primary-emphasis (Tasks 1,2,3,5,6); indigo interactive → primary / gamification → accent (split enforced per-file, Tasks 2–7); violet → primary + spark-accent (Task 5 ai-generator); blue install-tracker → primary/success (Task 3); offense/defense → tokens (Task 5 assignment-panel/formation-picker, D8); stat-card ad-hoc → foreground/success/accent/primary-emphasis (Task 2 call sites + Task 3 component). §4 neutral table: every row mapped, with D4 filling the shades the table omits (zinc-700/700-bg/600-border/300-bg). Panel gradients → `surface-2` (Task 1). §7 hazards, §1 tokens, §3 primitives, §5 light mode, §6 engine are OTHER plans (2a/2b/light/engine) — correctly out of 2c scope and noted as consumed interfaces.

**2. Placeholder scan.** No "TBD/handle-appropriately" placeholders — every step lists exact before→after strings or a binding decision (D1–D15). The two genuinely open items are surfaced as explicit decisions with a chosen default: D12 (play-type badge palette → neutral collapse, flagged to lead) and the `ModeButton` union rename (D7, spelled out).

**3. Type/name consistency.** Token utility names are used identically across all tasks (`text-muted-foreground`, `bg-secondary`, `text-primary-emphasis`, `bg-offense`, `surface-2`, …). `surface-1`/`surface-2` are always the plain-class form. `text-primary-foreground` is the single on-color foreground everywhere (D2). The one code-symbol change (`ModeButton` `color` union) is defined once in D7 and Task 6 Step 4 and referenced nowhere else. Overlap resolutions guarantee each file is edited in exactly one task.

**Known deviations (adjudicated by team lead):** (a) D12 play-type badges KEEP their categorical color-coding (allowlisted; tokenize as `--category-*` in Phase 3); (b) D7 motion banner shifts cyan→amber and preview amber→green to keep three distinct token hues — approved; (c) D10 SVG stroke/fill hex props (route/formation/minimap previews) parked as a parallel viz palette per §6 — approved, follow-up noted.
