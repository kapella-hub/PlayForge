# PlayForge Phase 3a — Hardening (Design Spec)

**Date:** 2026-07-06
**Status:** Approved (user approved design; decisions: block any multi-org reset target; new `--accent-foreground` token)
**Phase:** 3a of Phase 3 (3a hardening → 3b engagement loop → 3c designer power → 3d mobile/PWA)
**Branch:** `phase-3a-hardening`, stacked on `phase-2-design-system`

## Context

Phases 1–2 accumulated a triaged follow-up backlog (`docs/superpowers/plans/2026-07-02-phase2-follow-ups.md`). 3a burns it down: every item is small, pre-diagnosed, and carries a prescribed fix. Out of scope (later sub-phases): mastery-from-viewing redesign, client-trusted quiz grading, streak XP on the quiz finish screen, `--category-*` tokens, dialog unit tests beyond ConfirmDialog, `@custom-variant dark` removal (revisit end of Phase 3).

## 1. Security & correctness

- **Notification storage user-scoped:** `src/components/ui/notification-bell.tsx` keys localStorage by `playforge_notifications:<userId>` (the bell learns the user id via a prop from the layouts, which already have the session). The old un-namespaced key is ignored (orphaned, harmless).
- **Join create race:** `src/app/api/auth/join/route.ts` catches Prisma `P2002` from the user create and returns the existing 409-style friendly error instead of a 500.
- **Progress writes org-scoped:** `recordPlayView`/`recordQuizScore` (`progress-actions.ts`) verify the target play belongs to the caller's org (via the play→playbook→orgId relation) before writing; unknown/foreign playId → bare `AuthzError`.
- **Reset guard extended:** `resetMemberPassword` refuses ANY target with more than one membership (message: "This player belongs to multiple teams; they can change their password themselves or via their other team."), and its `Membership not found`/refusal paths throw `AuthzError` (consistent with siblings). Spec residual (4) in the Phase 1 spec is superseded by this.
- **Transactional reward:** `submitQuizAttempt`'s before-snapshot → attempt write → recordQuizScore calls → after-snapshot run inside `db.$transaction` (interactive), eliminating the multi-tab reward-display race.
- **AI route logging:** the generate-play catch block logs `console.error("generate-play failed:", error)` server-side (client message stays generic).

## 2. Performance

