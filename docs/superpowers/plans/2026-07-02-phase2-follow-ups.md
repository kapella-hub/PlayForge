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

## Phase 3a resolution (2026-07-06)

Phase 3a (`phase-3a-hardening`, spec `docs/superpowers/specs/2026-07-06-phase3a-hardening-design.md`) burned down this backlog. **Resolved:** notification key user-scoping; join P2002→409; recordPlayView/recordQuizScore org-scoping; submitQuizAttempt transaction; resetMemberPassword any-multi-org guard + AuthzError consistency; AI route logging; coach-layout light query; org indexes; login `?created=1` banner; quiz rename feedback; week clamp; team-files pending split; draft-strip pointer-events; dark on-accent contrast (theme-split `--accent-foreground`); QR dark-on-light; rgba/rgb + src/lib gates; `cyan:`→`accent:` rename; ConfirmDialog type/hover + unit test; dead getQuizAttempts; setActiveGamePlan @deprecated; practice revalidatePath; all lint errors → 0; the test-rigor nits batch.

### Still open (carried forward / newly deferred by Phase 3a reviews)

- **recordQuizScore authz reads escape the transaction** (Task 4 final-review item): `requirePlayAccess` inside the loop runs on plain `db` — N distinct plays = N non-tx round trips inside the open interactive transaction (Prisma 5s default timeout risk) + a second pool connection. Fix = thread the tx client through the authz resolvers or hoist play-authz out of the loop (authz API change).
- Join P2002 branch + AI-route console.error lack test coverage; no route-level join integration test.
- `getCoachNotificationData`: two sequential findMany calls could be `Promise.all`'d; the 3-day-inactivity window + no-views-filter semantics are duplicated vs `getTeamAnalytics` with only prose guarding drift — extract shared constants/helper.
- PlayCanvas has zero unit-test coverage (Phase 3a QA covered it manually; the engine's adjust-state-during-render blocks are pinned by nothing automated).
- Designer toolbar "Preview" button only arms the scrubber; playback is the separate Play control — label reads as if it plays (3c designer-power candidate).

### Added by Phase 3a final review (2026-07-06)

- Designer draft localStorage key (`playforge-draft-*`, designer/page.tsx:278) is not user-scoped — same class as the fixed bell bug; pre-existing, coach-only, low sensitivity (3c candidate).
- `recordQuizScore`'s `client` param sits on a `"use server"` export, making the tx client part of the RPC-callable signature (deserialized args can't carry the client; worst case TypeError noise). Cleaner shape: internal helper + thin action wrapper. Score-writing actions remain client-trusted (documented out-of-scope).
- Join route: a membership-unique P2002 (double-submit join race) returns the email-exists message — right 409 status, wrong copy; distinguish via `error.meta.target`.
- Reset-guard check-then-write window: a player joining a second team mid-reset can slip the multi-team guard (tiny window, requires the target's cooperation).
- Gate regex hygiene: gate 3 matches `translate-` via `slate-` (~25 false positives) — tighten to `\b(zinc|slate|gray|neutral)-`; gate 4's allowlist prose should name the two sanctioned AA-passing `text-white` sites (button destructive, bell badge 4.83:1). *(Gate 3 tightening shipped in Phase 3b's close-out task.)*

## Phase 3b resolution (2026-07-06)

Phase 3b (`phase-3b-engagement`, spec `docs/superpowers/specs/2026-07-06-phase3b-engagement-design.md`) closed the engagement loop. **Resolved:** client-trusted quiz grading (server-side now, answer key stripped from the player payload, per-question reveal via authz-gated `checkAnswer`); mastery-from-viewing redesign (views = familiarity only; quizzes sole SM-2 writer; `nextReviewAt` nullable so view-only rows are never due); streak XP + streak badges on the quiz finish screen (real streak in both reward snapshots; quizzing stamps `lastViewedAt`); quiz celebration (staged, reduced-motion-safe, token-only); Perfect Score badge moved to attempt-level identity (was per-play — over-triggered).

### Still open (newly deferred by Phase 3b reviews/QA)

- **Streak model is per-play `lastViewedAt` state, not an activity log** — a single-play player's day-over-day continuation can miss streak XP, and re-touching an already-counted play can shrink `daysActive`. Needs a data-model change (activity-log table or per-day marker). Bundle with it: `streak.ts:47`'s `i<10` heuristic can report an OLDER run's length as the *current* streak (active today + a 5-day run last month → current=5) — now feeds `extended`/streak XP.
- `checkAnswer` is a designed answer oracle (spec trade-off): `correctText` returns on every call, harvestable one question at a time; retakes are free anyway. Rate limiting if it ever matters.
- Authz resolver timing side-channel (unknown = 1 query, foreign = 3, same error) — pre-existing across authz.ts.
- Join route: membership-unique P2002 (double-submit join) returns the email-exists copy — right status, wrong message (distinguish via `error.meta.target`). [carried from 3a]
- Minor test/type hygiene: dead `findUnique` mock in recordPlayView test; quiz-score (4,4) duplicate-path test; `InputJsonValue` double-cast could be a type-alias cast.

## Phase 3c resolution (2026-07-06)

