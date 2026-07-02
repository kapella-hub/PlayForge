# PlayForge Phase 1 — Stabilize (Design Spec)

**Date:** 2026-07-02
**Status:** Approved (user delegated design approval after self-review)
**Phase:** 1 of 3 (1: Stabilize → 2: Design-system unification → 3: Experience elevation)

## Context

A three-agent code audit (coach surface, player/auth surface, designer + design system) found that PlayForge's pages are individually well-built but several headline features are silently broken, the theme system is decorative, and there is no loading/error safety net. Full audit reports are archived in the session scratchpad; every finding cited here was re-verified against source before inclusion in this spec.

Phase 1 fixes everything that is **broken, lossy, or unsafe**. It deliberately avoids visual redesign (Phase 2) and experience polish (Phase 3).

**User-approved scope decisions:**
- Light mode: hide the toggle now; real fix lands with Phase 2 tokens.
- Notifications: wire minimally using existing generator functions; no schema change.
- Team Files: move from localStorage to a real org-scoped database model.
- Password recovery: coach-resets-player from Roster; no email infrastructure.

## 1. Security — org scoping (all reads AND mutations)

**Problem.** Server actions and detail pages load/mutate rows by bare id with no membership check. Confirmed vulnerable reads: `playbooks/[id]/page.tsx:24` (`findUnique` by id), `getGamePlan` (`game-plan-actions.ts:100`), `getPlay` (`play-actions.ts:11`), `getQuiz` (`quiz-actions.ts:19`), `getPracticePlan` (`practice-actions.ts:24`). Mutations are worse: `deletePlaybook(id)`, `deletePlay`, `updatePlay`, `deleteGamePlan`, `deletePracticePlan`, `removeMember(membershipId)`, etc. accept ids with no auth — any authenticated user can read or destroy another org's data.

**Design.**
- New helper in `src/lib/membership.ts` (or sibling module): `requireOrgAccess(orgId, { coach?: boolean })` — resolves the session and verifies membership (optionally coach role). Returns the membership on success and **throws** on failure; server actions let the error propagate (surfaced by the new error boundaries / caller toasts), while pages catch and render `notFound()`. A convenience wrapper resolves a resource's `orgId` via its relation (e.g. play → playbook → orgId).
- Every server action in `src/lib/actions/*` gets a scoping check. Actions that currently accept `orgId` from the client (`getQuizzes(orgId)`, `getRoster(orgId)`, analytics, etc.) derive/validate it against the session membership instead of trusting the argument.
- Detail pages return `notFound()` on scope mismatch — identical to a nonexistent id, so existence never leaks (no 403).
- `verify-invite` stays public (revealing the team name to a valid-code holder is the feature); documented as accepted.

## 2. Dead coach features come alive

- **New Playbook** (`playbooks/page.tsx:35` TODO): wire the button to a small Radix Dialog (name + offense/defense) submitting to the existing `createPlaybook(formData)` action (`playbook-actions.ts:19`).
- **Quiz management**: quiz cards on `quizzes/page.tsx` become links to a new coach route `quizzes/[id]` showing the question list, rename, and delete (confirmed). Requires new server actions: `updateQuiz` (name) and `deleteQuiz` (only `getQuiz`/`createQuiz`/`addQuizQuestion` exist today). Full question editing (with a `deleteQuizQuestion` action) ships only if the existing create UI drops into an edit mode cleanly; otherwise it is deferred and the detail page ships with list + rename + delete.
- **Game Plans create path**: add a Create button + dialog on `game-plans/page.tsx` wired to the existing `createGamePlan` action (`game-plan-actions.ts:30`).
- **Team Files → database**: new `TeamFile` Prisma model — `id`, `orgId`, `title`, `url`, `category`, `createdById`, `createdAt`, `updatedAt` — with migration; org-scoped server actions (`getTeamFiles`, `createTeamFile`, `updateTeamFile`, `deleteTeamFile`); `settings/files/page.tsx` swaps localStorage (`:47-61`) for the actions. No migration of localStorage data (pre-launch, nothing real exists).
- **Print fix** (`designer/page.tsx:538` passes `canvasData: ""`): `PrintLayout` renders `<img src={play.canvasData}>` — it expects a PNG data-URL. Only the *current* play is ever printed (single-element `printPlays` array from live canvas state). Fix: extract a `getStageDataURL(stageRef)` helper from `exportPlayAsImage` (`engine/export.ts`), capture the data-URL when the print dialog opens, pass it as `canvasData`.
- **Designer small kills**: wire the dead Mirror button (`assignment-panel.tsx:244`, no `onClick`) to the existing mirror logic (`engine/mirror.ts` / `mirrorPlayAction`); fix the routeType casing bug (`assignment-panel.tsx:207-211` writes/compares lowercase while `detectRouteType` and `routes-library.ts` use Capitalized) by normalizing on the Capitalized names.

