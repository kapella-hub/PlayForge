# PlayForge Phase 3b — Engagement Loop (Design Spec)

**Date:** 2026-07-06
**Status:** Drafted; scope = "Full loop" (recommended option, auto-selected on question timeout — user may trim)
**Phase:** 3b of Phase 3 (3a hardening ✅ → 3b engagement loop → 3c designer power → 3d mobile/PWA)
**Branch:** `phase-3b-engagement`, stacked on `phase-3a-hardening`

## Context

The player engagement loop is structurally broken in three places, found during Phase 1–2 triage and confirmed by code inspection:

1. **Grading is client-trusted twice over.** `submitQuizAttempt` accepts `answers[].correct` from the browser, AND the player quiz page ships the full answer key (`options[].correct`, `correctAnswer`) to the client before answering. Every reward downstream (score, XP, badges, mastery) rests on this.
2. **Passive viewing = mastery.** `recordPlayView` runs every view through SM-2 as a quality-3 review (`calculateNextReview(state, 3)`), so re-viewing a play walks intervals up to "mastered" without demonstrating knowledge. Coaches' mastery heatmaps overstate readiness.
3. **The reward moment is dead.** `playerStatsFromProgress` hardcodes `currentStreak: 0`/`daysActive: 0` in both reward snapshots, so streak XP (`currentStreak * 25`) and all three streak badges (Consistent, On Fire, Week Warrior) can never appear in a quiz reward. Quizzes also never touch `lastViewedAt`, so quizzing doesn't even extend the streak. The finish screen renders static text — no celebration.

## 1. Server-side grading + answer-key protection

- **New pure module `src/lib/quiz-grading.ts`:** `gradeAnswers(questions, submitted)` — for `multiple_choice`, an answer is correct iff its text matches an option with `correct: true` (exact string match on option text, the same identity the client uses today). Unsupported question types are excluded from grading and from the score denominator (mirrors `countSupportedQuestions`/`computeScorePercent` semantics). Returns per-question `{questionId, answer, correct}` plus `{correctCount, supportedCount, score}`.
- **`submitQuizAttempt` input narrows** to `{quizId, answers: {questionId, answer}[]}` — the client `correct` flag is REMOVED from the signature. Grading happens server-side inside the existing transaction, against the quiz's questions fetched there; the stored attempt's `answers` JSON carries the *graded* results (same shape as today, now trustworthy). Per-play scores for `recordQuizScore` come from the graded results. The return adds the graded summary (`scorePercent`, `correctCount`, `supportedCount`) so the finish screen displays server truth, not client math.
- **New `getPlayerQuiz(id)`** in quiz-actions: same authz as `getQuiz` but strips the answer key — options map to `{text}` only; `correctAnswer`/`correctZone` omitted. The player quiz page switches to it. Coach pages keep `getQuiz` (editing needs the key).
- **Per-question feedback via a server action:** the flow's instant right/wrong reveal needs a server check now. New `checkAnswer(questionId, answer)` action (quiz-access gated, returns `{correct}` and — for the reveal styling the UI shows today — which option was correct). `MultipleChoice` calls it on selection; a pending state disables options while checking. **Trade-off (flagged):** this is an answer oracle (a player could peek then answer "correctly" — but they could already retake quizzes freely, and all submitted answers are recorded; acceptable for a team-study app). Alternative rejected: keep shipping the key (defeats the fix) or defer all feedback to the end (UX regression).

## 2. Mastery redesign — quizzes drive mastery, views build familiarity

