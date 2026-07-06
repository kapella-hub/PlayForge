# PlayForge Phase 3b — Engagement Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three structural breaks in the player engagement loop — server-side quiz grading (stop trusting the client and stop shipping the answer key), quizzes-not-views drive mastery, and a live streak-aware celebration on the quiz finish screen.

**Architecture:** A new pure grading module (`quiz-grading.ts`) becomes the single source of truth for multiple-choice correctness. `submitQuizAttempt` grades server-side inside its existing `db.$transaction`; a new `getPlayerQuiz` strips the answer key from the player page and a new `checkAnswer` server action powers the instant right/wrong reveal. `recordPlayView` stops running SM-2 (views build familiarity, not mastery); `recordQuizScore` becomes the sole SM-2 writer and stamps `lastViewedAt`. `nextReviewAt` becomes nullable so view-only rows are never "due." Streak enters the reward math via `playerStatsFromProgress` + `computeStreak`, and the finish screen becomes a staged framer-motion celebration that respects `prefers-reduced-motion`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Prisma 7 + PostgreSQL, NextAuth v5, framer-motion 12, Tailwind v4 (token-only), vitest 4.

## Global Constraints

_Every task's requirements implicitly include this section._

- **Verification quartet, per task:** `npm run test:run` (all green; **183 baseline**, grows as tasks add tests), `npx tsc --noEmit` (clean), `npm run lint` (**0 errors — never goes up**), `npm run build` (succeeds). State the expected lint count (**0**) in every task's verify step.
- **Migration task order:** any schema change runs **migrate → generate → tsc** in that order (`docker compose -f docker-compose.dev.yml up -d` first; `npx prisma migrate dev` reads `DATABASE_URL` from `.env` via `prisma.config.ts`).
- **Lint idioms (client code):** no `set-state-in-effect`, no `ref-in-render`. Use derived state, adjust-state-during-render with a prev-value compare, `useSyncExternalStore`, remount-via-`key`, or framer-motion `MotionValue`s (which do not call React `setState`). Never introduce an `eslint-disable`.
- **Tokens only:** no raw hex, no `rgba(`/`rgb(` literals, no `zinc/slate/gray/neutral/white/black` utilities in `src/app` or `src/components`. Any text on a `bg-accent` fill uses `text-accent-foreground` (the Phase 3a contrast test already pins the pair). Celebration/animation reuse existing token utilities.
- **No new dependencies.** framer-motion is already in `package.json` (`^12.38.0`).
- **Test conventions:** tests live under `tests/` mirroring `src/`. Mock `@/lib/db`, `@/lib/auth`, `@/lib/authz` with `vi.mock`; use `vi.mocked`, `invocationCallOrder` for ordering assertions, and negative assertions (`expect(...).not.toHaveBeenCalled()` / `.not.toHaveProperty(...)`) on failure/absence paths.
- **Attempt JSON shape stays `{questionId, answer, correct}`** so historical attempts remain readable — the values just become trustworthy (server-graded).
- **Branch:** `phase-3b-engagement` (stacked on `phase-3a-hardening`). Commit after each task; do not merge.

---

### Task 1: Pure grading module `quiz-grading.ts`

**Files:**
- Create: `src/lib/quiz-grading.ts`
- Test: `tests/lib/quiz-grading.test.ts`

**Interfaces:**
- Produces: `gradeAnswers(questions: GradingQuestion[], submitted: SubmittedAnswer[]): GradeResult` where
  - `GradingQuestion = { id: string; questionType: string; options: { text: string; correct: boolean }[] | null }`
  - `SubmittedAnswer = { questionId: string; answer: string }`
  - `GradedAnswer = { questionId: string; answer: string; correct: boolean }`
  - `GradeResult = { graded: GradedAnswer[]; correctCount: number; supportedCount: number; score: number }` (`score` is a 0..1 fraction over supported questions)
- Produces: `matchMultipleChoice(options: { text: string; correct: boolean }[] | null, answer: string): { correct: boolean; correctText: string | null }` — reused by Task 3's `checkAnswer`.
- Produces: `isSupportedType(questionType: string): boolean` — only `"multiple_choice"` today (mirrors `countSupportedQuestions` in `src/lib/quiz-score.ts:1`).

**Design notes (copy exactly):**
- Correctness identity is the same the client uses today (`multiple-choice.tsx:32` reads `option.correct`): an answer is correct **iff its text exactly matches an option with `correct: true`**.
- Unsupported question types (anything ≠ `multiple_choice`) and unknown `questionId`s are **excluded from grading and from the denominator** (`supportedCount`). They still appear in `graded` with `correct: false` so the stored attempt JSON has one entry per submitted answer.
- `score = supportedCount > 0 ? correctCount / supportedCount : 0`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/quiz-grading.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  gradeAnswers,
  matchMultipleChoice,
  isSupportedType,
} from "@/lib/quiz-grading";

const q = (
  id: string,
  correctText: string,
  type = "multiple_choice",
) => ({
  id,
  questionType: type,
  options: [
    { text: correctText, correct: true },
    { text: "wrong", correct: false },
  ],
});

describe("isSupportedType", () => {
  it("supports multiple_choice only", () => {
    expect(isSupportedType("multiple_choice")).toBe(true);
    expect(isSupportedType("tap_field")).toBe(false);
  });
});

describe("matchMultipleChoice", () => {
  it("marks the exact-text correct option as correct and reports correctText", () => {
    const opts = [
      { text: "Cover 2", correct: true },
      { text: "Cover 3", correct: false },
    ];
    expect(matchMultipleChoice(opts, "Cover 2")).toEqual({
      correct: true,
      correctText: "Cover 2",
    });
    expect(matchMultipleChoice(opts, "Cover 3")).toEqual({
      correct: false,
      correctText: "Cover 2",
    });
  });

  it("returns correctText null and correct false for null options", () => {
    expect(matchMultipleChoice(null, "x")).toEqual({
      correct: false,
      correctText: null,
    });
  });
});

