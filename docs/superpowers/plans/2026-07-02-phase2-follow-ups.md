# Phase 2 Follow-ups (from Phase 1 final whole-branch review, 2026-07-02)

Triage source: final review of `phase-1-stabilize` (1267c3b..d9d75f8). Items below were explicitly deferred — do not re-derive.

## Early slots (real hazards)
- `src/lib/use-keyboard-shortcuts.ts:31` ref-write-during-render — legit React 19 hazard; one of the 8 pre-existing lint errors (all in this file + play-canvas.tsx; untouched by Phase 1).
- `src/app/api/ai/generate-play/route.ts` — session-gated but no coach gate, no rate limit; any player can burn paid Anthropic spend. Add `requireMembership({coach:true})` + throttle.

## Security / correctness follow-ups
- `resetMemberPassword`: cross-tenant guard blocks elevated roles only — a player-on-another-team target can still be seized (spec residual documents this); consider blocking any multi-org target. Also: throws plain Error where siblings throw AuthzError.
- `recordPlayView`/`recordQuizScore`: accept arbitrary playId (self-writes only; XP farming possible). Quiz grading is client-trusted by pre-existing design.
- Join route: catch P2002 on the create race → friendly 409 (currently ungraceful 500, rare). No route-level integration test.
- `submitQuizAttempt`: reward before/after snapshot not transactional (cosmetic race under multi-tab).
- Notification localStorage key not user-scoped ("playforge_notifications") — accounts on a shared browser mix cached items.

## Performance
- `getTeamAnalytics`: slim a purpose-built light query for the coach layout (cache() wrap shipped in Phase 1 fix wave); drop the dead `quizAttempts: {take:10}` include.
- Add `@@index([orgId])` to all org-scoped tables in one migration (none have one today; TeamFile included).

## UX / polish
- Silent `/login` fallback after failed auto sign-in → `?created=1` param + login banner (needs useSearchParams+Suspense).
- Quiz detail: silent rename revert on empty input; input not disabled while saving.
- Game-plan create: week input allows 0/negative via keyboard (server-safe).
- Streak XP/badges absent from quiz finish screen (authorized deferral; needs lastViewedAt in the row select + computeStreak).
- Team files: shared isPending flag across edit/delete (cosmetic spinner).
- Draft banner strip lacks pointer-events-none (matches pre-existing pattern).
- Rapid double-reorder revert is last-write-wins (pattern-inherent).
- Dialog a11y pass: Dialog.Description missing on new-playbook, create-game-plan, print dialogs; ConfirmDialog confirm button lacks type="button" and its hover diverges from Button's destructive variant.
- Designer: routes-library naming vocabulary never matches assignment-panel pills (pre-existing); legacy lowercase routeType stops pill-highlighting (self-heals on next click).
- Focus-restoration check: change-password dialog closes with its dropdown trigger unmounted (runtime-verify; smoke pass).

## Added during Phase 2 planning (2026-07-05)
- Tokenize the play-library play-type categorical palette as `--category-*` (kept as-is + allowlisted in Phase 2).
- Migrate SVG `stroke=`/`fill=` hex props (route/formation/minimap previews) to a named viz palette (parked with the engine silo in Phase 2).

## Added by Phase 2 final review (2026-07-06)
- Dark-mode on-accent text (`text-primary-foreground` on `bg-accent` ≈ 3.2:1 — designer motion banner, player level circle): extend contrast.test.ts to the dark palette and pick a compliant on-accent treatment.
- `src/lib/qr.ts`: inverted QR (white modules on stale `#0a0a14`) — many scanners reject inverted codes; also jarring on light theme. Re-generate dark-on-light.
- Grep gates should also match `rgba(`/`rgb(` literals and include `src/lib` (the class of leak behind the button-glow and ::selection findings).
- Rename play-toolbar ModeButton's stale `cyan:` map key (value is accent now) — plan froze the type in 2c.
- Unit tests for the 5 migrated dialogs + a real ConfirmDialog test (behaviorally QA-covered; unit coverage absent).
- `@custom-variant dark` currently has zero `dark:` consumers (inert future-proofing) — fine, but revisit if unused by end of Phase 3.

## Cleanup
- Delete dead `SkeletonCard`/`SkeletonText`/`SkeletonImage` exports in skeleton.tsx (page-skeleton has its own local SkeletonCard).
- `getQuizAttempts` has no UI caller (guarded dead code) — wire or remove.
- `setActiveGamePlan` dead orgId param (signature freeze mandated it).
- practice-actions: no revalidatePath anywhere (pre-existing); period playIds not cross-org-verified (self-pollution only — org-scoped fetches don't render foreign plays).
- Reword plan verification gates to "no NEW lint errors" or fix the two legacy lint files.

## Test-rigor nits (plan-authored)
- authz tests: assert AuthzError.name; requireMembership coach-success case; resolver Prisma call-arg assertions (esp. requirePlayAccess org-threading); explicit resolver return-type annotations.
- assertHttpUrl catch-branch (not-a-URL input) untested; team-file tests: 3 of 4 blocks don't assert coach:true.
- streak tests don't exercise i<10 cap or current>0 gate; quiz-score all-supported no-op unpinned; newBadges toEqual([]) tightening; hasPerfectQuiz true→true case.
- special_teams playbooks styled as defense (binary ternary over tri-state Side enum in playbooks pages) — add a special_teams badge treatment when the feature matters
- AI generate-play route: add server-side error logging (client message now generic; no log exists in the catch)
