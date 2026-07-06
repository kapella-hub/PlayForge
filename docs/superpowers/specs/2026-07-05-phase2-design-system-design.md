# PlayForge Phase 2 — Design-System Unification (Design Spec)

**Date:** 2026-07-05
**Status:** Approved (user delegated design approval after self-review; accent decision delegated → teal)
**Phase:** 2 of 3 (1: Stabilize ✅ → 2: Design system → 3: Experience elevation)
**Branch:** `phase-2-design-system`, stacked on `phase-1-stabilize`

## Context

Phase 1's audit established the root cause of PlayForge's visual incoherence: an 18-token CSS-variable palette exists in `globals.css` but is consumed by only 3 files, because no Tailwind v4 `@theme` block registers the tokens as utilities. Components hardcode ~1,228 color-class occurrences (census, 2026-07-05): `zinc-*` 785 (64%), indigo 104, emerald 73, red 70, `white/*` 62, amber 41, plus violet/blue/slate/gray stragglers. Light mode is structurally blocked by a hardcoded dark body gradient. Six files re-implement the Radix Dialog shell; 17 close-X buttons are copy-pasted; `ui/select.tsx` is dead code while 6 raw `<select>`s are styled inline.

**Delegated decisions:** accent = **teal** (the declared brand: tokens, PWA manifest, viewport theme-color, and app icons already ship `#0f766e`; visual comparison artifact reviewed); scope = design system + the two flagged hazards.

## 1. Token foundation (`globals.css`)

- Add `@theme inline` mapping every existing custom property to Tailwind color utilities: `--color-background: var(--background)` … for background, foreground, card, card-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, destructive, border, ring, success, warning. This makes `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, etc. real utilities whose values follow the active theme class.
- Add `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` utilities follow the app's class toggle, not `prefers-color-scheme` (kills the second, disagreeing theming mechanism).
- **New tokens** (dark + light values): `--primary-emphasis` (bright interactive text on dark surfaces — teal-300 `#5eead4` region; light mode: `#0f766e`), `--surface-1` and `--surface-2` (the glass-card and panel gradients currently duplicated across card/page-skeleton and coach-sidebar/player-tabs). Gradients are not color tokens: these ship as plain CSS utility classes `.surface-1` / `.surface-2` in `globals.css`, each reading theme-scoped custom properties so `.light` swaps them; call sites use the class, never the raw gradient, `--offense` (blue `#3b82f6` family, matching the canvas) and `--defense` (red `#ef4444` family, distinct in role from `--destructive`).
- **Body background tokenized:** the opaque dark gradient stack and `body::before` grid move to token-driven values with a light counterpart (soft paper-green wash, no fixed dark hexes). `::selection` uses `--ring` at alpha.
- Fonts registered in `@theme` (`--font-sans`, `--font-display`) so `font-display` exists as a utility; the `h1-h3` element rule stays for defaults.
- The existing `:root`/`.light` palettes remain the single source of truth; teal `--primary` unchanged. `--ring` stays `#14b8a6` (dark) / `#0f766e` (light).

## 2. Accent unification (semantic role table)

| Today | Becomes |
|---|---|
| `emerald-600/500` buttons, rings, toggles | `primary` / `ring` |
| `emerald-300/400` text accents | `primary-emphasis` |
| indigo (panels, avatar, quiz CTA, Select ring, toast info, leaderboard chips, level/XP) | `primary` family (interactive) or `accent` (amber, for highlight/gamification) per call site |
| violet (AI generator) | `primary` family; AI affordances may use `accent` for the "spark" moments |
| blue (install tracker) | `primary` (progress) / `success` (complete) |
| offense/defense badges (`default`/`destructive` today) | new `offense` / `defense` badge variants |
| stat-card ad-hoc colors (white/green/amber/indigo) | `foreground` / `success` / `accent` / `primary-emphasis` |

Rule for the plan: interactive/navigational emphasis → primary family; celebratory/highlight/gamification → accent (amber); state colors stay semantic (success/warning/destructive). No indigo, violet, or blue classes remain in `src/app` or `src/components` when Phase 2 closes (engine excluded).

## 3. Primitives

- **New `src/components/ui/dialog.tsx`**: styled Radix wrapper (Overlay, Content, Header, Title, Description, Close with the X) on token styling. The 6 direct-Radix call sites (confirm-dialog, player-card, change-password-dialog, designer print panel, create-game-plan-dialog, new-playbook-dialog) migrate onto it; `ConfirmDialog`'s public props are unchanged (it re-wraps the new shell internally).
- **New `src/components/ui/segmented-control.tsx`**: replaces the 3 bespoke rounded-track/active-pill toggles (designer side toggle, print-mode toggle, animation speed control).
- **`ui/select.tsx` adopted**: rewritten to token styling (native `<select>` wrapper — keeps a11y), the 6 raw inline-styled `<select>`s migrate onto it.
- **Re-skin to tokens**: button, badge (gains `offense`/`defense` variants), card, input, toast, skeleton/page-skeleton, spinner, error-state, dropdown-menu, notification-bell. The dead duplicate `SkeletonCard`/`SkeletonText`/`SkeletonImage` exports in `skeleton.tsx` are deleted (page-skeleton keeps its local one or absorbs it).
- CVA stays the variant mechanism; `cn()` unchanged.