describe("gradeAnswers", () => {
  it("grades a correct multiple-choice answer", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "q1", answer: "Cover 2" }],
    );
    expect(res.correctCount).toBe(1);
    expect(res.supportedCount).toBe(1);
    expect(res.score).toBe(1);
    expect(res.graded).toEqual([
      { questionId: "q1", answer: "Cover 2", correct: true },
    ]);
  });

  it("grades an incorrect answer as correct:false but still supported", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "q1", answer: "wrong" }],
    );
    expect(res.correctCount).toBe(0);
    expect(res.supportedCount).toBe(1);
    expect(res.score).toBe(0);
    expect(res.graded[0].correct).toBe(false);
  });

  it("excludes unsupported types from grading and the denominator", () => {
    const res = gradeAnswers(
      [
        q("q1", "Cover 2"),
        q("q2", "n/a", "tap_field"),
      ],
      [
        { questionId: "q1", answer: "Cover 2" },
        { questionId: "q2", answer: "Cover 2" },
      ],
    );
    // q2 is unsupported: not counted, but still present in graded as correct:false
    expect(res.supportedCount).toBe(1);
    expect(res.correctCount).toBe(1);
    expect(res.score).toBe(1);
    expect(res.graded).toEqual([
      { questionId: "q1", answer: "Cover 2", correct: true },
      { questionId: "q2", answer: "Cover 2", correct: false },
    ]);
  });

  it("returns a zeroed result for empty input", () => {
    expect(gradeAnswers([], [])).toEqual({
      graded: [],
      correctCount: 0,
      supportedCount: 0,
      score: 0,
    });
  });

  it("treats an unknown questionId as unsupported (not counted)", () => {
    const res = gradeAnswers(
      [q("q1", "Cover 2")],
      [{ questionId: "ghost", answer: "Cover 2" }],
    );
    expect(res.supportedCount).toBe(0);
    expect(res.score).toBe(0);
    expect(res.graded).toEqual([
      { questionId: "ghost", answer: "Cover 2", correct: false },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/quiz-grading.test.ts`
Expected: FAIL — `Cannot find module '@/lib/quiz-grading'` (module not created yet).

- [ ] **Step 3: Write the module**

Create `src/lib/quiz-grading.ts`:

```ts
export interface GradingQuestion {
  id: string;
  questionType: string;
  options: { text: string; correct: boolean }[] | null;
}

export interface SubmittedAnswer {
  questionId: string;
  answer: string;
}

export interface GradedAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface GradeResult {
  graded: GradedAnswer[];
  correctCount: number;
  supportedCount: number;
  score: number;
}

const SUPPORTED_TYPES = new Set(["multiple_choice"]);

export function isSupportedType(questionType: string): boolean {
  return SUPPORTED_TYPES.has(questionType);
}

export function matchMultipleChoice(
  options: { text: string; correct: boolean }[] | null,
  answer: string,
): { correct: boolean; correctText: string | null } {
  const opts = options ?? [];
  const correct = opts.some((o) => o.correct && o.text === answer);
  const correctText = opts.find((o) => o.correct)?.text ?? null;
  return { correct, correctText };
}

export function gradeAnswers(
  questions: GradingQuestion[],
  submitted: SubmittedAnswer[],
): GradeResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const graded: GradedAnswer[] = [];
  let correctCount = 0;
  let supportedCount = 0;

  for (const { questionId, answer } of submitted) {
    const question = byId.get(questionId);
    if (!question || !isSupportedType(question.questionType)) {
      graded.push({ questionId, answer, correct: false });
      continue;
    }
    const { correct } = matchMultipleChoice(question.options, answer);
    supportedCount += 1;
    if (correct) correctCount += 1;
    graded.push({ questionId, answer, correct });
  }

  const score = supportedCount > 0 ? correctCount / supportedCount : 0;
  return { graded, correctCount, supportedCount, score };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/quiz-grading.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Full quartet + commit**

```bash
npm run test:run   # all green, +7 tests (190 total)
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/quiz-grading.ts tests/lib/quiz-grading.test.ts
git commit -m "feat: add pure quiz-grading module (server-truth MC grading)"
```

---

### Task 2: `getPlayerQuiz` — answer-key-stripped read for players

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts` (add `getPlayerQuiz` after `getQuiz`, ~line 41)
- Test: `tests/lib/actions/quiz-actions.test.ts` (add a `getPlayerQuiz` describe block)

**Interfaces:**
- Consumes: `requireOrgAccess(orgId)` from `@/lib/authz` (member-level, same authz `getQuiz` uses at `quiz-actions.ts:39`).
- Produces:
  ```ts
  getPlayerQuiz(id: string): Promise<PlayerQuiz | null>
  type PlayerQuiz = {
    id: string;
    name: string;
    questions: {
      id: string;
      questionType: QuestionType;
      questionText: string;
      options: { text: string }[] | null;   // answer key stripped: no `correct`
      play: { name: string; formation: string } | null;
    }[];
  };
  ```
  Task 4's player quiz page switches to this; `correctAnswer`/`correctZone` are omitted entirely.

**Design notes:**
- Same query + authz as `getQuiz` (fetch by id, `requireOrgAccess(quiz.orgId)`, return `null` when missing). Then map each question, dropping `options[].correct`, `correctAnswer`, and `correctZone`. `options` is Prisma `Json?`; cast it to `{ text: string; correct: boolean }[] | null` before mapping to `{ text }`.
- Coach pages keep `getQuiz` (editing needs the key). **Verified call sites:** `getQuiz` has exactly two callers — `src/app/(player)/quiz/[id]/page.tsx:21` (switches in Task 4) and `src/app/(coach)/quizzes/[id]/page.tsx:22` (unchanged).

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/actions/quiz-actions.test.ts`:
1. Extend the `@/lib/db` mock's top-level `db` object (the outer mock at lines 11–17) with a root-level `quiz.findUnique` so `getPlayerQuiz` (which uses `db`, not the tx) can be driven — change `quiz: { update: vi.fn(), delete: vi.fn() }` to `quiz: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() }`.
2. Add `requireOrgAccess: vi.fn()` to the `@/lib/authz` mock (lines 19–22).
3. Add to the **existing top import block** (do not add imports mid-file — `import/first` is a lint error): extend the `@/lib/actions/quiz-actions` import (line 30) to `import { updateQuiz, deleteQuiz, getPlayerQuiz } from "@/lib/actions/quiz-actions";`, and the `@/lib/authz` import (line 32) to `import { requireQuizAccess, requireOrgAccess, AuthzError } from "@/lib/authz";`.

Then append this describe block at the end of the file:

```ts
describe("getPlayerQuiz", () => {
  it("strips the answer key: options carry only text, no correct/correctAnswer/correctZone", async () => {
    vi.mocked(requireOrgAccess).mockResolvedValue({} as never);
    vi.mocked(db.quiz.findUnique).mockResolvedValue({
      id: "q1",
      orgId: "o1",
      name: "Coverages",
      questions: [
        {
          id: "qq1",
          questionType: "multiple_choice",
          questionText: "Which coverage?",
          options: [
            { text: "Cover 2", correct: true },
            { text: "Cover 3", correct: false },
          ],
          correctAnswer: "Cover 2",
          correctZone: { x: 1 },
          play: { name: "Smash", formation: "Trips" },
        },
      ],
    } as never);

    const quiz = await getPlayerQuiz("q1");

    expect(vi.mocked(requireOrgAccess)).toHaveBeenCalledWith("o1");
    const question = quiz!.questions[0];
    expect(question.options).toEqual([{ text: "Cover 2" }, { text: "Cover 3" }]);
    expect(question.options![0]).not.toHaveProperty("correct");
    expect(question).not.toHaveProperty("correctAnswer");
    expect(question).not.toHaveProperty("correctZone");
  });

  it("returns null when the quiz does not exist", async () => {
    vi.mocked(db.quiz.findUnique).mockResolvedValue(null as never);
    expect(await getPlayerQuiz("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/actions/quiz-actions.test.ts`
Expected: FAIL — `getPlayerQuiz` is not exported.

- [ ] **Step 3: Add `getPlayerQuiz`**

In `src/lib/actions/quiz-actions.ts`, insert after `getQuiz` (after line 41):

```ts
export async function getPlayerQuiz(id: string) {
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          play: { select: { name: true, formation: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!quiz) return null;
  await requireOrgAccess(quiz.orgId);

  return {
    id: quiz.id,
    name: quiz.name,
    questions: quiz.questions.map((q) => {
      const options = q.options as
        | { text: string; correct: boolean }[]
        | null;
      return {
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        options: options ? options.map((o) => ({ text: o.text })) : null,
        play: q.play
          ? { name: q.play.name, formation: q.play.formation }
          : null,
      };
    }),
  };
}
```

`requireOrgAccess` is already imported at `quiz-actions.ts:7`. No new imports.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/actions/quiz-actions.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Full quartet + commit**

```bash
npm run test:run   # all green (+2)
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/actions/quiz-actions.ts tests/lib/actions/quiz-actions.test.ts
git commit -m "feat: add getPlayerQuiz (strips answer key for the player quiz page)"
```

---

### Task 3: `checkAnswer` server action (per-question reveal oracle)

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts` (add `checkAnswer`; add imports)
- Test: `tests/lib/actions/quiz-actions.test.ts` (add a `checkAnswer` describe block)

**Interfaces:**
- Consumes: `matchMultipleChoice` from `@/lib/quiz-grading` (Task 1); `requireQuizAccess(quizId)` from `@/lib/authz` (member-level).
- Produces: `checkAnswer(questionId: string, answer: string): Promise<{ correct: boolean; correctText: string | null }>`. Task 4's `MultipleChoice` calls it on selection to drive the reveal.

**Design notes:**
- Resolve the question → its quiz, authorize with `requireQuizAccess(question.quizId)` (member-level; not coach). Unknown question → bare `AuthzError` (mirrors the resolver pattern in `authz.ts`).
- For `multiple_choice`, delegate to `matchMultipleChoice(question.options, answer)`. For any other type, return `{ correct: false, correctText: null }`.
- **Trade-off (flagged in the spec):** this is an answer oracle — a player could probe then answer "correctly." Accepted: quizzes are already freely retakeable and every submitted answer is recorded; this is a team-study app. Rate-limiting is explicitly out of scope for 3b.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/actions/quiz-actions.test.ts`. `checkAnswer` reads `db.quizQuestion.findUnique`, so add `quizQuestion: { findUnique: vi.fn() }` to the `db` object in the outer `@/lib/db` mock (lines 11–17). The `@/lib/authz` mock already has `requireQuizAccess` (line 20). Extend the existing top import of `@/lib/actions/quiz-actions` to also import `checkAnswer` (do not add a mid-file import — `import/first` is a lint error). Append this describe block at the end of the file:

```ts
describe("checkAnswer", () => {
  it("authorizes via the question's quiz, then returns correctness + correctText", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue({
      id: "qq1",
      quizId: "q1",
      questionType: "multiple_choice",
      options: [
        { text: "Cover 2", correct: true },
        { text: "Cover 3", correct: false },
      ],
    } as never);
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);

    const right = await checkAnswer("qq1", "Cover 2");
    expect(mockedRequire).toHaveBeenCalledWith("q1");
    expect(right).toEqual({ correct: true, correctText: "Cover 2" });

    const wrong = await checkAnswer("qq1", "Cover 3");
    expect(wrong).toEqual({ correct: false, correctText: "Cover 2" });
  });

  it("throws AuthzError and never leaks correctness for an unknown question", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue(null as never);
    await expect(checkAnswer("ghost", "x")).rejects.toBeInstanceOf(AuthzError);
    expect(mockedRequire).not.toHaveBeenCalled();
  });

  it("returns a non-correct result for unsupported question types", async () => {
    vi.mocked(db.quizQuestion.findUnique).mockResolvedValue({
      id: "qq2",
      quizId: "q1",
      questionType: "tap_field",
      options: null,
    } as never);
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);

    expect(await checkAnswer("qq2", "x")).toEqual({
      correct: false,
      correctText: null,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/actions/quiz-actions.test.ts`
Expected: FAIL — `checkAnswer` is not exported.

- [ ] **Step 3: Add `checkAnswer` + import**

In `src/lib/actions/quiz-actions.ts`, add to the top imports:

```ts
import { matchMultipleChoice } from "@/lib/quiz-grading";
```

Then add the action (place it near `getPlayerQuiz`):

```ts
export async function checkAnswer(
  questionId: string,
  answer: string,
): Promise<{ correct: boolean; correctText: string | null }> {
  const question = await db.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true, questionType: true, options: true },
  });
  if (!question) throw new AuthzError();
  await requireQuizAccess(question.quizId);

  if (question.questionType !== "multiple_choice") {
    return { correct: false, correctText: null };
  }
  const options = question.options as
    | { text: string; correct: boolean }[]
    | null;
  return matchMultipleChoice(options, answer);
}
```

`requireQuizAccess` and `AuthzError` are already imported at `quiz-actions.ts:7`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/actions/quiz-actions.test.ts`
Expected: PASS (+3).

- [ ] **Step 5: Full quartet + commit**

```bash
npm run test:run   # all green (+3)
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/actions/quiz-actions.ts tests/lib/actions/quiz-actions.test.ts
git commit -m "feat: add checkAnswer server action for per-question reveal"
```

---

### Task 4: Player quiz uses server reveal + stripped key (MultipleChoice, QuizFlow, page)

**Files:**
- Modify: `src/components/quiz/multiple-choice.tsx` (server-driven reveal)
- Modify: `src/components/quiz/quiz-flow.tsx` (options type, pass `questionId`, remount per question)
- Modify: `src/app/(player)/quiz/[id]/page.tsx` (switch `getQuiz` → `getPlayerQuiz`)

**Interfaces:**
- Consumes: `checkAnswer(questionId, answer)` (Task 3); `getPlayerQuiz(id)` (Task 2).
- Produces: `MultipleChoice({ questionId, questionText, options: { text }[], onAnswer: (correct, answer) => void })` — self-manages the reveal via `checkAnswer`; no `showResult`/`correct` props.

**Design notes:**
- Answer key never reaches the client now: `getPlayerQuiz` returns `options: { text }[]`, `MultipleChoice` asks the server on selection. This task keeps `submitQuizAttempt`'s existing `{questionId, answer, correct}` submission (the `correct` value now originates from the server `checkAnswer`); Task 5 removes it from the wire.
- **Lint:** all `setState` calls happen inside the click handler (`handleSelect`), never in an effect. Per-question state reset is via `key={question.id}` remount (no effect). Expected lint: **0**.
- No component tests exist for these client files today (repo has none for `quiz-flow`/`multiple-choice`); coverage is the Task 2/3 action tests plus close-out manual QA. Do **not** add brittle framer-less RTL tests here.

- [ ] **Step 1: Rewrite `src/components/quiz/multiple-choice.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkAnswer } from "@/lib/actions/quiz-actions";

interface MultipleChoiceProps {
  questionId: string;
  questionText: string;
  options: { text: string }[];
  onAnswer: (correct: boolean, answer: string) => void;
}

const LABELS = ["A", "B", "C", "D"] as const;

export function MultipleChoice({
  questionId,
  questionText,
  options,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    correctText: string | null;
  } | null>(null);

  async function handleSelect(index: number) {
    if (checking || result !== null) return;
    setSelected(index);
    setChecking(true);
    try {
      const res = await checkAnswer(questionId, options[index].text);
      setResult(res);
      onAnswer(res.correct, options[index].text);
    } finally {
      setChecking(false);
    }
  }

  const locked = checking || result !== null;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-foreground">{questionText}</p>

      <div className="space-y-2">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrectOption = result?.correctText === option.text;

          let variant = "border-border bg-secondary hover:border-border";
          if (result && isSelected && result.correct) {
            variant = "border-success bg-success/30";
          } else if (result && isSelected && !result.correct) {
            variant = "border-destructive bg-destructive/30";
          } else if (result && isCorrectOption) {
            variant = "border-success/50 bg-success/20";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => handleSelect(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                variant,
                locked && "cursor-default",
                checking && isSelected && "opacity-70",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-foreground/85">
                {LABELS[i]}
              </span>
              <span className="flex-1 text-sm text-foreground">
                {option.text}
              </span>
              {result && isSelected && result.correct && (
                <Check className="h-4 w-4 text-success" />
              )}
              {result && isSelected && !result.correct && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/quiz/quiz-flow.tsx` question typing + MultipleChoice usage**

In the `QuizQuestion` interface (lines 11–18), change `options` and drop `correctAnswer`:

```ts
interface QuizQuestion {
  id: string;
  questionType: string;
  questionText: string;
  options: { text: string }[] | null;
  play: { name: string; formation: string } | null;
}
```

Change the options cast (line 145–148) from `{ text: string; correct: boolean }[]` to:

```ts
  const options = (question?.options ?? []) as { text: string }[];
```

Replace the `<MultipleChoice>` render (lines 169–176) — remount per question, pass `questionId`, drop `showResult`:

```tsx
      {question && (
        <MultipleChoice
          key={question.id}
          questionId={question.id}
          questionText={question.questionText}
          options={options}
          onAnswer={handleAnswer}
        />
      )}
```

`handleAnswer(correct, answer)` and the rest of the flow are unchanged in this task (the finished screen still computes the client score via `countSupportedQuestions`/`computeScorePercent`; Task 5 switches it to server truth).

- [ ] **Step 3: Switch the player page to `getPlayerQuiz`**

Rewrite `src/app/(player)/quiz/[id]/page.tsx` — swap the import and call, and pass the already-shaped questions straight through:

```tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayerQuiz } from "@/lib/actions/quiz-actions";
import { AuthzError } from "@/lib/authz";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let quiz;
  try {
    quiz = await getPlayerQuiz(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!quiz) notFound();

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">This quiz has no questions yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Your coach is still building this quiz.
        </p>
      </div>
    );
  }

  return (
    <div>
      <QuizFlow quizId={quiz.id} quizName={quiz.name} questions={quiz.questions} />
    </div>
  );
}
```

`quiz.questions` from `getPlayerQuiz` is structurally the `QuizQuestion[]` QuizFlow expects (`questionType` is the `QuestionType` enum, assignable to `string`; `options` is `{ text }[] | null`).

- [ ] **Step 4: Full quartet (no new tests this task)**

```bash
npm run test:run   # all green (unchanged count)
npx tsc --noEmit   # clean — the answer key no longer flows to the client
npm run lint       # 0 errors
npm run build      # succeeds
```

If `tsc` flags an unused `countSupportedQuestions`/`computeScorePercent` import, leave it — Step 5 of this task does not remove them; they are removed in Task 5. (They are still used by the finished screen here.)

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/multiple-choice.tsx src/components/quiz/quiz-flow.tsx "src/app/(player)/quiz/[id]/page.tsx"
git commit -m "feat: player quiz reveals via server checkAnswer; page uses getPlayerQuiz (key never shipped)"
```

---

### Task 5: Server-side grading in `submitQuizAttempt` + input narrowing + finish reads server truth

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts` (`submitQuizAttempt` body + return; imports)
- Modify: `src/components/quiz/multiple-choice.tsx` (`onAnswer` drops `correct`)
- Modify: `src/components/quiz/quiz-flow.tsx` (`Answer` drops `correct`; finish screen reads server values)
- Modify: `tests/lib/actions/quiz-actions.test.ts` (update the two `submitQuizAttempt` tests)

**Interfaces:**
- Consumes: `gradeAnswers` (Task 1); `computeScorePercent` from `@/lib/quiz-score:7`.
- Produces: `submitQuizAttempt({ quizId, answers: { questionId, answer }[] }): Promise<{ xpEarned; newBadges: RewardBadge[]; scorePercent; correctCount; supportedCount }>`. **The client `correct` flag is removed from the input** — grading is server-side, tampered inputs are impossible by type. (Task 8 adds `streak` to this return.)
- Produces: `MultipleChoice({ ..., onAnswer: (answer: string) => void })`.

**Design notes:**
- Grade inside the existing `db.$transaction`, against tx-fetched questions. Fetch the quiz **before** creating the attempt (need the questions to grade). Stored `attempt.answers = grade.graded` (`{questionId, answer, correct}` — trustworthy now) and `attempt.score = grade.score` (0..1 fraction, consistent with historical rows). Per-play `recordQuizScore` uses the graded results, counting only supported (`multiple_choice`) answers.
- Snapshot selects and `playerStatsFromProgress` are **unchanged in this task** (`{views, masteryLevel, quizScores}`; hardcoded streak) — Task 8 adds `lastViewedAt` + real streak.

- [ ] **Step 1: Update imports in `src/lib/actions/quiz-actions.ts`**

Change the Task 3 grading import to include `gradeAnswers`, and add the score-percent helper:

```ts
import { gradeAnswers, matchMultipleChoice } from "@/lib/quiz-grading";
import { computeScorePercent } from "@/lib/quiz-score";
```

- [ ] **Step 2: Replace `submitQuizAttempt` (lines 112–178)**

```ts
export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string }[];
}): Promise<{
  xpEarned: number;
  newBadges: RewardBadge[];
  scorePercent: number;
  correctCount: number;
  supportedCount: number;
}> {
  const { membership } = await requireQuizAccess(data.quizId);
  const userId = membership.userId;

  return db.$transaction(async (tx) => {
    // Snapshot stats BEFORE recording the attempt.
    const beforeRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true },
    });
    const beforeStats = playerStatsFromProgress(beforeRows);

    // Fetch the quiz's questions and grade server-side.
    const quiz = await tx.quiz.findUnique({
      where: { id: data.quizId },
      include: { questions: true },
    });
    const gradingQuestions =
      quiz?.questions.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        options: q.options as { text: string; correct: boolean }[] | null,
      })) ?? [];
    const grade = gradeAnswers(gradingQuestions, data.answers);

    await tx.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId,
        score: grade.score,
        answers: grade.graded,
        completedAt: new Date(),
      },
    });

    // Update progress per play, from the graded (server-truth) results.
    if (quiz) {
      const playScores = new Map<string, { correct: number; total: number }>();
      for (const g of grade.graded) {
        const question = quiz.questions.find((q) => q.id === g.questionId);
        if (!question || question.questionType !== "multiple_choice") continue;
        const existing = playScores.get(question.playId) ?? {
          correct: 0,
          total: 0,
        };
        existing.total += 1;
        if (g.correct) existing.correct += 1;
        playScores.set(question.playId, existing);
      }
      for (const [playId, counts] of playScores) {
        const playScore = counts.total > 0 ? counts.correct / counts.total : 0;
        await recordQuizScore(playId, playScore, tx);
      }
    }

    // Snapshot stats AFTER, then return the reward delta + server score.
    const afterRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true },
    });
    const afterStats = playerStatsFromProgress(afterRows);

    return {
      ...computeQuizReward(beforeStats, afterStats),
      scorePercent: computeScorePercent(grade.correctCount, grade.supportedCount),
      correctCount: grade.correctCount,
      supportedCount: grade.supportedCount,
    };
  });
}
```

- [ ] **Step 3: `MultipleChoice.onAnswer` drops `correct`**

In `src/components/quiz/multiple-choice.tsx`, change the prop type and the call in `handleSelect`:

```ts
  onAnswer: (answer: string) => void;