## 3. Player loop closure

- **Quiz finish routing** (`quiz-flow.tsx:87`): "Back to Quizzes" targets `/quizzes` (coach route → bounces players to Home). Fix to `/quiz`.
- **Quiz reward feedback**: finish screen additionally shows XP earned and newly unlocked badges, computed from the existing gamification lib after `submitQuizAttempt`. No animation work (Phase 3); Phase 1 just stops the silence.
- **Join with existing email** (`join/route.ts:39-43` upserts `update: {}`, silently discarding the typed password): if the email exists, `bcrypt.compare` the supplied password against the stored hash — match → proceed to membership creation (login-equivalent join); mismatch → 401 with "An account with this email already exists — enter that account's password to join." No silent drops; no separate logged-in join flow needed.
- **Auto sign-in**: after successful signup (`signup/page.tsx:50`) and join (`join/page.tsx:186`), call `signIn("credentials", ...)` client-side and route to dashboard/home instead of bouncing to `/login`.
- **Password reset (coach-mediated)**: Roster rows get a "Reset password" action → new coach-only server action generates a temporary password, stores its bcrypt hash on `User.password` (field exists, `schema.prisma:109`), and returns it once for display in a dialog. Complementary: user menu gets a "Change password" dialog (all roles) backed by a `changePassword` action verifying the current password. No forced-change-on-next-login flag in Phase 1 — documented follow-up hardening.
- **Home empty-state copy** (`home/page.tsx:107-109`): on-team players see "Your coach hasn't assigned any plays yet" instead of being told to get an invite code.
- **Notifications wiring**: coach layout fetches `getTeamAnalytics` and passes `generateCoachNotifications(analytics)` into the sidebar bell; player layout fetches progress + quizzes and passes `generatePlayerNotifications(progress, quizzes)` into its bell (`(player)/layout.tsx:38` currently passes nothing). Bell's localStorage read-state mechanism unchanged.
- **Join password visibility**: add the same show/hide toggle login/signup already have to the join password fields (`join/page.tsx:283-303`).

## 4. Safety net

