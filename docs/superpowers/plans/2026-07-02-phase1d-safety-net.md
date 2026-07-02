# PlayForge Phase 1d — Safety Net + Light-Mode Removal + Trust Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PlayForge a loading/error safety net, stop designer data loss, make destructive actions and failed mutations honest, hide the decorative light-mode toggle, and fix the three "trust math" bugs (streak parity, Perfect Score badge, quiz score denominator) plus three mobile config one-liners.

**Architecture:** Additive and mechanical. New shared UI primitives (`PageSkeleton`, `ErrorState`, `ConfirmDialog`) and three new pure logic modules (`streak`, `quiz-score`, and an extended `gamification` badge) are built and tested first, then wired into existing pages/components. Pure logic is test-driven; UI wiring is verified with `npm run build` plus a manual checklist. No schema, no dependency, and no design-token changes — those are Phase 2.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, TypeScript 5, Tailwind CSS 4, Radix UI (`@radix-ui/react-dialog` already installed), framer-motion, lucide-react, Vitest 4 + jsdom + Testing Library.

## Global Constraints

- **No new npm dependencies.** Everything uses packages already in `package.json` (Radix Dialog, lucide-react, framer-motion are present).
- **Tailwind utility classes only** for styling. Keep the existing dark-theme classes verbatim — semantic-token migration is Phase 2, so do **not** rename `zinc-*`/`emerald-*`/`white/8` classes.
- **Leave `ThemeProvider` and the `.light` CSS variables (`globals.css:22`) intact.** Phase 1 only hides the `ThemeToggle` control; Phase 2 restores real light mode.
- **Tests:** Vitest, files under `tests/` mirroring `src/`, environment `jsdom`, `globals: true`, `@` → `src` alias, setup file `./tests/setup.ts` (all already configured in `vitest.config.ts`). Import style: `import { describe, it, expect } from "vitest";`.
- **TDD only pure logic** (streak helper, gamification badge, quiz scoring). UI wiring steps use `npm run build` + a manual verification step instead of unit tests.
- **Brand teal accent is `#0f766e`** (used for `theme-color` and the PWA manifest).
- **Node >= 20.9.0** (from `package.json` `engines`).
- **Verification gate for every task:** `npm run test:run` and `npm run build` must both stay green. Run them before each commit.

---

## Coverage map (spec §4/§5 → task)

- §5 streak parity → **Task 1**
- §5 Perfect Score badge → **Task 2**
- §5 quiz score denominator → **Task 3**
- §5 remove ThemeToggle → **Task 4**
- §5 mobile config (viewport / safe-area / manifest) → **Task 5**
- §4 loading states → **Task 6**
- §4 error states → **Task 7**
- §4 shared confirm dialog primitive → **Task 8**
- §4 designer beforeunload + getPlay catch + ⌘Z scoping → **Task 9**
- §4 designer draft restore loop + cap → **Task 10**
- §4 honest mutations (game-plan play list) → **Task 11**
- §4 honest mutations (practice editor + create button) → **Task 12**
- §4 confirmations wiring (invite regenerate, period delete, plan delete) → **Task 13**

Cross-reference note: **team-file delete confirmation is out of scope here** — it belongs to plan 1b's Team Files → database rewrite. Do not implement it in this plan.

---

## Task 1: Streak helper — extract, parameterize `now`, TDD, wire both player pages

Extract the streak computation currently inlined in the Progress page into a pure, testable module and use it on Home too (which today hardcodes `currentStreak: 0`, making XP/level disagree between the two screens).

**Files:**
- Create: `src/lib/streak.ts`
- Test: `tests/lib/streak.test.ts`
- Modify: `src/app/(player)/progress/page.tsx:33-90` (remove local fn), `:123-124` (call site unchanged), `:126-135` (add `hasPerfectQuiz` — see Task 2 note)
- Modify: `src/app/(player)/home/page.tsx:41-53`

**Interfaces:**
- Produces: `computeStreak(progress: { lastViewedAt: Date | null }[], now?: Date): { current: number; longest: number; daysActive: number }`. `now` defaults to `new Date()` so existing callers stay `computeStreak(progress)`; tests pass a fixed `now`.

**Critical:** Extract the logic **faithfully**, including the `i < 10 && current > 0` recency heuristic and the mixed UTC/local date handling. The only change from the original is threading `now` in as a parameter instead of calling `new Date()` internally. Do not "improve" the algorithm.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/streak.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeStreak } from "@/lib/streak";

function daysAgo(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
}