```
```ts
      const res = await checkAnswer(questionId, options[index].text);
      setResult(res);
      onAnswer(options[index].text);
```

(The `res.correct` value is still used locally for the reveal via `setResult(res)`; it is simply no longer bubbled up.)

- [ ] **Step 4: `QuizFlow` — narrow `Answer`, read server score on finish**

In `src/components/quiz/quiz-flow.tsx`:

1. Remove the now-unused import (line 9): delete `import { countSupportedQuestions, computeScorePercent } from "@/lib/quiz-score";`.
2. Narrow `Answer` (lines 26–30):
```ts
interface Answer {
  questionId: string;
  answer: string;
}
```
3. Extend the `reward` state type (lines 39–42):
```ts
  const [reward, setReward] = useState<{
    xpEarned: number;
    newBadges: { id: string; name: string; description: string; icon: string }[];
    scorePercent: number;
    correctCount: number;
    supportedCount: number;
  } | null>(null);
```
4. `handleAnswer` (lines 49–55) drops `correct`:
```ts
  function handleAnswer(answer: string) {
    setAnswers((prev) => [...prev, { questionId: question.id, answer }]);
    setShowResult(true);
  }
```
5. The submit call (line 67) is unchanged in shape but now type-checks against the narrowed input:
```ts
        const result = await submitQuizAttempt({ quizId, answers });