- **`recordPlayView` stops touching SM-2 entirely:** it upserts the row with `views: +1` and `lastViewedAt: now` ONLY. It must still create/update the row (install-completion, inactivity notifications, and streaks all read these fields). `easeFactor`/`intervalDays`/`masteryLevel` are left at schema defaults on create and untouched on update.
- **Migration `nextReviewAt_nullable`:** `nextReviewAt` is currently `DateTime @default(now())` (non-nullable) — a view-created row would be instantly "due for review." It becomes `DateTime?` with no default: null = nothing scheduled. `recordQuizScore` always sets it, so quiz-driven scheduling is unaffected; `getDueForReview`'s `lte: now` filter naturally excludes nulls; `getPlayerProgress`'s `orderBy nextReviewAt asc` sorts nulls last in Postgres (unscheduled plays trail scheduled ones — correct). Existing rows keep their values (grandfathered).
- **`recordQuizScore` becomes the sole SM-2 writer** (already implements it) and additionally sets `lastViewedAt: now` — quizzing is study activity: it extends streaks and counts for inactivity purposes.
- **Existing rows are grandfathered:** no backfill, no reset. Mastery levels inflated by past viewing stand; from now on only quiz results move them (a failed quiz demotes via the existing SM-2 quality<3 reset path).
- **`getDueForReview` semantics shift implicitly:** `nextReviewAt` is now only set by quizzes, so "due for review" = quizzed plays whose re-review is due. Never-quizzed plays are never "due" (they surface through game-plan/install views instead). The player home's due list keeps linking to play viewing — refreshing memory is still the right action; mastery credit arrives at the next quiz.
- XP side effect (documented, no change needed): `calculateXP`'s `playsMastered * 100` is no longer farmable by viewing; `totalViews * 10` remains view-driven by design (familiarity XP). View-XP capping is a follow-up, not 3b.

## 3. Celebration + streak on the finish screen

- **Streak enters the reward math:** both snapshot selects in `submitQuizAttempt` add `lastViewedAt`; `playerStatsFromProgress` gains an optional streak input (or a sibling that composes `computeStreak`) so `currentStreak`/`longestStreak`/`daysActive` are real in both snapshots. Because `recordQuizScore` now stamps `lastViewedAt`, the first study of a day makes the after-snapshot streak = before + 1 → streak XP (`×25`) and streak badges become reachable exactly at quiz completion. Return type gains `streak: {current, extended}`.
- **Finish screen becomes a staged celebration** (framer-motion, already a dependency; tokens only; `prefers-reduced-motion` collapses to the current static layout): check-mark pop → score count-up to the server `scorePercent` → XP chip slide-in (`+N XP`, accent) → streak flame with day count when `extended` (accent) → badge cards spring in one-by-one. A perfect score (100%) gets a distinct headline treatment ("Perfect!") and stronger accent styling — no confetti library, no new deps.
- All new on-accent text uses `text-accent-foreground` on `bg-accent` fills per the Phase 3a token rules; contrast test already pins the pairs.

## Out of scope (unchanged backlog)

Leaderboard changes; quiz retake policy / oracle rate-limiting; SM-2 parameter tuning; masteryLevel backfill; view-XP caps; the `recordQuizScore` tx-authz threading (3a backlog item a); Preview/Play toolbar label (3c); draft-key user-scoping (3c).

## Verification

- Per task: quartet — `npm run test:run` (183 baseline, grows), `npx tsc --noEmit`, `npm run lint` (**stays 0 errors**), `npm run build`.
- New unit tests: `quiz-grading.ts` (correct/incorrect/unsupported-type/empty cases); `submitQuizAttempt` grades server-side (client `correct` absent from input; tampered inputs impossible by type); streak-in-reward (first-quiz-of-day extends streak, second doesn't); `recordPlayView` no longer writes SM-2 fields (negative assertions per convention); `recordQuizScore` stamps `lastViewedAt`; `getPlayerQuiz` strips the key (assert absence).
- Close-out QA: full quiz flow in the browser both themes (answer feedback latency, celebration stages, reduced-motion, streak display), player home due-list sanity, coach quiz editing unaffected.

## Risks / notes

- `checkAnswer` adds a round trip per answer — acceptable on LAN/mobile; degrade gracefully with a pending state.
- Removing SM-2 from views changes the meaning of existing analytics (heatmap mastery becomes quiz-earned going forward) — this is the point, but coach-facing numbers may dip; release note-worthy.
- The `submitQuizAttempt` signature change is breaking for the client — single caller (quiz-flow), updated in the same task.
- Attempt JSON shape for stored answers stays `{questionId, answer, correct}` — historical attempts remain readable.