describe("computeStreak", () => {
  // Fixed "today" so active-today / active-yesterday logic is deterministic.
  const now = new Date(2026, 6, 2); // 2026-07-02 local midnight

  it("returns zeros for no view history", () => {
    expect(computeStreak([], now)).toEqual({
      current: 0,
      longest: 0,
      daysActive: 0,
    });
    expect(computeStreak([{ lastViewedAt: null }], now)).toEqual({
      current: 0,
      longest: 0,
      daysActive: 0,
    });
  });

  it("counts a single active-today day as a 1-day current streak", () => {
    const result = computeStreak([{ lastViewedAt: now }], now);
    expect(result.current).toBe(1);
    expect(result.daysActive).toBe(1);
  });

  it("keeps the streak current when last activity was yesterday", () => {
    const result = computeStreak([{ lastViewedAt: daysAgo(now, 1) }], now);
    expect(result.current).toBe(1);
  });

  it("breaks the current streak when the last activity is older than yesterday", () => {
    const result = computeStreak([{ lastViewedAt: daysAgo(now, 3) }], now);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
    expect(result.daysActive).toBe(1);
  });

  it("counts consecutive days as a growing current streak", () => {
    const result = computeStreak(
      [
        { lastViewedAt: now },
        { lastViewedAt: daysAgo(now, 1) },
        { lastViewedAt: daysAgo(now, 2) },
      ],
      now,
    );
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.daysActive).toBe(3);
  });

  it("deduplicates multiple views on the same day", () => {
    const result = computeStreak(
      [{ lastViewedAt: now }, { lastViewedAt: now }],
      now,
    );
    expect(result.daysActive).toBe(1);
    expect(result.current).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/lib/streak.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/streak"` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/streak.ts` (this is the Progress-page function verbatim, with `now` parameterized):

```ts
export function computeStreak(
  progress: { lastViewedAt: Date | null }[],
  now: Date = new Date(),
): { current: number; longest: number; daysActive: number } {
  const viewDates = progress
    .filter((p) => p.lastViewedAt)
    .map((p) => {
      const d = new Date(p.lastViewedAt!);
      return d.toISOString().slice(0, 10);
    });

  const uniqueDays = [...new Set(viewDates)].sort().reverse();
  const daysActive = uniqueDays.length;

  if (uniqueDays.length === 0) return { current: 0, longest: 0, daysActive: 0 };

  const parseDayKey = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d); // month is 0-indexed in Date constructor
  };

  let current = 1;
  let longest = 1;
  let streak = 1;

  const today = now;
  const todayKey = today.toISOString().slice(0, 10);
  const isActiveToday = uniqueDays[0] === todayKey;

  // Check if streak is current (active today or yesterday)
  if (!isActiveToday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    if (uniqueDays[0] !== yKey) {
      current = 0;
    }
  }

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseDayKey(uniqueDays[i - 1]);
    const curr = parseDayKey(uniqueDays[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.abs(diff - 1) < 0.5) {
      streak++;
      if (i < 10 && current > 0) current = streak; // Only count recent for current
    } else {
      streak = 1;
    }
    longest = Math.max(longest, streak);
  }

  if (current === 0) current = 0;
  longest = Math.max(longest, current);

  return { current, longest, daysActive };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/lib/streak.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire the Progress page to the shared helper**

In `src/app/(player)/progress/page.tsx`:

1. Add the import near the other `@/lib` imports (after line 8):

```ts
import { computeStreak } from "@/lib/streak";
```

2. Delete the entire local `computeStreak` function (lines 33-90, from `function computeStreak(` through its closing `}`). The call site at line 123-124 stays exactly as-is:

```ts
  const { current: currentStreak, longest: longestStreak, daysActive } =
    computeStreak(progress);
```

(The imported function has the same name and signature, so no call-site change is needed.)

- [ ] **Step 6: Wire the Home page to the shared helper**

In `src/app/(player)/home/page.tsx`, replace the "Gamification stats" block (lines 41-58) with real streak-derived values. Add the import first (after line 11):

```ts
import { computeStreak } from "@/lib/streak";
```

Then replace lines 41-58:

```ts
  // Gamification stats
  const totalViews = progress.reduce((sum, p) => sum + p.views, 0);
  const totalQuizzes = progress.reduce((sum, p) => sum + p.quizScores.length, 0);
  const allScores = progress.flatMap((p) => p.quizScores);
  const averageScore =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  const { current: currentStreak, longest: longestStreak, daysActive } =
    computeStreak(progress);
  const playerStats: PlayerStats = {
    totalViews,
    totalQuizzes,
    averageScore,
    hasPerfectQuiz: allScores.some((s) => s >= 1),
    currentStreak,
    longestStreak,
    playsMastered: masteredCount,
    totalPlays,
    daysActive,
  };
  const xp = calculateXP(playerStats);
  const levelInfo = getLevel(xp);
  const xpProgress = levelInfo.nextLevelXP > 0
    ? Math.min(100, Math.round((xp / levelInfo.nextLevelXP) * 100))
    : 100;
```

**Note:** `hasPerfectQuiz` is a new `PlayerStats` field introduced in Task 2. If you are executing tasks strictly in order, this line will not typecheck until Task 2 adds the field. Do Task 1 and Task 2 back-to-back and run the build once after Task 2 (the two are coupled by the `PlayerStats` type — see Task 2). If you prefer a green build after Task 1 alone, temporarily omit the `hasPerfectQuiz` line here and re-add it in Task 2.

- [ ] **Step 7: Verify build + tests**

Run: `npm run test:run` and `npm run build`
Expected: tests green; build succeeds. Manually confirm on the Progress and Home pages that the streak badge and XP/level now match between the two screens for the same account.

- [ ] **Step 8: Commit**

```bash
git add src/lib/streak.ts tests/lib/streak.test.ts "src/app/(player)/progress/page.tsx" "src/app/(player)/home/page.tsx"
git commit -m "feat: extract computeStreak helper; use real streak on Home for XP/level parity"
```

---

## Task 2: Perfect Score badge — earn on any single 100% quiz (TDD)

Today the "Perfect Score" badge requires `averageScore >= 1.0` across **all** attempts, so it becomes permanently unearnable after one imperfect quiz. The badge evaluator only receives aggregated `PlayerStats` (no per-attempt data), so we extend `PlayerStats` with a boolean and compute it at each call site.

**Facts confirmed:** quiz scores are stored as **0..1 fractions** (`submitQuizAttempt` computes `score = correctCount / answers.length`, `quiz-actions.ts:96`; `recordQuizScore` appends that fraction into `playerProgress.quizScores`). So "any 100% attempt" is `allScores.some((s) => s >= 1)`.

**Files:**
- Modify: `src/lib/gamification.ts:9-18` (interface), `:50-55` (badge condition)
- Test: `tests/lib/gamification.test.ts`
- Modify: `src/app/(player)/progress/page.tsx:126-135` (add field to stats)
- (Home already sets the field in Task 1 Step 6.)

**Interfaces:**
- Produces: `PlayerStats` gains `hasPerfectQuiz: boolean`. Badge `perfect-quiz` condition becomes `(s) => s.hasPerfectQuiz`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/gamification.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getEarnedBadges, type PlayerStats } from "@/lib/gamification";

const baseStats: PlayerStats = {
  totalViews: 0,
  totalQuizzes: 0,
  averageScore: 0,
  hasPerfectQuiz: false,
  currentStreak: 0,
  longestStreak: 0,
  playsMastered: 0,
  totalPlays: 0,
  daysActive: 0,
};

describe("Perfect Score badge", () => {
  it("is not earned when no quiz was perfect", () => {
    const badges = getEarnedBadges({ ...baseStats, hasPerfectQuiz: false });
    expect(badges.some((b) => b.id === "perfect-quiz")).toBe(false);
  });

  it("is earned from one perfect quiz even when the average is below 100%", () => {
    const badges = getEarnedBadges({
      ...baseStats,
      averageScore: 0.5,
      hasPerfectQuiz: true,
    });
    expect(badges.some((b) => b.id === "perfect-quiz")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/lib/gamification.test.ts`
Expected: FAIL — TypeScript error `Object literal may only specify known properties, and 'hasPerfectQuiz' does not exist in type 'PlayerStats'` (field not added yet).

- [ ] **Step 3: Add the field to `PlayerStats`**

In `src/lib/gamification.ts`, add `hasPerfectQuiz` to the interface (insert after the `averageScore` line, currently line 12):

```ts
export interface PlayerStats {
  totalViews: number;
  totalQuizzes: number;
  averageScore: number;
  hasPerfectQuiz: boolean;
  currentStreak: number;
  longestStreak: number;
  playsMastered: number;
  totalPlays: number;
  daysActive: number;
}
```

- [ ] **Step 4: Change the badge condition**

In `src/lib/gamification.ts`, change the `perfect-quiz` badge's condition (line 54) from:

```ts
    condition: (s) => s.averageScore >= 1.0,
```

to:

```ts
    condition: (s) => s.hasPerfectQuiz,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- tests/lib/gamification.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire the Progress page stats**

In `src/app/(player)/progress/page.tsx`, add `hasPerfectQuiz` to the `stats` object (the `allScores` array already exists at line 117). The block at lines 126-135 becomes:

```ts
  const stats: PlayerStats = {
    totalViews,
    totalQuizzes,
    averageScore,
    hasPerfectQuiz: allScores.some((s) => s >= 1),
    currentStreak,
    longestStreak,
    playsMastered: counts.mastered,
    totalPlays: total,
    daysActive,
  };
```

- [ ] **Step 7: Verify build + tests**

Run: `npm run test:run` and `npm run build`
Expected: all tests green (including Task 1); build succeeds (Home + Progress both provide `hasPerfectQuiz`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/gamification.ts tests/lib/gamification.test.ts "src/app/(player)/progress/page.tsx"
git commit -m "fix: award Perfect Score badge for any single 100% quiz, not the running average"
```

---

## Task 3: Quiz score denominator — exclude unsupported question types (TDD)

`quiz-flow.tsx` divides correct answers by **all** questions including ones it renders as "not yet supported" and Skips, so an all-correct multiple-choice run can never reach 100% on a mixed quiz. This is a **display-only** fix: the server already scores correctly (`submitQuizAttempt` divides by `answers.length`, which excludes skipped questions). Extract the denominator logic into a pure, tested helper and use it for both the percent and the "X of Y correct" line.

**Files:**
- Create: `src/lib/quiz-score.ts`
- Test: `tests/lib/quiz-score.test.ts`
- Modify: `src/components/quiz/quiz-flow.tsx:74-92`

**Interfaces:**
- Produces: `countSupportedQuestions(questions: { questionType: string }[]): number` and `computeScorePercent(correctCount: number, supportedCount: number): number`.

**Out of scope:** the "Back to Quizzes" link target (`quiz-flow.tsx:87` → should be `/quiz`) is a §3 player-loop fix owned by a different plan. Do **not** touch the `<Link href="/quizzes">` here.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/quiz-score.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { countSupportedQuestions, computeScorePercent } from "@/lib/quiz-score";

describe("countSupportedQuestions", () => {
  it("counts only multiple_choice questions", () => {
    expect(
      countSupportedQuestions([
        { questionType: "multiple_choice" },
        { questionType: "multiple_choice" },
        { questionType: "diagram" },
      ]),
    ).toBe(2);
  });

  it("returns 0 when there are no questions", () => {
    expect(countSupportedQuestions([])).toBe(0);
  });
});

describe("computeScorePercent", () => {
  it("scores an all-correct multiple-choice run as 100%, ignoring skipped types", () => {
    // 2 correct out of 2 supported; a 3rd, unsupported question was skipped
    expect(computeScorePercent(2, 2)).toBe(100);
  });

  it("rounds to the nearest percent", () => {
    expect(computeScorePercent(2, 3)).toBe(67);
  });

  it("returns 0 when there are no supported questions", () => {
    expect(computeScorePercent(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/lib/quiz-score.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/quiz-score"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/quiz-score.ts`:

```ts
export function countSupportedQuestions(
  questions: { questionType: string }[],
): number {
  return questions.filter((q) => q.questionType === "multiple_choice").length;
}

export function computeScorePercent(
  correctCount: number,
  supportedCount: number,
): number {
  if (supportedCount <= 0) return 0;
  return Math.round((correctCount / supportedCount) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/lib/quiz-score.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the quiz finish screen**

In `src/components/quiz/quiz-flow.tsx`, add the import (after line 8):

```ts
import { countSupportedQuestions, computeScorePercent } from "@/lib/quiz-score";
```

Then replace the `finished` block header (lines 74-86) so the denominator is the number of **supported** questions:

```ts
  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const supportedCount = countSupportedQuestions(questions);
    const scorePercent = computeScorePercent(correctCount, supportedCount);

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
        <p className="text-4xl font-bold text-white">{scorePercent}%</p>
        <p className="text-sm text-zinc-400">
          {correctCount} of {supportedCount} correct
        </p>
```

Leave the rest of the block (the `<Link>` and closing tags, lines 87-91) unchanged.

- [ ] **Step 6: Verify build + tests**

Run: `npm run test:run` and `npm run build`
Expected: green. Manual check: a quiz with 2 multiple-choice questions (both answered correctly) plus 1 unsupported question shows **100%** and "2 of 2 correct".

- [ ] **Step 7: Commit**

```bash
git add src/lib/quiz-score.ts tests/lib/quiz-score.test.ts src/components/quiz/quiz-flow.tsx
git commit -m "fix: exclude unsupported question types from quiz score denominator"
```

---

## Task 4: Remove the ThemeToggle control from all three chrome surfaces

Hide the decorative theme toggle everywhere it appears. Keep `ThemeProvider` and the `.light` variables — Phase 2 restores real light mode.

**Files:**
- Modify: `src/components/layout/coach-sidebar.tsx:22` (import), `:152-154` (footer usage)
- Modify: `src/app/(coach)/layout.tsx:6` (import), `:39` (header usage)
- Modify: `src/app/(player)/layout.tsx:6` (import), `:39` (header usage)

- [ ] **Step 1: Coach sidebar — remove import and footer toggle**

In `src/components/layout/coach-sidebar.tsx`:

1. Delete the import line (line 22): `import { ThemeToggle } from "@/components/ui/theme-toggle";`
2. Replace the footer block (lines 147-155) so only the notification bell remains:

```tsx
      {/* Notifications */}
      <div className="space-y-1 border-t border-white/8 px-3 py-3">
        <Tooltip label="Notifications" show={collapsed}>
          <NotificationBell />
        </Tooltip>
      </div>
```

- [ ] **Step 2: Coach layout — remove import and header toggle**

In `src/app/(coach)/layout.tsx`:

1. Delete the import line (line 6): `import { ThemeToggle } from "@/components/ui/theme-toggle";`
2. Replace the header actions block (lines 38-41):

```tsx
          <div className="flex items-center gap-2">
            <UserMenu user={session.user} />
          </div>
```

- [ ] **Step 3: Player layout — remove import and header toggle**

In `src/app/(player)/layout.tsx`:

1. Delete the import line (line 6): `import { ThemeToggle } from "@/components/ui/theme-toggle";` (leave the line-7 `NotificationBell` import — it stays).
2. Replace the header actions block (lines 37-41), keeping the bell and user menu:

```tsx
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu user={session.user} />
        </div>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds with no unused-import errors. `src/components/ui/theme-toggle.tsx` stays in the repo (unreferenced) for Phase 2; that is intentional. Manually confirm no theme control is visible in the coach sidebar footer, coach header, or player header.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/coach-sidebar.tsx "src/app/(coach)/layout.tsx" "src/app/(player)/layout.tsx"
git commit -m "chore: hide ThemeToggle in all chrome (light mode returns with Phase 2 tokens)"
```

---

## Task 5: Mobile config one-liners — viewport export, player-header safe area, manifest theme color

**Files:**
- Modify: `src/app/layout.tsx:1` (import type), `:17-26` (metadata + new viewport export)
- Modify: `src/app/(player)/layout.tsx:30` (header safe-area padding)
- Modify: `src/app/manifest.ts:11` (theme color)

- [ ] **Step 1: Add the `viewport` export to the root layout**

In `src/app/layout.tsx`:

1. Change the type import (line 1) to also import `Viewport`:

```ts
import type { Metadata, Viewport } from "next";
```

2. Next.js 16 wants `themeColor`/`viewportFit` in a separate `viewport` export, not in `metadata`. Replace the `metadata` export (lines 17-26) and add a `viewport` export directly after it. Drop the now-redundant `"theme-color"` from `metadata.other` (it moves into `viewport.themeColor`); keep the two `apple-*` entries:

```ts
export const metadata: Metadata = {
  title: "PlayForge - Interactive Football Playbook",
  description:
    "Build, animate, and share football plays. Help your team learn with interactive quizzes and spaced repetition.",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};
```

- [ ] **Step 2: Add top safe-area padding to the player header**

In `src/app/(player)/layout.tsx`, update the header element (line 30). Change `h-16` to `min-h-16` so the safe-area inset does not compress the 4rem header content, and add the top inset padding:

```tsx
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-white/8 bg-[var(--background)]/75 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6">
```

- [ ] **Step 3: Align the manifest theme color**

In `src/app/manifest.ts`, change line 11:

```ts
    theme_color: "#0f766e",
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds; no "Unsupported metadata themeColor is configured in metadata export" warning (it now lives in `viewport`). Manual check (iOS Safari or responsive devtools with a simulated notch): the player header content is not clipped by the status bar and the header keeps its full height.

- [ ] **Step 5: Commit**

```bash
git add "src/app/layout.tsx" "src/app/(player)/layout.tsx" src/app/manifest.ts
git commit -m "feat: add viewport export, player-header safe-area inset, teal manifest theme color"
```

---

## Task 6: Shared page skeleton + coach `loading.tsx` files

Give every coach route a loading state that matches real card geometry (`rounded-[22px]`, translucent surface) using the existing (currently dead) `Skeleton` primitive. One shared component keeps each `loading.tsx` a one-liner.

**Files:**
- Create: `src/components/ui/page-skeleton.tsx`
- Create: `src/app/(coach)/dashboard/loading.tsx`, `src/app/(coach)/playbooks/loading.tsx`, `src/app/(coach)/roster/loading.tsx`, `src/app/(coach)/quizzes/loading.tsx`, `src/app/(coach)/analytics/loading.tsx`, `src/app/(coach)/practice/loading.tsx`, `src/app/(coach)/game-plans/loading.tsx`, `src/app/(coach)/settings/loading.tsx`

**Interfaces:**
- Produces: `PageSkeleton()` — a full-page shimmer (title rows + a responsive grid of card-shaped skeletons).

- [ ] **Step 1: Create the shared page skeleton**

Create `src/components/ui/page-skeleton.tsx`. The container mirrors `Card` geometry from `src/components/ui/card.tsx` (`rounded-[22px] border border-white/8` + the translucent gradient + `backdrop-blur-md`), and reuses the existing `Skeleton` bars:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 backdrop-blur-md sm:p-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the eight `loading.tsx` files**

Each of these eight files has **identical** content:

```tsx
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton />;
}
```

Create it at all eight paths:
- `src/app/(coach)/dashboard/loading.tsx`
- `src/app/(coach)/playbooks/loading.tsx`
- `src/app/(coach)/roster/loading.tsx`
- `src/app/(coach)/quizzes/loading.tsx`
- `src/app/(coach)/analytics/loading.tsx`
- `src/app/(coach)/practice/loading.tsx`
- `src/app/(coach)/game-plans/loading.tsx`
- `src/app/(coach)/settings/loading.tsx`

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds; build output lists each coach route. Manual check: throttle the network in devtools and navigate between coach pages — a card-shaped shimmer appears during the server render instead of a blank screen.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/page-skeleton.tsx "src/app/(coach)/dashboard/loading.tsx" "src/app/(coach)/playbooks/loading.tsx" "src/app/(coach)/roster/loading.tsx" "src/app/(coach)/quizzes/loading.tsx" "src/app/(coach)/analytics/loading.tsx" "src/app/(coach)/practice/loading.tsx" "src/app/(coach)/game-plans/loading.tsx" "src/app/(coach)/settings/loading.tsx"
git commit -m "feat: add PageSkeleton and loading.tsx to all coach routes"
```

---

## Task 7: Shared error state + route-group `error.tsx` boundaries

A shared error component plus one `error.tsx` per route group so an unhandled render error shows a message and a working "Try again" instead of a crash.

**Files:**
- Create: `src/components/ui/error-state.tsx`
- Create: `src/app/(coach)/error.tsx`, `src/app/(player)/error.tsx`

**Interfaces:**
- Produces: `ErrorState({ message?: string; onRetry: () => void })`.

**Scope note:** a route-group `error.tsx` catches errors thrown by **pages** in that group, but not errors thrown by the group's own `layout.tsx` (the auth/`redirect` code in `(coach)/layout.tsx` and `(player)/layout.tsx`). That is acceptable for Phase 1 — those paths already `redirect` on failure rather than throw render errors.

- [ ] **Step 1: Create the shared error component**

Create `src/components/ui/error-state.tsx`. It reuses `Button` (`variant="outline"`, `size="sm"` are both supported) and the `XCircle` icon already used elsewhere in the app:

```tsx
"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] py-20 text-center backdrop-blur-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <XCircle className="h-6 w-6 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-200">Something went wrong</p>
        <p className="mt-1 text-xs text-zinc-500">
          {message ?? "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create the two `error.tsx` boundaries**

Next.js requires `error.tsx` to be a Client Component. Both files have **identical** content:

```tsx
"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
```

Create it at:
- `src/app/(coach)/error.tsx`
- `src/app/(player)/error.tsx`

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds. Manual check (dev): temporarily `throw new Error("boom")` at the top of a coach page component, load it, confirm the error card renders with a working "Try again" button, then remove the throw.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/error-state.tsx "src/app/(coach)/error.tsx" "src/app/(player)/error.tsx"
git commit -m "feat: add shared ErrorState and route-group error boundaries"
```

---

## Task 8: Shared confirm dialog primitive

A single reusable confirmation dialog built directly on `@radix-ui/react-dialog` (there is **no** `src/components/ui/dialog.tsx` wrapper in this repo; the designer imports Radix directly). Style it to match the existing print dialog in `designer/page.tsx` (`rounded-2xl border border-zinc-700/60 bg-zinc-900`, the same overlay/content animation classes).

**Files:**
- Create: `src/components/ui/confirm-dialog.tsx`

**Interfaces:**
- Produces: `ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive?, onConfirm })` where `open: boolean`, `onOpenChange: (open: boolean) => void`, `title/description/confirmLabel: string`, `destructive?: boolean`, `onConfirm: () => void`. Consumed by Task 13.

- [ ] **Step 1: Create the component**

Create `src/components/ui/confirm-dialog.tsx`:

```tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <Dialog.Title className="text-sm font-semibold text-zinc-100">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-zinc-400">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
              Cancel
            </Dialog.Close>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                destructive
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-emerald-600 hover:bg-emerald-500",
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (component is not yet imported anywhere; that is fine — Task 13 consumes it). TypeScript confirms the prop types.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/confirm-dialog.tsx
git commit -m "feat: add shared ConfirmDialog primitive on Radix Dialog"
```

---

## Task 9: Designer safety — beforeunload guard, getPlay error toast, ⌘Z input scoping

Three cohesive safety fixes in the designer. All in one file.

**Files:**
- Modify: `src/app/(coach)/designer/page.tsx` — add a `beforeunload` effect near line 108; add `.catch` to the `getPlay` load (`:95-105`); add `ignoreInputs: true` to the undo/redo shortcuts (`:466-475`).

- [ ] **Step 1: Add a `beforeunload` guard when the play is dirty**

In `src/app/(coach)/designer/page.tsx`, add this effect immediately after the play-load effect (after its closing at line 108, before the "Animation preview state" comment at line 110):

```tsx
  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
```

(`useEffect` is already imported on line 3.)

- [ ] **Step 2: Add error handling to the `getPlay` load**

Still in `src/app/(coach)/designer/page.tsx`, replace the load effect body (lines 95-105) so a failed fetch surfaces a toast instead of silently doing nothing. Change:

```tsx
    getPlay(playId).then((play) => {
      if (cancelled || !play) return;
      const canvas = deserializeCanvas(play.canvasData);
      setCanvasData(canvas);
      setPlayName(play.name);
      setPlayType(play.playType);
      if (canvas.meta.side) setSide(canvas.meta.side as "offense" | "defense");
      if (play.filmUrl) setFilmUrl(play.filmUrl);
      if (play.filmTimestamp) setFilmTimestamp(play.filmTimestamp);
      setDirty(false);
    });
```

to:

```tsx
    getPlay(playId)
      .then((play) => {
        if (cancelled || !play) return;
        const canvas = deserializeCanvas(play.canvasData);
        setCanvasData(canvas);
        setPlayName(play.name);
        setPlayType(play.playType);
        if (canvas.meta.side) setSide(canvas.meta.side as "offense" | "defense");
        if (play.filmUrl) setFilmUrl(play.filmUrl);
        if (play.filmTimestamp) setFilmTimestamp(play.filmTimestamp);
        setDirty(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Couldn't load this play. It may have been deleted.");
      });
```

(`toast` is already in scope from `const toast = useToast();` at line 53; the effect keeps its existing `// eslint-disable-next-line react-hooks/exhaustive-deps` and empty dependency array.)

- [ ] **Step 3: Scope undo/redo to ignore text inputs**

Still in `src/app/(coach)/designer/page.tsx`, add `ignoreInputs: true` to the two undo/redo shortcut registrations (lines 466-475). They become:

```tsx
    {
      key: "z",
      meta: true,
      handler: handleUndo,
      ignoreInputs: true,
    },
    {
      key: "z",
      meta: true,
      shift: true,
      handler: handleRedo,
      ignoreInputs: true,
    },
```

(Leave the other shortcuts, including `Cmd+S` save, as they are — save-while-typing-a-name is intended.)

- [ ] **Step 4: Verify build + manual check**

Run: `npm run build`
Expected: succeeds. Manual checks:
- Make a change in the designer, then attempt to close/reload the tab → the browser's "Leave site?" prompt appears; save, then reload → no prompt.
- Open `?playId=<nonexistent>` → an error toast appears (no silent blank canvas).
- Focus the play-name input, type text containing "z", press `Cmd/Ctrl+Z` → the text field's own undo runs; the canvas does not undo.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/designer/page.tsx"
git commit -m "fix: designer beforeunload guard, getPlay error toast, scope undo/redo to canvas"
```

---

## Task 10: Designer draft restore loop + single-draft cap

Today "Save" with no playbook context writes a `playforge-draft-<timestamp>` localStorage key and toasts that the draft is recoverable — but nothing ever reads it back, and keys accumulate forever. Close the loop: on opening the designer with no `playId`/`playbookId`, offer to restore the most recent draft via an inline banner (the toast API has **no** action support), and cap stored drafts to the single most recent on save.

**Files:**
- Modify: `src/app/(coach)/designer/page.tsx` — add draft state + mount effect + restore/dismiss handlers; add the restore banner to the canvas overlay; cap drafts in `handleSave`'s no-context branch (`:234-240`).

**Interfaces:**
- Consumes: `deserializeCanvas` (already imported), `useToast` (already in scope).

**Note on key ordering:** draft keys are `playforge-draft-${Date.now()}`. `Date.now()` is a fixed-width 13-digit value for the app's lifetime, so lexicographic `.sort()` equals chronological order — the last element is the newest.

- [ ] **Step 1: Add draft state and the mount effect**

In `src/app/(coach)/designer/page.tsx`, add a state declaration alongside the other `useState`s (e.g. after line 88, `const canvasRef = ...`):

```tsx
  const [draftKey, setDraftKey] = useState<string | null>(null);
```

Then add this effect just after the `beforeunload` effect added in Task 9 (before the "Animation preview state" comment):

```tsx
  // Offer to restore a saved draft when opening the designer with no target
  useEffect(() => {
    if (searchParams.get("playId") || searchParams.get("playbookId")) return;
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("playforge-draft-"),
    );
    if (keys.length === 0) return;
    keys.sort();
    setDraftKey(keys[keys.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 2: Add restore and dismiss handlers**

Add these two handlers near the other `useCallback` handlers (e.g. after `handlePrint`, around line 401):

```tsx
  const handleRestoreDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          name?: string;
          playType?: string;
          canvasData?: unknown;
        };
        const canvas = deserializeCanvas(draft.canvasData);
        setCanvasData(canvas);
        setPlayName(draft.name ?? "Untitled Play");
        setPlayType(draft.playType ?? "pass");
        if (canvas.meta.side) setSide(canvas.meta.side as "offense" | "defense");
        setDirty(true);
      }
    } catch {
      toast.error("Couldn't restore draft.");
    }
    setDraftKey(null);
  }, [draftKey, toast]);

  const handleDismissDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
    setDraftKey(null);
  }, [draftKey]);
```

- [ ] **Step 3: Cap stored drafts to the most recent on save**

In `handleSave`, replace the no-context `else` branch (lines 233-241) so older drafts are pruned before the new one is written:

```tsx
      } else {
        // No playbook context — save to localStorage as fallback.
        // Cap stored drafts: keep only the one we are about to write.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("playforge-draft-"))
          .forEach((k) => localStorage.removeItem(k));
        const key = `playforge-draft-${Date.now()}`;
        localStorage.setItem(
          key,
          JSON.stringify({ name: playName, playType, canvasData }),
        );
        toast.info("No playbook selected. Draft saved to browser storage.");
      }
```

- [ ] **Step 4: Add the restore banner to the canvas overlay**

Inside the canvas-area `div` (the `relative flex-1` block), add the banner just after the floating toolbar block (after line 597, the closing `</div>` of the toolbar wrapper). It sits above the canvas and offers Restore / Dismiss:

```tsx
        {/* Draft restore banner */}
        {draftKey && (
          <div className="absolute inset-x-0 top-24 z-30 flex justify-center px-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur-sm">
              <span>Restore your unsaved draft?</span>
              <button
                onClick={handleRestoreDraft}
                className="rounded-md bg-emerald-600 px-3 py-1 font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Restore
              </button>
              <button
                onClick={handleDismissDraft}
                className="rounded-md px-2 py-1 text-zinc-400 transition-colors hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
```

- [ ] **Step 5: Verify build + manual check**

Run: `npm run build`
Expected: succeeds. Manual checks:
- Open the designer with no query params, build a formation, press `Cmd/Ctrl+S` → "Draft saved to browser storage" toast; in devtools Application → Local Storage there is exactly **one** `playforge-draft-*` key.
- Save again → still exactly one key (the older one is removed).
- Reload the designer (no params) → the "Restore your unsaved draft?" banner appears. Click **Restore** → the players/name/type return. Reload again → banner reappears; click **Dismiss** → banner closes and the key is gone from localStorage; reload → no banner.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/designer/page.tsx"
git commit -m "feat: designer draft restore banner and single-draft cap"
```

---

## Task 11: Honest mutations — game-plan play list (optimistic revert)

`GamePlanPlayList` mutates local state **before** awaiting the server action and never reverts or surfaces failures. Capture prior state and restore it (plus an error toast) in a `catch`.

**Files:**
- Modify: `src/components/game-plan/play-list.tsx` — add `useToast`; wrap `movePlay` (`:53-72`), `handleRemove` (`:74-92`), `handleAdd` (`:94-116`).

**Pattern:** these three handlers are **optimistic** (they call `setPlays`/`setAvailablePlays` before the await), so each must snapshot prior state and restore it on failure. This differs from the non-optimistic reference in `quiz-create-client.tsx:181` — do not copy that shape here.

- [ ] **Step 1: Import and instantiate the toast API**

In `src/components/game-plan/play-list.tsx`, add the import (after line 5, the `Badge` import):

```tsx
import { useToast } from "@/components/ui/toast";
```

Inside the component, add the hook next to the other hooks (after line 51, `const [isPending, startTransition] = useTransition();`):

```tsx
  const toast = useToast();
```

- [ ] **Step 2: Make `movePlay` revert on failure**

Replace `movePlay` (lines 53-72):

```tsx
  const movePlay = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plays.length) return;

    const prevPlays = plays;

    const newPlays = [...plays];
    const temp = newPlays[index];
    newPlays[index] = newPlays[newIndex];
    newPlays[newIndex] = temp;

    // Update sortOrder
    const reordered = newPlays.map((p, i) => ({ ...p, sortOrder: i }));
    setPlays(reordered);

    startTransition(async () => {
      try {
        await reorderGamePlanPlays(
          gamePlanId,
          reordered.map((p) => p.playId),
        );
      } catch (err) {
        setPlays(prevPlays);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder plays",
        );
      }
    });
  };
```

- [ ] **Step 3: Make `handleRemove` revert on failure**

Replace `handleRemove` (lines 74-92):

```tsx
  const handleRemove = (playId: string) => {
    const prevPlays = plays;
    const prevAvailable = availablePlays;

    const removed = plays.find((p) => p.playId === playId);
    setPlays((prev) => prev.filter((p) => p.playId !== playId));
    if (removed) {
      setAvailablePlays((prev) => [
        ...prev,
        {
          id: removed.playId,
          name: removed.name,
          formation: removed.formation,
          playType: removed.playType,
        },
      ]);
    }

    startTransition(async () => {
      try {
        await removePlayFromGamePlan(gamePlanId, playId);
      } catch (err) {
        setPlays(prevPlays);
        setAvailablePlays(prevAvailable);
        toast.error(
          err instanceof Error ? err.message : "Failed to remove play",
        );
      }
    });
  };
```

- [ ] **Step 4: Make `handleAdd` revert on failure**

Replace `handleAdd` (lines 94-116):

```tsx
  const handleAdd = (playId: string) => {
    const play = availablePlays.find((p) => p.id === playId);
    if (!play) return;

    const prevPlays = plays;
    const prevAvailable = availablePlays;

    setAvailablePlays((prev) => prev.filter((p) => p.id !== playId));
    setPlays((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        playId: play.id,
        sortOrder: prev.length,
        name: play.name,
        formation: play.formation,
        playType: play.playType,
        thumbnailUrl: null,
      },
    ]);
    setShowPicker(false);

    startTransition(async () => {
      try {
        await addPlayToGamePlan(gamePlanId, playId);
      } catch (err) {
        setPlays(prevPlays);
        setAvailablePlays(prevAvailable);
        toast.error(err instanceof Error ? err.message : "Failed to add play");
      }
    });
  };
```

- [ ] **Step 5: Verify build + manual check**

Run: `npm run build`
Expected: succeeds. Manual check: `GamePlanPlayList` is rendered inside `ToastProvider` (root layout), so `useToast()` resolves. With devtools offline (or a forced server error), reorder/add/remove a play → the list snaps back to its prior order/contents and a red error toast appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/game-plan/play-list.tsx
git commit -m "fix: revert game-plan play-list mutations and toast on failure"
```

---

## Task 12: Honest mutations — practice editor + create button (non-optimistic)

The practice editor and the create-plan button await server actions without any error handling. Add try/catch + error toast. Most of these are **non-optimistic** (they `await` then `setState`), so they need no state revert; the one exception is `handleMove`, which reorders optimistically and must revert.

**Files:**
- Modify: `src/app/(coach)/practice/[id]/editor.tsx` — add `useToast`; wrap `savePlanHeader` (`:65-73`), `handleAddPeriod` (`:75-94`), `savePeriod` (`:106-117`), `handleDeletePeriod` (`:119-124`), `handleMove` (`:126-141`).
- Modify: `src/app/(coach)/practice/create-button.tsx` — add `useToast`; wrap `handleCreate` (`:17-27`).

**Note:** `handleDeletePlan` (`editor.tsx:143`) is intentionally **not** changed here — it is rewritten in Task 13 (confirmations) where its native `confirm()` is replaced and error handling is added there.

- [ ] **Step 1: Practice editor — import and instantiate the toast API**

In `src/app/(coach)/practice/[id]/editor.tsx`, add the import (after line 6, the `Input` import):

```tsx
import { useToast } from "@/components/ui/toast";
```

Add the hook next to the other hooks (after line 61, `const router = useRouter();`):

```tsx
  const toast = useToast();
```

- [ ] **Step 2: Wrap `savePlanHeader` (non-optimistic — toast only)**

Replace `savePlanHeader` (lines 65-73):

```tsx
  function savePlanHeader() {
    startTransition(async () => {
      try {
        await updatePracticePlan(plan.id, {
          name: planName,
          date: planDate || null,
          notes: planNotes || null,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save plan",
        );
      }
    });
  }
```

- [ ] **Step 3: Wrap `handleAddPeriod` (non-optimistic — toast only)**

Replace `handleAddPeriod` (lines 75-94):

```tsx
  function handleAddPeriod() {
    startTransition(async () => {
      try {
        const period = await addPracticePeriod({
          practicePlanId: plan.id,
          name: "New Period",
          durationMin: 15,
        });
        setPeriods((prev) => [
          ...prev,
          {
            id: period.id,
            name: period.name,
            durationMin: period.durationMin,
            sortOrder: period.sortOrder,
            playIds: [],
            notes: null,
          },
        ]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to add period",
        );
      }
    });
  }
```

- [ ] **Step 4: Wrap `savePeriod` (non-optimistic — toast only)**

Replace `savePeriod` (lines 106-117):

```tsx
  function savePeriod(id: string) {
    const period = periods.find((p) => p.id === id);
    if (!period) return;
    startTransition(async () => {
      try {
        await updatePracticePeriod(id, {
          name: period.name,
          durationMin: period.durationMin,
          playIds: period.playIds,
          notes: period.notes,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save period",
        );
      }
    });
  }
```

- [ ] **Step 5: Wrap `handleDeletePeriod` (non-optimistic — toast only)**

Replace `handleDeletePeriod` (lines 119-124). It awaits, then removes from state, so a failure simply leaves the period in place:

```tsx
  function handleDeletePeriod(id: string) {
    startTransition(async () => {
      try {
        await deletePracticePeriod(id);
        setPeriods((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete period",
        );
      }
    });
  }
```

- [ ] **Step 6: Wrap `handleMove` (optimistic — revert on failure)**

Replace `handleMove` (lines 126-141). This one reorders local state before the await, so snapshot and restore:

```tsx
  function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= periods.length) return;

    const prevPeriods = periods;
    const newPeriods = [...periods];
    [newPeriods[index], newPeriods[swapIndex]] = [
      newPeriods[swapIndex],
      newPeriods[index],
    ];
    setPeriods(newPeriods);
    startTransition(async () => {
      try {
        await reorderPracticePeriods(
          plan.id,
          newPeriods.map((p) => p.id),
        );
      } catch (err) {
        setPeriods(prevPeriods);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder periods",
        );
      }
    });
  }
```

- [ ] **Step 7: Practice create button — import, instantiate, and wrap `handleCreate`**

In `src/app/(coach)/practice/create-button.tsx`, add the import (after line 7, the lucide import):

```tsx
import { useToast } from "@/components/ui/toast";
```

Add the hook after line 15 (`const router = useRouter();`):

```tsx
  const toast = useToast();
```

Replace `handleCreate` (lines 17-27). It awaits then navigates, so a failure needs only a toast (no navigation, no state revert):

```tsx
  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        const plan = await createPracticePlan({
          orgId,
          name: name.trim(),
          date: date || null,
        });
        router.push(`/practice/${plan.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create plan",
        );
      }
    });
  }
```

- [ ] **Step 8: Verify build + manual check**

Run: `npm run build`
Expected: succeeds. Manual check (offline or forced server error): adding/saving/reordering/deleting a period and creating a plan each surface a red error toast; a failed reorder snaps the period order back.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(coach)/practice/[id]/editor.tsx" "src/app/(coach)/practice/create-button.tsx"
git commit -m "fix: surface practice editor and create-plan mutation failures via toast"
```

---

## Task 13: Confirmations — invite regenerate, practice period delete, practice plan delete

Guard the destructive actions with the shared `ConfirmDialog` (Task 8), and replace the native `confirm()` on plan delete.

**Files:**
- Modify: `src/components/roster/invite-code-card.tsx` — confirm invite-code regenerate (`:114-119` button; `:28-38` handler).
- Modify: `src/app/(coach)/practice/[id]/editor.tsx` — confirm period delete (`:276` trigger) and plan delete (replace `confirm()` at `:144`; button at `:208-216`).

**Consumes:** `ConfirmDialog` from Task 8. This task builds on the Task 12 version of `editor.tsx`.

- [ ] **Step 1: Invite code — add confirm state, toast, and dialog**

In `src/components/roster/invite-code-card.tsx`:

1. Add imports (after line 7, the `generateInviteQR` import):

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
```

2. Add state + toast next to the existing hooks (after line 20, `const [qrLoading, setQrLoading] = useState(false);`):

```tsx
  const [confirmRegen, setConfirmRegen] = useState(false);
  const toast = useToast();
```

3. Replace `handleRegenerate` (lines 28-38) to add error handling (it is called from the dialog's `onConfirm`, so a rejection must be caught):

```tsx
  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const newCode = await regenerateInviteCode(orgId);
      setCode(newCode);
      setQrDataUrl(null); // Invalidate cached QR
      setShowQR(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate code",
      );
    } finally {
      setRegenerating(false);
    }
  }
```

4. Change the Regenerate button's `onClick` (line 117) from `onClick={handleRegenerate}` to open the dialog:

```tsx
            onClick={() => setConfirmRegen(true)}
```

5. Add the dialog just before the closing `</Card>` (after line 244, the closing `</CardContent>`):

```tsx
      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Regenerate invite code?"
        description="The current code will stop working immediately. Anyone who has it will need the new code to join."
        confirmLabel="Regenerate"
        destructive
        onConfirm={handleRegenerate}
      />
```

- [ ] **Step 2: Practice editor — import dialog and add confirm state**

In `src/app/(coach)/practice/[id]/editor.tsx`:

1. Add the import (after the `useToast` import added in Task 12):

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
```

2. Add two pieces of confirm state next to the other hooks (after `const toast = useToast();`):

```tsx
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string | null>(null);
  const [confirmPlanDelete, setConfirmPlanDelete] = useState(false);
```

- [ ] **Step 3: Replace the native `confirm()` on plan delete**

Replace `handleDeletePlan` (lines 143-149 — the Task 12 version left this untouched, so it still contains the native `confirm()`). Remove the `confirm()` guard and add error handling; the confirmation now comes from the dialog:

```tsx
  function handleDeletePlan() {
    startTransition(async () => {
      try {
        await deletePracticePlan(plan.id);
        router.push("/practice");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete plan",
        );
      }
    });
  }
```

- [ ] **Step 4: Point the period-delete button at the confirm dialog**

Change the per-period delete button `onClick` (line 277) from `onClick={() => handleDeletePeriod(period.id)}` to:

```tsx
                onClick={() => setPendingDeletePeriodId(period.id)}
```

- [ ] **Step 5: Point the plan-delete button at the confirm dialog**

Change the plan Delete button `onClick` (line 211) from `onClick={handleDeletePlan}` to:

```tsx
            onClick={() => setConfirmPlanDelete(true)}
```

- [ ] **Step 6: Render both dialogs**

Add both dialogs just before the final closing `</div>` of the component's return (after the "Add period" `Button` block, i.e. after line 360):

```tsx
      <ConfirmDialog
        open={pendingDeletePeriodId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePeriodId(null);
        }}
        title="Delete this period?"
        description="This removes the period and its play assignments from the practice plan."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeletePeriodId) handleDeletePeriod(pendingDeletePeriodId);
        }}
      />

      <ConfirmDialog
        open={confirmPlanDelete}
        onOpenChange={setConfirmPlanDelete}
        title="Delete this practice plan?"
        description="The entire plan and all its periods will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeletePlan}
      />
```

- [ ] **Step 7: Verify build + manual check**

Run: `npm run build`
Expected: succeeds. Manual checks:
- Roster → Invite Code → "Regenerate" opens the confirm dialog; Cancel leaves the code unchanged; Confirm regenerates.
- Practice plan editor → a period's trash icon opens the confirm dialog; Confirm deletes only that period.
- Practice plan editor → "Delete" (plan) opens the confirm dialog instead of a native browser `confirm()`; Confirm deletes the plan and routes back to `/practice`.

- [ ] **Step 8: Commit**

```bash
git add src/components/roster/invite-code-card.tsx "src/app/(coach)/practice/[id]/editor.tsx"
git commit -m "feat: confirm dialogs for invite regenerate and practice period/plan delete"
```

---

## Final verification (run after all tasks)

- [ ] Run `npm run test:run` — all suites green, including the three new pure-logic suites (`streak`, `gamification`, `quiz-score`).
- [ ] Run `npm run build` — succeeds with no metadata/viewport warnings.
- [ ] Manual walkthrough checklist:
  - Home and Progress show the **same** streak, XP, and level for one account.
  - A quiz with a mix of multiple-choice and unsupported questions, all MC answered correctly, scores **100%** ("N of N correct").
  - A single 100% quiz earns the **Perfect Score** badge even after a later imperfect quiz.
  - No theme toggle anywhere; the app is still dark (ThemeProvider intact).
  - Coach pages show a card-shaped skeleton while loading; a thrown page error shows the shared error card with a working "Try again".
  - Designer: `beforeunload` prompt when dirty; error toast on bad `playId`; `Cmd/Ctrl+Z` in a text field does not undo the canvas; draft restore banner works and only one draft key persists.
  - Failed mutations (game-plan list, practice editor, create-plan) toast and, where optimistic, revert.
  - Invite regenerate, period delete, and plan delete all go through the shared confirm dialog.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-02-phase1d-safety-net.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