```
6. Replace the finished-screen score computation (lines 80–92) to read server truth:
```tsx
  if (finished) {
    const scorePercent = reward?.scorePercent ?? 0;
    const correctCount = reward?.correctCount ?? 0;
    const supportedCount = reward?.supportedCount ?? 0;

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-success" />
        <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
        <p className="text-4xl font-bold text-foreground">{scorePercent}%</p>
        <p className="text-sm text-muted-foreground">
          {correctCount} of {supportedCount} correct
        </p>
```
(The rest of the finished branch — the XP chip, badges, and Back link — is unchanged in this task; Task 9 replaces the whole branch with the celebration.)

- [ ] **Step 5: Update the two `submitQuizAttempt` tests in `tests/lib/actions/quiz-actions.test.ts`**

Update the "runs snapshot/attempt/reward inside db.$transaction" expectation to the new return shape:
```ts
    expect(result).toEqual({
      xpEarned: 0,
      newBadges: [],
      scorePercent: 0,
      correctCount: 0,
      supportedCount: 0,
    });
```

Update the "passes the tx client (not db) into recordQuizScore" test: the mocked question needs a type + options so grading yields a correct answer, and the submitted answer drops `correct`:
```ts
    tx.quiz.findUnique.mockResolvedValueOnce({
      id: "q1",
      questions: [
        {
          id: "qq1",
          playId: "p1",
          questionType: "multiple_choice",
          options: [{ text: "a", correct: true }],
        },
      ],
    });

    await submitQuizAttempt({
      quizId: "q1",
      answers: [{ questionId: "qq1", answer: "a" }],
    });

    expect(vi.mocked(recordQuizScore)).toHaveBeenCalledWith("p1", 1, tx);
```

- [ ] **Step 6: Full quartet + commit**

```bash
npm run test:run   # all green — grading now server-side; the two tests updated
npx tsc --noEmit   # clean — `correct` is gone from the submit signature
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/actions/quiz-actions.ts src/components/quiz/multiple-choice.tsx src/components/quiz/quiz-flow.tsx tests/lib/actions/quiz-actions.test.ts
git commit -m "feat: grade quizzes server-side in the tx; drop client correct from submit; finish shows server score"
```

---

### Task 6: Migration `nextReviewAt_nullable` + notifications null-guard

**Files:**
- Modify: `prisma/schema.prisma` (`PlayerProgress.nextReviewAt`, line 304)
- Create: `prisma/migrations/<timestamp>_nextReviewAt_nullable/migration.sql` (generated)
- Modify: `src/lib/notifications.ts` (`PlayerProgress.nextReviewAt` type + due filter)
- Modify: `tests/lib/notifications.test.ts` (add a null-schedule case)

**Interfaces:**
- Produces: `PlayerProgress.nextReviewAt: DateTime?` (null = nothing scheduled). `getDueForReview`'s `lte: now` filter excludes nulls; `getPlayerProgress`'s `orderBy nextReviewAt asc` sorts nulls **last** in Postgres (unscheduled plays trail scheduled ones — correct).

**Discovery (not in the spec — must be handled here):** `getPlayerProgress` now returns `nextReviewAt: Date | null`, and `src/app/(player)/layout.tsx:49` passes those rows straight into `generatePlayerNotifications`, whose local `PlayerProgress` interface (`notifications.ts:22`) declares `nextReviewAt: Date`. `Date | null` is not assignable to `Date` → **`tsc` breaks at the layout call site** unless `notifications.ts` is widened. Widening it and null-guarding the due filter also correctly implements the spec's rule that never-quizzed (null) plays are never "due."

- [ ] **Step 1: Make `nextReviewAt` nullable in `prisma/schema.prisma`**

Change line 304 from:
```prisma
  nextReviewAt  DateTime     @default(now())
```
to:
```prisma
  nextReviewAt  DateTime?
```

- [ ] **Step 2: Bring up the dev DB and run the migration (migrate → generate → tsc order)**

```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate dev --name nextReviewAt_nullable
npx prisma generate
```
Expected: a new `prisma/migrations/<timestamp>_nextReviewAt_nullable/migration.sql`; `generate` succeeds and the Prisma client now types `nextReviewAt` as `Date | null`.

- [ ] **Step 3: Confirm the migration SQL is exactly the ALTER (no data loss)**

Open the generated `migration.sql`. It must be **only**:
```sql
-- AlterTable
ALTER TABLE "PlayerProgress" ALTER COLUMN "nextReviewAt" DROP NOT NULL,
ALTER COLUMN "nextReviewAt" DROP DEFAULT;
```
No `DROP COLUMN`, no data rewrite. Existing rows keep their values (grandfathered).

- [ ] **Step 4: Widen `notifications.ts` and null-guard the due filter**

In `src/lib/notifications.ts`, change the interface field (line 22):
```ts
  nextReviewAt: Date | null;
```
and the due-for-review filter (lines 97–99):
```ts
  const dueForReview = progress.filter(
    (p) => p.nextReviewAt != null && new Date(p.nextReviewAt) <= now && p.views > 0,
  );
```

- [ ] **Step 5: Add the null-schedule test to `tests/lib/notifications.test.ts`**

Inside the `describe("generatePlayerNotifications", ...)` block, add:
```ts
  it("does not flag a never-quizzed play (null nextReviewAt) as due", () => {
    const unscheduled: PlayerProgress[] = [
      { playId: "c", masteryLevel: "learning", nextReviewAt: null, views: 3 },
    ];
    const ids = generatePlayerNotifications(unscheduled, []).map((n) => n.id);
    expect(ids).not.toContain("player:due-review");
  });
```

- [ ] **Step 6: Verify (migrate → generate → tsc order already done) + commit**

```bash
npx tsc --noEmit   # clean — layout.tsx:49 now type-checks
npm run test:run   # all green (+1)
npm run lint       # 0 errors
npm run build      # succeeds
git add prisma/schema.prisma prisma/migrations src/lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat: nextReviewAt nullable (views never schedule review); null-guard player due filter"
```

---

### Task 7: Mastery redesign — `recordPlayView` drops SM-2, `recordQuizScore` stamps `lastViewedAt`

**Files:**
- Modify: `src/lib/actions/progress-actions.ts` (`recordPlayView` lines 13–54; `recordQuizScore` lines 56–102)
- Modify: `tests/lib/actions/progress-actions.test.ts` (negative SM-2 assertions; `lastViewedAt` assertions)

**Interfaces:**
- Produces: `recordPlayView(playId)` — upserts **only** `views` (+1) and `lastViewedAt: now`; no SM-2 fields. On create the row's `easeFactor`/`intervalDays`/`masteryLevel` stay at schema defaults and `nextReviewAt` stays null.
- Produces: `recordQuizScore(playId, score, client?)` — unchanged SM-2 behavior, **plus** `lastViewedAt: now` on both create and update. Remains the sole SM-2 writer.

**Design notes:** views build familiarity (they still create/update the row so install-completion, inactivity, and streaks read `views`/`lastViewedAt`); mastery is earned only by quizzing. Existing inflated rows are grandfathered (no backfill). The SM-2 imports (`calculateNextReview`, `qualityFromScore`, `masteryFromInterval`) stay — `recordQuizScore` still uses all three; `recordPlayView` no longer references them.

- [ ] **Step 1: Update the two `recordPlayView` assertions + add SM-2 negatives (write the failing test first)**

In `tests/lib/actions/progress-actions.test.ts`, inside the existing `recordPlayView` "authorizes..." test, after the `upsertArg.where.userId_playId` assertion, append:
```ts
    expect(upsertArg).toMatchObject({
      create: { views: 1, lastViewedAt: expect.any(Date) },
      update: { views: { increment: 1 }, lastViewedAt: expect.any(Date) },
    });
    for (const field of ["easeFactor", "intervalDays", "nextReviewAt", "masteryLevel"]) {
      expect(upsertArg.create).not.toHaveProperty(field);
      expect(upsertArg.update).not.toHaveProperty(field);
    }
```
Widen the local type annotation on `upsertArg` (the existing cast at the `.mock.calls[0][0] as {...}`) to also expose `create`/`update`:
```ts
    const upsertArg = vi.mocked(db.playerProgress.upsert).mock.calls[0][0] as {
      where: { userId_playId: { userId: string; playId: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
```

In the `recordQuizScore` "writes through the default db client" test, after the `upsert` call-count assertion, append:
```ts
    const qCall = vi.mocked(db.playerProgress.upsert).mock.calls[0][0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(qCall.create).toHaveProperty("lastViewedAt");
    expect(qCall.update).toHaveProperty("lastViewedAt");
    // still the sole SM-2 writer:
    expect(qCall.create).toHaveProperty("nextReviewAt");
    expect(qCall.update).toHaveProperty("masteryLevel");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- tests/lib/actions/progress-actions.test.ts`
Expected: FAIL — current `recordPlayView` writes `easeFactor`/`nextReviewAt`/etc (negative assertions fail); current `recordQuizScore` has no `lastViewedAt`.

- [ ] **Step 3: Rewrite `recordPlayView` (lines 13–54)**

```ts
export async function recordPlayView(playId: string) {
  const { membership } = await requirePlayAccess(playId);
  const userId = membership.userId;
  const now = new Date();

  return db.playerProgress.upsert({
    where: { userId_playId: { userId, playId } },
    create: {
      userId,
      playId,
      views: 1,
      lastViewedAt: now,
    },
    update: {
      views: { increment: 1 },
      lastViewedAt: now,
    },
  });
}
```

- [ ] **Step 4: Add `lastViewedAt` to `recordQuizScore` (both branches)**

In `recordQuizScore`'s `upsert`, add `lastViewedAt: now,` to `create` (after `quizScores: [score],`) and to `update` (after `quizScores,`). All other SM-2 fields stay:
```ts
    create: {
      userId,
      playId,
      quizScores: [score],
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
    update: {
      quizScores,
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:run -- tests/lib/actions/progress-actions.test.ts`
Expected: PASS.

- [ ] **Step 6: Full quartet + commit**

```bash
npm run test:run   # all green
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/actions/progress-actions.ts tests/lib/actions/progress-actions.test.ts
git commit -m "feat: views stop driving SM-2; quizzes stamp lastViewedAt (mastery is quiz-earned)"
```

---

### Task 8: Streak enters the reward — `playerStatsFromProgress` + snapshots + `streak` in the return

**Files:**
- Modify: `src/lib/gamification.ts` (`playerStatsFromProgress` lines 136–150; add `computeStreak` import)
- Modify: `src/lib/actions/quiz-actions.ts` (snapshot selects add `lastViewedAt`; pass a shared `now`; return `streak`)
- Modify: `tests/lib/gamification.test.ts` (rows gain `lastViewedAt`; add a streak-computation test)
- Modify: `tests/lib/actions/quiz-actions.test.ts` (result shape adds `streak`; add an extension test)

**Interfaces:**
- Produces: `playerStatsFromProgress(rows: { views; masteryLevel; quizScores; lastViewedAt: Date | null }[], now?: Date): PlayerStats` — `currentStreak`/`longestStreak`/`daysActive` are computed via `computeStreak(rows, now)` (no injected-streak param; `now` defaults to `new Date()` and is passed explicitly by `submitQuizAttempt` for a single consistent reference).
- Produces: `submitQuizAttempt(...)` return adds `streak: { current: number; extended: boolean }` where `extended = afterStats.currentStreak > beforeStats.currentStreak`.

**Design notes:** `recordQuizScore` (Task 7) now stamps `lastViewedAt: now`, so the first study of a day makes the after-snapshot streak = before + 1 → streak XP (`currentStreak * 25`, `gamification.ts:103`) and the three streak badges (`three-day-streak`, `seven-day-streak`, `week-warrior`) become reachable exactly at quiz completion. Home/Progress pages compute their stats inline via `computeStreak` and are **not** affected by this signature change (verified: `playerStatsFromProgress` has a single production caller, `submitQuizAttempt`).

- [ ] **Step 1: Rewrite `playerStatsFromProgress` (write the failing gamification test first)**

In `tests/lib/gamification.test.ts`, add `lastViewedAt` to every row literal (the rows type now requires it) and add a streak test. Change the two rows in "sums views…" to include `lastViewedAt: new Date()`, and the rows in the `hasPerfectQuiz` test to include `lastViewedAt: null`. Then add:
```ts
  it("computes currentStreak and daysActive from lastViewedAt via computeStreak", () => {
    const now = new Date("2026-07-06T12:00:00Z");
    const stats = playerStatsFromProgress(
      [
        {
          views: 1,
          masteryLevel: "learning",
          quizScores: [],
          lastViewedAt: new Date("2026-07-06T09:00:00Z"),
        },
        {
          views: 1,
          masteryLevel: "learning",
          quizScores: [],
          lastViewedAt: new Date("2026-07-05T09:00:00Z"),
        },
      ],
      now,
    );
    expect(stats.currentStreak).toBe(2);
    expect(stats.daysActive).toBe(2);
  });
```
Keep the existing "returns zeroed …" test (empty rows → `computeStreak` returns all zeros).

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- tests/lib/gamification.test.ts`
Expected: FAIL — the streak test expects `2`/`2`, current code hardcodes `currentStreak: 0`/`daysActive: 0`.

- [ ] **Step 3: Implement `playerStatsFromProgress`**

In `src/lib/gamification.ts`, add the import at the top:
```ts
import { computeStreak } from "@/lib/streak";
```
Replace `playerStatsFromProgress` (lines 136–150):
```ts
export function playerStatsFromProgress(
  rows: {
    views: number;
    masteryLevel: string;
    quizScores: number[];
    lastViewedAt: Date | null;
  }[],
  now: Date = new Date(),
): PlayerStats {
  const { current, longest, daysActive } = computeStreak(rows, now);
  return {
    totalViews: rows.reduce((sum, r) => sum + r.views, 0),
    totalQuizzes: rows.reduce((sum, r) => sum + r.quizScores.length, 0),
    averageScore: 0,
    hasPerfectQuiz: rows.some((r) => r.quizScores.some((s) => s >= 1)),
    currentStreak: current,
    longestStreak: longest,
    playsMastered: rows.filter((r) => r.masteryLevel === "mastered").length,
    totalPlays: rows.length,
    daysActive,
  };
}
```

- [ ] **Step 4: Thread `lastViewedAt` + shared `now` + `streak` through `submitQuizAttempt`**

In `src/lib/actions/quiz-actions.ts`'s `submitQuizAttempt` (from Task 5):
1. Add `lastViewedAt: true` to **both** snapshot `select` objects (before and after).
2. Capture one `now` at the top of the `db.$transaction` callback and pass it to both stat computations:
```ts
    const now = new Date();
    // ...
    const beforeStats = playerStatsFromProgress(beforeRows, now);
    // ...
    const afterStats = playerStatsFromProgress(afterRows, now);
```
3. Extend the return type and value:
```ts
  }): Promise<{
    xpEarned: number;
    newBadges: RewardBadge[];
    scorePercent: number;
    correctCount: number;
    supportedCount: number;
    streak: { current: number; extended: boolean };
  }> {
```
```ts
    return {
      ...computeQuizReward(beforeStats, afterStats),
      scorePercent: computeScorePercent(grade.correctCount, grade.supportedCount),
      correctCount: grade.correctCount,
      supportedCount: grade.supportedCount,
      streak: {
        current: afterStats.currentStreak,
        extended: afterStats.currentStreak > beforeStats.currentStreak,
      },
    };
```

- [ ] **Step 5: Update `quiz-actions.test.ts` for the new return + add an extension test**

Update the "runs snapshot/attempt/reward inside db.$transaction" expectation:
```ts
    expect(result).toEqual({
      xpEarned: 0,
      newBadges: [],
      scorePercent: 0,
      correctCount: 0,
      supportedCount: 0,
      streak: { current: 0, extended: false },
    });
```
Add a new test inside the `submitQuizAttempt` describe:
```ts
  it("reports streak.extended when the after-snapshot streak exceeds before", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);
    const tx = (db as unknown as {
      __tx: { playerProgress: { findMany: ReturnType<typeof vi.fn> } };
    }).__tx;
    tx.playerProgress.findMany
      .mockResolvedValueOnce([]) // before: no activity → streak 0
      .mockResolvedValueOnce([
        {
          views: 0,
          masteryLevel: "learning",
          quizScores: [1],
          lastViewedAt: new Date(),
        },
      ]); // after: studied today → streak 1

    const result = await submitQuizAttempt({ quizId: "q1", answers: [] });
    expect(result.streak).toEqual({ current: 1, extended: true });
  });
```

- [ ] **Step 6: Run tests, then full quartet + commit**

```bash
npm run test:run -- tests/lib/gamification.test.ts tests/lib/actions/quiz-actions.test.ts   # green
npm run test:run   # all green
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
git add src/lib/gamification.ts src/lib/actions/quiz-actions.ts tests/lib/gamification.test.ts tests/lib/actions/quiz-actions.test.ts
git commit -m "feat: real streak in the quiz reward (playerStatsFromProgress computes it; return exposes streak)"
```

---

### Task 9: Staged celebration on the finish screen

**Files:**
- Modify: `src/components/quiz/quiz-flow.tsx` (extract `interface Reward`; replace the finished branch; add `QuizCelebration` + `ScoreCountUp` sub-components; add imports)

**Interfaces:**
- Consumes: the `submitQuizAttempt` return (Task 8) — `{ xpEarned, newBadges, scorePercent, correctCount, supportedCount, streak }`.
- Produces: `QuizCelebration({ reward: Reward })` — staged framer-motion reveal; `prefers-reduced-motion` collapses to a static layout.

**Design notes (all from the spec §3):** staged order — check-mark pop → score count-up to the **server** `scorePercent` → XP chip → streak flame with day count (only when `streak.extended`) → badge cards, one-by-one. Perfect score (`scorePercent === 100`) shows headline **"Perfect!"** in accent. `prefers-reduced-motion` (via framer-motion `useReducedMotion`) removes offsets/stagger/count animation → the current static layout. **Tokens only:** the XP chip is a solid `bg-accent` fill, so its text uses `text-accent-foreground` (Phase 3a contrast pair); the streak flame uses the existing translucent `bg-accent/20` + `text-accent` idiom (as on `progress/page.tsx:118`). No new dependencies (framer-motion already used across the app). **Lint:** the count-up drives a framer-motion `MotionValue` inside `useEffect` — it never calls React `setState`, so no `set-state-in-effect` violation; expected lint **0**. **Emoji convention:** write the flame emoji as a `\u`-escaped JSX string exactly as `src/app/(player)/progress/page.tsx:119` does (it uses `{"🔥"}`), not a raw glyph, to keep source ASCII-safe on Windows checkouts. (The snippet below shows the glyph only for readability — copy the escape from that file.)

- [ ] **Step 1: Update imports in `src/components/quiz/quiz-flow.tsx`**

```ts
import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
```
(`useState` was already imported; merge `useEffect` into it. Keep the existing `Link`, `Button`, `ArrowRight`, `CheckCircle2`, `MultipleChoice`, `submitQuizAttempt` imports.)

- [ ] **Step 2: Extract `interface Reward` and use it for the `reward` state**

Above the `QuizFlow` component, add:
```ts
interface Reward {
  xpEarned: number;
  newBadges: { id: string; name: string; description: string; icon: string }[];
  scorePercent: number;
  correctCount: number;
  supportedCount: number;
  streak: { current: number; extended: boolean };
}
```
Change the `reward` state annotation (from Task 5/8) to:
```ts
  const [reward, setReward] = useState<Reward | null>(null);
```

- [ ] **Step 3: Replace the finished branch (from Task 5) with a delegate to `QuizCelebration`**

Replace the whole `if (finished) { ... }` block with:
```tsx
  if (finished && reward) {
    return <QuizCelebration reward={reward} />;
  }
```

- [ ] **Step 4: Add `ScoreCountUp` and `QuizCelebration` sub-components (same file, below `QuizFlow`)**

```tsx
function ScoreCountUp({ value, reduced }: { value: number; reduced: boolean }) {
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 1, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value, reduced]);

  return <motion.span>{text}</motion.span>;
}

function QuizCelebration({ reward }: { reward: Reward }) {
  const reduced = useReducedMotion() === true;
  const isPerfect = reward.scorePercent === 100;

  const container = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduced ? 0 : 0.15,
        staggerChildren: reduced ? 0 : 0.35,
      },
    },
  };
  const item = {
    hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.4 },
    },
  };
  const pop = {
    hidden: reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 },
    show: {
      opacity: 1,
      scale: 1,
      transition: reduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 380, damping: 16 },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-5 py-12 text-center"
    >
      <motion.div variants={pop}>
        <CheckCircle2
          className={cn("h-16 w-16", isPerfect ? "text-accent" : "text-success")}
        />
      </motion.div>

      <motion.h2
        variants={item}
        className={cn(
          "text-2xl font-bold",
          isPerfect ? "text-accent" : "text-foreground",
        )}
      >
        {isPerfect ? "Perfect!" : "Quiz Complete!"}
      </motion.h2>

      <motion.p
        variants={item}
        className={cn(
          "text-5xl font-bold",
          isPerfect ? "text-accent" : "text-foreground",
        )}
      >
        <ScoreCountUp value={reward.scorePercent} reduced={reduced} />
      </motion.p>

      <motion.p variants={item} className="text-sm text-muted-foreground">
        {reward.correctCount} of {reward.supportedCount} correct
      </motion.p>

      {reward.xpEarned > 0 && (
        <motion.div
          variants={item}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground"
        >
          +{reward.xpEarned} XP
        </motion.div>
      )}

      {reward.streak.extended && (
        <motion.div
          variants={item}
          className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent"
        >
          <span>{"🔥"}</span>
          <span>{reward.streak.current} day streak!</span>
        </motion.div>
      )}

      {reward.newBadges.length > 0 && (
        <motion.p
          variants={item}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          New badge{reward.newBadges.length !== 1 ? "s" : ""}
        </motion.p>
      )}
      {reward.newBadges.map((badge) => (
        <motion.div
          key={badge.id}
          variants={item}
          className="flex w-full max-w-xs items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-2 text-left"
        >
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </motion.div>
      ))}

      <motion.div variants={item}>
        <Link href="/quiz">
          <Button variant="outline">Back to Quizzes</Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Full quartet (no new automated tests — celebration is verified in close-out manual QA)**

```bash
npm run test:run   # all green (unchanged count)
npx tsc --noEmit   # clean
npm run lint       # 0 errors — count-up uses a MotionValue, not setState-in-effect
npm run build      # succeeds
```

- [ ] **Step 6: Commit**

```bash
git add src/components/quiz/quiz-flow.tsx
git commit -m "feat: staged, streak-aware quiz celebration (reduced-motion safe, tokens only)"
```

---

### Task 10: Close-out — tightened grep gates + full quartet + targeted QA

No code changes (unless a gate flags a miss, which is fixed in the owning task's file, then re-run).

- [ ] **Step 1: Token gates (must be zero outside the documented allowlist)**

Run the Phase 3a gate set, with the **tightened neutral regex** `\b(zinc|slate|gray|neutral)-` (the `\b` avoids the `translate-` false positive that `slate-` would otherwise catch):
```bash
rg -n --glob 'src/app/**' --glob 'src/components/**' 'indigo-|violet-' src/
rg -n --glob 'src/app/**' --glob 'src/components/**' '\bblue-' src/ | rg -v 'print-layout.tsx|play-library.tsx'
rg -n '\b(zinc|slate|gray|neutral)-' src/app src/components | rg -v 'src/components/play/print-layout.tsx|src/components/play/play-library.tsx'
rg -n '(text|bg|border|fill|stroke|ring|from|via|to|divide|outline|ring-offset)-(white|black)' src/app src/components | rg -v 'print-layout.tsx'
rg -n '\[#' src/app src/components | rg -v 'print-layout.tsx'
```
Expected matches ONLY the pre-documented Phase 3a allowlist (`print-layout.tsx` print paper/ink; Google OAuth SVG hex in `login`/`signup`; `bg-black/40..70` scrims; `playTypeBadge` chips in `play-library.tsx`; the `bg-white` QR tile in `invite-code-card.tsx`). **Phase 3b adds no new allowlist entries** — the celebration is token-only (the XP chip is `bg-accent` + `text-accent-foreground`, a Phase 3a token pair; the streak flame reuses `bg-accent/20` + `text-accent`).

- [ ] **Step 2: `rgba(`/`rgb(` gate (includes `src/lib`)**

```bash
rg -n -g '*.ts' -g '*.tsx' 'rgba\(|rgb\(' src/app src/components src/lib | rg -v 'shadow-\[|boxShadow'
```
Expected: **no matches.** Phase 3b introduces no raw color literals; `quiz-flow.tsx` uses framer-motion transforms on opacity/scale/`y` and token utility classes only (no `boxShadow`/`rgba`).

- [ ] **Step 3: Full verification quartet**

```bash
npm run test:run   # all green — 183 baseline + Task 1 (+7) + Task 2 (+2) + Task 3 (+3) + Task 6 (+1) + Task 8 (+2) ≈ 198
npx tsc --noEmit   # clean
npm run lint       # 0 errors (never went up across any task)
npm run build      # succeeds
```

- [ ] **Step 4: Targeted manual QA (dev DB up, dev login)**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev
```
As a player account, verify:
1. **Quiz flow, both themes:** take a quiz — each answer shows the server reveal (chosen option green/red, correct option highlighted); options are disabled during the `checkAnswer` round trip (pending). Confirm in light **and** dark theme.
2. **checkAnswer latency:** on a slow tab, the option row stays disabled with the pending affordance until the server responds, then reveals — no double-submit.
3. **Answer key not shipped:** open devtools → Network/Elements on the quiz page; the initial payload contains no `correct`/`correctAnswer` for options (only `text`).
4. **Celebration stages:** finish a quiz → check pops → score counts up to the **server** percentage → XP chip → (if applicable) streak flame → badges appear one-by-one. A 100% quiz shows **"Perfect!"** in accent.
5. **Reduced motion:** enable OS "reduce motion" → the finish screen renders the final layout statically (no count-up, no stagger), still correct values.
6. **Streak first-vs-second quiz of the day:** first quiz of a calendar day shows the streak flame (streak extended) and streak XP; a second quiz the same day does **not** re-extend (no flame, no extra streak XP).
7. **Player due list:** the home "Due for review" list shows only quizzed plays whose review is due; a freshly-viewed (never-quizzed) play does not appear as due. Links still open the play viewer.
8. **Coach quiz editing unaffected:** as a coach, open a quiz detail page — the question list still loads (coach path uses `getQuiz`, answer key intact for editing).

- [ ] **Step 5: Final close-out commit**

```bash
git add -A
git commit -m "chore: phase-3b engagement close-out — gates green, QA passed" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- §1 Server-side grading + key protection → Task 1 (`gradeAnswers`), Task 2 (`getPlayerQuiz`), Task 3 (`checkAnswer`), Task 4 (player page/components stop trusting the client), Task 5 (`submitQuizAttempt` grades server-side, input narrowed). ✅
- §2 Mastery redesign → Task 6 (`nextReviewAt` nullable + `getDueForReview`/`getPlayerProgress`/notifications semantics), Task 7 (`recordPlayView` drops SM-2, `recordQuizScore` stamps `lastViewedAt`, grandfathering). ✅
- §3 Celebration + streak → Task 8 (streak in the reward math + return), Task 9 (staged celebration, perfect-score, reduced-motion, token pairs). ✅
- Verification contract → every task runs the quartet; Task 10 adds the tightened gates + QA checklist. ✅

**Placeholder scan:** no TBD/TODO/"add error handling"/"similar to Task N" — every code step shows complete code; every test step shows complete test bodies.

**Type consistency (cross-task):**
- `gradeAnswers(GradingQuestion[], SubmittedAnswer[]) → GradeResult{graded,correctCount,supportedCount,score}` (Task 1) — consumed by Task 5.
- `matchMultipleChoice(options, answer) → {correct, correctText}` (Task 1) — consumed by Task 3 (`checkAnswer`) and Task 1's own `gradeAnswers`.
- `submitQuizAttempt` input `{quizId, answers:{questionId,answer}[]}` (Task 5) and return grows `scorePercent/correctCount/supportedCount` (Task 5) then `streak` (Task 8) — `QuizFlow` `Reward` type (Task 9) matches the final return exactly.
- `MultipleChoice.onAnswer`: `(correct, answer)` in Task 4 → `(answer)` in Task 5 (both edits shown in full).
- `playerStatsFromProgress(rows{+lastViewedAt}, now?)` (Task 8) — the rows shape is fed by the Task 8 snapshot selects (`lastViewedAt: true`); `computeStreak(rows, now)` signature matches `src/lib/streak.ts:1`.
- `recordQuizScore(playId, score, client?)` unchanged signature (Task 7 only adds a field to the write) — `submitQuizAttempt` still calls `recordQuizScore(playId, playScore, tx)`.

**Deviations / decisions flagged for the team lead:**
1. **`playerStatsFromProgress` gains a defaulted `now` param** (`(rows, now = new Date())`), not a zero-param signature. The brief said "no optional param"; I read that as "no injected-streak param" (the spec's rejected alternative) and kept `now` so `submitQuizAttempt` can pass **one** captured `now` to both snapshots (consistent day boundary) and tests can pin it. If you truly want zero extra params, drop `now` and let `computeStreak` default internally — but then the before/after snapshots each call `new Date()` independently.
2. **Extra call site the spec didn't flag — `notifications.ts` (Task 6).** Making `nextReviewAt` nullable breaks `tsc` at `src/app/(player)/layout.tsx:49`, where `getPlayerProgress` rows flow into `generatePlayerNotifications` (whose local `PlayerProgress.nextReviewAt` was `Date`). Fixed by widening that interface to `Date | null` and null-guarding the due filter — which also correctly implements "never-quizzed plays are never due" for the notification bell, not just `getDueForReview`.
3. **Task split of the spec's grouping 2.** Grouping "getPlayerQuiz + page switch + checkAnswer + MultipleChoice" is split into Tasks 2/3/4 so each stays green: pure additions (`getPlayerQuiz`, `checkAnswer`) land before the component refactor + page switch that consume them.

---