- **Light layout query:** new `getCoachNotificationData(orgId)` in `analytics-actions.ts` fetching ONLY what `generateCoachNotifications` needs (inactive players' names, avg quiz score, active game plan name + install completion) — no per-player `playerProgress`/`quizAttempts` includes. Coach layout switches to it; dashboard/analytics pages keep `getTeamAnalytics`. Wrapped in `cache()` like its sibling.
- **Org indexes:** one migration `add_org_indexes` adding `@@index([orgId])` to Playbook, GamePlan, Quiz, PracticePlan, TeamFile (and Membership if not already covered by the compound unique).

## 3. UX polish

- **Login handoff banner:** signup/join auto-sign-in fallback pushes `/login?created=1`; login page (Suspense-wrapped `useSearchParams`, the Next 16 prerender gotcha) shows an info banner "Account created — sign in to continue."
- **Quiz rename feedback:** empty-name save shows `toast.error("Name can't be empty")` and keeps editing state; the input is disabled while `savingName` is pending.
- **Week input clamp:** game-plan create dialog clamps week to ≥1 client-side on submit AND `createGamePlan` clamps server-side (`Math.max(1, …)` when provided).
- **Draft banner:** the full-width wrapper strip gets `pointer-events-none` with `pointer-events-auto` restored on the pill itself.
- **Team files pending split:** separate `useTransition` (or pending ids) for edit vs delete so spinners don't cross-light.

## 4. Visual & accessibility

- **`--accent-foreground`:** new token, theme-split — `:root` (dark) `#1c1409` (5.71:1 on dark accent `#d97706`), `.light` `#ffffff` (5.02:1 on light accent `#b45309`) — registered as `--color-accent-foreground` in `@theme inline`; every `bg-accent` FILL switches its text to `text-accent-foreground` (designer motion banner, player level circle, any other `bg-accent` + light-text pairs found by grep). Text-on-surface accent usages (`text-accent`) are unaffected. *(Amended during planning: the originally approved single value `#1c1409` measures 3.63:1 on the light accent — below AA — so no single ink clears both palettes; the AA requirement governs.)*
- **Contrast test extended:** `tests/lib/contrast.test.ts` parses the `:root` (dark) block too and asserts: accent-foreground on accent ≥4.5 (both themes), primary-foreground on primary (both), foreground on background/card (dark), plus the existing light assertions.
- **QR fix:** `src/lib/qr.ts` generates dark modules on a white/light background (`color: { dark: "#10201d", light: "#ffffff" }`) — scanner-safe and theme-proof; the invite-code card renders it on a white tile.

## 5. Lint to zero + gates

- Fix ALL 7 remaining lint errors: `play-canvas.tsx` (ref/ordering issues), `notification-bell.tsx` ×2, and any in `theme-provider.tsx`/`dashboard-client.tsx`/`play-library.tsx`/`version-history.tsx`/`quiz-card.tsx`/`animation-engine.ts`/`ball.tsx` (fix the genuine set-state-in-effect/ref hazards properly — no eslint-disable unless a rule is genuinely wrong for the case, and then with a justification comment). Target: `npm run lint` → **0 errors** (warnings may remain).
- **Gates hardened:** the phase-close grep set now includes `rgba(`/`rgb(` literals (excluding tokens/globals.css/engine constants and documented allowlists) and scans `src/lib` as well.

## 6. Cleanup

- Remove dead `getQuizAttempts` from quiz-actions (no callers; test coverage removed with it if any).
- `setActiveGamePlan`: keep the frozen signature; add `/** @deprecated orgId unused — resolved from the game plan */` on the param.
- `revalidatePath` added to practice-actions mutations (paths mirroring game-plan-actions conventions).
- Rename `cyan:` ModeButton map key → `accent:` (type + 1 call site + map — the 2c freeze is lifted for 3a).
- ConfirmDialog: `type="button"` on the confirm button; hover aligned to Button's destructive convention (`hover:bg-destructive/90` family); add `tests/components/ui/confirm-dialog.test.tsx` (renders, confirm fires onConfirm + onOpenChange(false), cancel closes without onConfirm).

## 7. Test-rigor batch

Add to existing suites: `AuthzError.name === "AuthzError"` assertion; `requireMembership` coach-success case; resolver Prisma call-arg assertions (esp. `requirePlayAccess` org-threading via `toHaveBeenCalledWith`); `assertHttpUrl` catch branch (`"not a url"`); `coach: true` argument assertions in the three team-file blocks missing them; streak `i<10` cap + `current>0` gate cases (11-day streak; broken-current-over-long-history); quiz-score all-supported no-op case; `newBadges` `toEqual([])` tightening; `hasPerfectQuiz` true→true (no re-unlock).

## Verification

- Per task: `npm run test:run` green (161 baseline, growing), `npx tsc --noEmit`, `npm run lint` (error count ratchets down; never up), `npm run build`.
- Migration task uses the dev DB (`docker compose -f docker-compose.dev.yml up -d`).
- Close-out: targeted QA (bell isolation across coach+player accounts in one browser, login banner flow, QR visual check, on-accent contrast in both themes) — not a full walk.

## Risks / notes

- The bell's userId prop threads through the layouts — server components already hold the session; purely additive prop.
- `$transaction` wrapping `submitQuizAttempt` must pass the `tx` client into `recordQuizScore` (currently imports `db` directly — it gains an optional client param, defaulting to `db`).
- Lint fixes in engine files (`play-canvas`, `animation-engine`, `ball`) must not change canvas behavior — suite + visual sanity apply.
- QR change affects the invite card visually (white tile) — acceptable; scanning reliability wins.