Phase 3c (`phase-3c-designer`, spec `docs/superpowers/specs/2026-07-06-phase3c-designer-design.md`) added precision placement and cleared the designer fixes. **Resolved:** drag snapping + alignment guides (via `dragBoundFunc`; the first dragmove-override implementation was inert in real browsers — caught by QA); arrow-key nudge with burst-coalesced undo and field-bounds clamping; preview auto-play (Preview/Play label confusion); user-scoped draft keys with one-time legacy adoption; canonical route-type vocabulary + legacy-case healing on load (pills highlight); preview-Stop stuck-frame bug (pre-existing, fixed in-phase). The `n()` rename item was a grep artifact (struck from spec).

### Still open (newly deferred by Phase 3c reviews/QA)

- PlayerNode `draggable` isn't gated on `readOnly` — visual-only dragging possible in preview (commit path is gated; cosmetic). Escape doesn't cancel an in-flight Konva drag.
- Touch drags have no Alt equivalent — snapping can't be bypassed on touch (acceptable until 3d mobile work; revisit there).
- Bare arrow keys are swallowed designer-wide even with nothing selected (pre-existing keyboard-hook matching order).
- PlayCanvas wiring has no unit coverage (jsdom can't run Konva) — snap math is unit-tested; the wiring is browser-QA-only. A Playwright e2e harness would close this class.
- Unreproducible anomaly (2× observed): large x+y jump during <20ms nudges right after drag+panel-open; no mechanism found (final reviewer hypothesis: may share a root with a swallowed dragend — Konva-node/state divergence corrected as one jump on the next render). Watch for recurrence.
- **VersionHistory `onRestore` pushes the incoming canvasData to history instead of the current canvas** (pre-existing, plan-excluded): undo-after-restore can't return to pre-restore work — loses user state; deserves its own fix.
- Re-entering preview during the prior instance's ~200ms exit fade briefly lets stale frames past the Stop ref guard (cosmetic, narrow window).
- `findLatestOwnDraftKey`'s lexicographic sort mis-orders variable-length timestamps (unreachable via generated keys — 13-digit until 2286; hand-crafted keys only).
- Legacy draft adoption assigns all pre-scoping drafts to whichever user opens the designer first on a shared browser (accepted trade-off: drafts preserved > perfectly attributed).

## Phase 3d resolution (2026-07-07)

Phase 3d (`phase-3d-mobile`, spec `docs/superpowers/specs/2026-07-07-phase3d-mobile-pwa-design.md`) shipped the offline player PWA — the program's final phase. **Resolved:** no service worker at all (hand-rolled SW: navigation network-first→cache→/offline, static cache-first, SWR assets, versioned caches, update toast with first-install guard); offline states (pill, quiz gating — quizzes stay online-only by design, the 3b grading boundary); install experience (Chromium prompt + iOS hint, user-scoped dismissal); deprecated apple-meta warning; touch snapping bypass (magnet toggle, persisted per user — closes the 3c deferral).

### Still open (newly deferred by Phase 3d reviews/QA)

- **Quiz-create 500 on a fresh org** (QA find, pre-existing backend bug, out of 3d scope): empty due-date + no game plan reproducibly 500s at /quizzes/create — needs a proper fix + route test.
- SW cache writes not wrapped in `event.waitUntil` — a terminated SW can drop a cache write (robustness; brief-prescribed shape).
- Version-agreement regex isn't declaration-anchored (a decoy `SW_VERSION = N` comment before the real declaration could false-match).
- ToastProvider's context value is a fresh object per render → sw-register's effect re-runs per toast (idempotent-safe; ref-capture cleanup).
- use-install-prompt: dismissal tracked via state + localStorage re-read (unify later); Chromium canInstall branch has no unit test (real event verified in QA).
- `output: standalone` + `next start` warning — works, but deploy docs should say `node .next/standalone/server.js`, AND standalone deploys must copy `public/` (now including `sw.js`) and `.next/static` next to server.js or the SW 404s and the PWA silently degrades.
- Shared-device residual (after the sign-out cache clear): logging in as a DIFFERENT user without a prior sign-out doesn't clear the previous user's pages cache — fix via a last-userId marker in SwRegister that clears on mismatch.
- Quiz-flow's unsupported-question Skip branch: no offline banner, Skip enabled offline, and submitError never renders there (pre-existing) — a failed last-question submit is invisible on that branch.
- OfflineQuizGate blocks pointer only — keyboard users can Tab+Enter into a quiz link offline (degrades to a route error; no data risk).
- Pages cache is unbounded (spec-sanctioned; only assets are trimmed) — add a max-entries sweep if storage pressure ever shows.
- Going offline immediately after the very first visit can yield an unstyled /offline (CSS caches only after the SW claims) — accepted best-effort.
- Carried from earlier triage, still open: mastery-from-viewing redesign; client-trusted quiz grading; streak XP on the quiz finish screen; `--category-*` tokens; SVG viz palette; dialog unit tests beyond ConfirmDialog; `@custom-variant dark` revisit (end of Phase 3); leaderboard gold+bronze both accent; routes-library vs assignment-panel vocabulary; rapid double-reorder last-write-wins; special_teams badge treatment.