## 4. Mechanical neutral sweep

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

Executed per directory/surface with judgment allowed *within the table's semantic intent* (a reviewer checks role fit, not rote substitution). Hotspot files (designer/page.tsx 81, quiz-create-client 67, play-toolbar 45, play-library 45) get dedicated tasks. **Visual expectation: near-identical, not pixel-identical** — neutrals intentionally shift toward the brand-tinted token values; verification is human screenshot review per surface (dev server + Playwright captures), plus build/tests.

## 5. Light mode ships

- Root layout: replace hardcoded `<html className="dark">` with an inline pre-hydration script reading `localStorage["playforge-theme"]` (values `dark|light|system`, key from theme-provider.tsx:14; `system` resolves via `matchMedia`), defaulting **dark**, setting the class before paint (no flash; `suppressHydrationWarning` already present).
- `ThemeToggle` returns to the coach header, coach sidebar footer, and player header (the Phase 1 removal sites).
- Light values audited/tuned once components consume tokens (contrast pass: AA for text on background/card/primary).
- Close-out: full dark+light visual QA across every route (coach 9, player 4, auth 3, designer) with screenshots.

## 6. Engine (canvas) — siloed, tidied

Canvas colors remain a parallel palette (Konva ≠ CSS). One task centralizes the leaked inline hexes into `FIELD.COLORS` (route-line `#ffffff`×5, player-node `#ffffff`×2, read-indicator ×3, motion-arrow `#06b6d4`, ball browns) with named entries. No token bridge in Phase 2.

## 7. Opening hazard fixes (before foundation work)

- `src/lib/use-keyboard-shortcuts.ts:30-31`: `shortcutsRef.current = shortcuts` executes during render (React 19 hazard, existing lint error). Fix: move the assignment into `useEffect(() => { shortcutsRef.current = shortcuts; })` — handlers read the ref at event time, after effects settle; behavior preserved. Clears that file's lint errors (play-canvas.tsx's remain parked).
- `src/app/api/ai/generate-play/route.ts`: add `requireMembership({ coach: true })` (session-gated only today — any player can spend Anthropic credits) and a simple per-user in-memory rate limit (e.g. 10 requests/minute; single-instance deploy makes in-memory acceptable; note as env-tunable).

**Documented exceptions (adjudicated during planning):** the play-library play-type badge palette keeps its 6-way categorical color-coding (informational, not accent sprawl) — allowlisted, tokenize as `--category-*` in Phase 3; SVG `stroke=`/`fill=` hex props in route/formation/minimap previews are parked with the engine silo.

## Out of scope (Phase 3 / parked)

Everything in `docs/superpowers/plans/2026-07-02-phase2-follow-ups.md` not named above (UX polish, perf beyond the shipped cache(), test-rigor nits, quiz celebration, designer power features, offline). Engine/CSS token bridge. Marketing/landing page. New visual identity — this phase makes the *existing* identity coherent, it does not redesign.

## Verification

- Per task: `npm run test:run` green (115 baseline), `npx tsc --noEmit`, `npm run lint` with **no new errors** (baseline: 8 errors in play-canvas.tsx + use-keyboard-shortcuts.ts; the hazard task reduces this), `npm run build`.
- Sweep tasks additionally: before/after screenshots of affected routes (dev server + Playwright), human-reviewed.
- Phase close: dark+light QA pass on all routes; grep gates — zero `indigo-|violet-|blue-` in src/app+src/components; zero `zinc-|slate-|gray-` outside an allowed exceptions list; `@theme` utilities compile.
- Env: dev DB + seeded accounts already exist (docker-compose.dev.yml, PLAY01).

## Risks / notes

- `@theme inline` is required (not plain `@theme`) so utilities resolve `var()` at use-time and follow `.light` overrides.
- Stacked branch: if the Phase 1 PR merges mid-phase, rebase `phase-2-design-system` onto main (fast-forward content, no semantic conflicts expected).
- The neutral shift (zinc → green-tinted tokens) is a deliberate, subtle warming of all grays; if any surface reads wrong in review, the token value — not the call site — is the fix.
- Radix Dialog wrapper must preserve ConfirmDialog's exact public interface (other Phase 1 call sites depend on it).