- **Loading states**: `loading.tsx` per coach route group using the existing-but-dead `Skeleton` components, restyled to match real card geometry (`rounded-[22px]`, translucent surfaces).
- **Error states**: shared error component used by `error.tsx` in coach and player route groups (message + retry via `reset()`).
- **Designer data-loss guards**: `beforeunload` when `dirty` (`designer/page.tsx:60` tracks it; no handler exists); `.catch` + error toast on `getPlay` load (`:95-105`); localStorage draft becomes a loop — opening the designer without a `playId` offers "Restore draft?" if a `playforge-draft-*` key exists (today the save toast promises recovery that doesn't exist, `:234-240`).
- **⌘Z scoping**: add `ignoreInputs: true` to the undo/redo shortcuts (`designer/page.tsx:466`), consistent with the other shortcuts.
- **Honest mutations**: `game-plan/play-list.tsx:66-116`, `practice/[id]/editor.tsx:65-141`, `practice/create-button.tsx:19-27` get try/catch + error toast + state revert (the pattern already exists in `quiz-create-client.tsx:181`).
- **Confirmations**: one shared confirm dialog (on the existing Radix Dialog) for invite-code regenerate (`invite-code-card.tsx:114`), practice period delete (`editor.tsx:276`), team file delete; replaces the native `confirm()` on practice plan delete (`editor.tsx:144`).

## 5. Light mode + trust math + mobile config

- **Light mode**: remove `ThemeToggle` from coach sidebar footer, coach header, and player header. `ThemeProvider` and the `.light` CSS variables stay for Phase 2.
- **Trust math** (screens must not disagree): Home computes the real streak via a shared helper extracted from Progress (`home/page.tsx:48` hardcodes `currentStreak: 0`, making XP/level differ between pages); "Perfect Score" badge condition becomes "any attempt with 100%" (today `averageScore >= 1.0` across all attempts, `gamification.ts:54`, unearnable after one imperfect quiz); unsupported question types are excluded from the quiz score denominator (`quiz-flow.tsx:76-77` counts skipped-unsupported in total, capping scores below 100%).
- **Mobile config one-liners**: add Next.js `viewport` export with `viewportFit: "cover"` (root layout) so the existing `.safe-area-bottom` CSS resolves a real inset; add top safe-area padding to the player header (`(player)/layout.tsx:30`, currently collides with the iOS status bar under `black-translucent`); align `manifest.ts` `theme_color` (`#6366f1` indigo) with the brand teal used in root metadata (`#0f766e`).

## 6. Out of scope (deferred)

- **Phase 2:** Tailwind `@theme` block + semantic token migration, single-accent unification, real light mode, shared SegmentedControl/Modal/IconButton primitives, skeleton/spinner brand alignment.
- **Phase 3:** quiz celebration polish, mastery-from-viewing redesign (SM-2 `quality=3` per view), quiz completed-state on cards, play viewer zoom/fullscreen, designer add/remove players + touch drawing + zoom/pan, offline/service worker, player-visible leaderboard, position/profile editing, forced password change flag, email-based reset.

## 7. Verification

- `npm run build` and existing vitest suite (`npm run test:run`) green.
- New unit tests: org-scoping helper (allows member, blocks non-member, coach-only paths), TeamFile actions, join-with-existing-email logic (match/mismatch), quiz score denominator fix, streak helper parity.
- Manual walkthrough checklist per fixed flow (print output non-blank, quiz finish routing, auto sign-in, reset + change password, confirmations, beforeunload).
- Environment note: no `.env` exists on this machine; runtime verification requires standing up a local Postgres + `.env` at implementation time (docker-compose db service exists for production; a dev equivalent will be needed).

## Risks / notes

- **Accepted residuals (user decisions, 2026-07-02, during execution):** (1) read-by-id actions return `null` for missing rows but throw `AuthzError` for cross-org rows — a theoretical existence oracle, accepted because IDs are unguessable cuids and `null` is the established caller contract; (2) guard resolvers re-fetch the row in write paths (one redundant PK query per write) — accepted for sweep uniformity; revisit in Phase 2; (3) join-with-existing-email returns 401 on password mismatch vs 201 on new email — an email-existence signal equivalent to any login form, behind the invite-code gate; (4) coach-mediated reset targets players only and refuses targets with elevated roles elsewhere, but a target who is a *player* on another team can still be reset from this one — same trust model as the coach knowing the temp password; extend in Phase 2 if multi-org player accounts become common.

- Org-scoping touches every action file; the helper keeps changes mechanical but a missed path stays vulnerable — the sweep must enumerate all `findUnique`/`update`/`delete` by-id calls in `src/lib/actions/` and API routes.
- `createPlaybook` takes `FormData`; dialog submission must match its existing contract rather than changing the action signature.
- Quiz edit-mode reuse of the create UI is explicitly conditional; the fallback (detail + rename + delete) is the committed scope.
- Coach-reset displays a temporary password once; it is the coach's responsibility to share it securely. Acceptable for the team trust model; revisit with email infra.
