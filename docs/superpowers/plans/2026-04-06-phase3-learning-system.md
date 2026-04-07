# PlayForge Phase 3: Learning System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the quiz system, spaced repetition engine, player progress tracking, and the player-facing study experience — the learning side that makes PlayForge more than a static playbook.

**Architecture:** SM-2 spaced repetition algorithm in `src/lib/spaced-repetition/`. Quiz engine with 5 question types. Server actions for quiz CRUD and progress tracking. Player pages: play browser with animated viewer, quiz flow, progress dashboard.

**Tech Stack:** TypeScript, Prisma, Next.js server actions, Vitest, react-konva (for play viewer)

---

## File Map

### New Files

```
src/
├── lib/
│   ├── spaced-repetition/
│   │   └── sm2.ts                     # SM-2 algorithm implementation
│   └── actions/
│       ├── quiz-actions.ts            # Server actions for quiz CRUD
│       ├── progress-actions.ts        # Server actions for player progress
│       └── game-plan-actions.ts       # Server actions for game plan CRUD
├── components/
│   ├── play/
│   │   └── play-viewer.tsx            # Read-only play viewer (for players)
│   └── quiz/
│       ├── quiz-card.tsx              # Quiz summary card
│       ├── quiz-flow.tsx              # Quiz taking flow (question → answer → next)
│       └── multiple-choice.tsx        # Multiple choice question component
├── app/
│   ├── (coach)/
│   │   ├── quizzes/
│   │   │   └── page.tsx              # Coach quiz management page
│   │   └── game-plans/
│   │       └── page.tsx              # Game plan management page
│   └── (player)/
│       ├── plays/
│       │   ├── page.tsx              # Player play browser
│       │   └── [id]/
│       │       └── page.tsx          # Play detail with viewer
│       ├── quiz/
│       │   ├── page.tsx              # Available quizzes list
│       │   └── [id]/
│       │       └── page.tsx          # Take quiz flow
│       └── progress/
│           └── page.tsx              # Player progress dashboard
tests/
└── lib/
    └── spaced-repetition/
        └── sm2.test.ts               # SM-2 algorithm tests
```

---

### Task 1: SM-2 Spaced Repetition Algorithm

**Files:**
- Create: `src/lib/spaced-repetition/sm2.ts`
- Test: `tests/lib/spaced-repetition/sm2.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/spaced-repetition/sm2.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateNextReview, qualityFromScore, masteryFromInterval } from "@/lib/spaced-repetition/sm2";

describe("qualityFromScore", () => {
  it("maps 0-59% to quality 0-2", () => {
    expect(qualityFromScore(0)).toBe(0);
    expect(qualityFromScore(0.3)).toBe(1);
    expect(qualityFromScore(0.59)).toBe(2);
  });

  it("maps 60-79% to quality 3", () => {
    expect(qualityFromScore(0.6)).toBe(3);
    expect(qualityFromScore(0.79)).toBe(3);
  });

  it("maps 80-94% to quality 4", () => {
    expect(qualityFromScore(0.8)).toBe(4);
    expect(qualityFromScore(0.94)).toBe(4);
  });

  it("maps 95-100% to quality 5", () => {
    expect(qualityFromScore(0.95)).toBe(5);
    expect(qualityFromScore(1.0)).toBe(5);
  });
});

describe("calculateNextReview", () => {
  it("returns 1-day interval on first review", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 0, repetition: 0 }, 4);
    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(1);
  });

  it("returns 3-day interval on second review", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 1, repetition: 1 }, 4);
    expect(result.intervalDays).toBe(3);
    expect(result.repetition).toBe(2);
  });

  it("multiplies interval by ease factor on subsequent reviews", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 3, repetition: 2 }, 4);
    expect(result.intervalDays).toBeCloseTo(7.5);
  });

  it("resets to 1 day on quality < 3", () => {
    const result = calculateNextReview({ easeFactor: 2.5, intervalDays: 10, repetition: 5 }, 2);
    expect(result.intervalDays).toBe(1);
    expect(result.repetition).toBe(0);
  });

  it("never lets ease factor drop below 1.3", () => {
    let state = { easeFactor: 1.5, intervalDays: 1, repetition: 1 };
    for (let i = 0; i < 10; i++) {
      state = calculateNextReview(state, 0);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe("masteryFromInterval", () => {
  it("returns 'new_play' for interval 0", () => {
    expect(masteryFromInterval(0)).toBe("new_play");
  });

  it("returns 'learning' for interval < 3", () => {
    expect(masteryFromInterval(1)).toBe("learning");
    expect(masteryFromInterval(2.9)).toBe("learning");
  });

  it("returns 'reviewing' for interval 3-21", () => {
    expect(masteryFromInterval(3)).toBe("reviewing");
    expect(masteryFromInterval(21)).toBe("reviewing");
  });

  it("returns 'mastered' for interval > 21", () => {
    expect(masteryFromInterval(22)).toBe("mastered");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/lib/spaced-repetition/sm2.test.ts
```

- [ ] **Step 3: Create `src/lib/spaced-repetition/sm2.ts`**

```typescript
interface ReviewState {
  easeFactor: number;
  intervalDays: number;
  repetition: number;
}

/**
 * Map a quiz score (0.0-1.0) to SM-2 quality rating (0-5).
 */
export function qualityFromScore(score: number): number {
  if (score >= 0.95) return 5;
  if (score >= 0.8) return 4;
  if (score >= 0.6) return 3;
  if (score >= 0.4) return 2;
  if (score >= 0.2) return 1;
  return 0;
}

/**
 * SM-2 algorithm: calculate next review interval and updated ease factor.
 */
export function calculateNextReview(state: ReviewState, quality: number): ReviewState {
  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const diff = 5 - quality;
  let newEF = state.easeFactor + (0.1 - diff * (0.08 + diff * 0.02));
  newEF = Math.max(1.3, newEF);

  // If quality < 3, reset repetition
  if (quality < 3) {
    return {
      easeFactor: newEF,
      intervalDays: 1,
      repetition: 0,
    };
  }

  let newInterval: number;
  const newRepetition = state.repetition + 1;

  if (state.repetition === 0) {
    newInterval = 1;
  } else if (state.repetition === 1) {
    newInterval = 3;
  } else {
    newInterval = state.intervalDays * newEF;
  }

  return {
    easeFactor: newEF,
    intervalDays: newInterval,
    repetition: newRepetition,
  };
}

/**
 * Derive mastery level from review interval.
 */
export function masteryFromInterval(intervalDays: number): string {
  if (intervalDays === 0) return "new_play";
  if (intervalDays < 3) return "learning";
  if (intervalDays <= 21) return "reviewing";
  return "mastered";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- tests/lib/spaced-repetition/sm2.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spaced-repetition/ tests/lib/spaced-repetition/
git commit -m "feat: add SM-2 spaced repetition algorithm with quality scoring and mastery levels"
```

---

### Task 2: Progress & Quiz Server Actions

**Files:**
- Create: `src/lib/actions/progress-actions.ts`, `src/lib/actions/quiz-actions.ts`, `src/lib/actions/game-plan-actions.ts`

- [ ] **Step 1: Create `src/lib/actions/progress-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateNextReview, qualityFromScore, masteryFromInterval } from "@/lib/spaced-repetition/sm2";

export async function recordPlayView(playId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const existing = await db.playerProgress.findUnique({
    where: { userId_playId: { userId: session.user.id, playId } },
  });

  const now = new Date();

  if (existing) {
    // Update: increment views, update time, recalculate review with quality=3 (viewed)
    const reviewState = calculateNextReview(
      { easeFactor: existing.easeFactor, intervalDays: existing.intervalDays, repetition: existing.views },
      3 // viewing = neutral quality
    );
    const mastery = masteryFromInterval(reviewState.intervalDays);

    await db.playerProgress.update({
      where: { id: existing.id },
      data: {
        views: { increment: 1 },
        lastViewedAt: now,
        easeFactor: reviewState.easeFactor,
        intervalDays: reviewState.intervalDays,
        nextReviewAt: new Date(now.getTime() + reviewState.intervalDays * 86400000),
        masteryLevel: mastery as "new_play" | "learning" | "reviewing" | "mastered",
      },
    });
  } else {
    // Create new progress record
    await db.playerProgress.create({
      data: {
        userId: session.user.id,
        playId,
        views: 1,
        lastViewedAt: now,
        masteryLevel: "learning",
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewAt: new Date(now.getTime() + 86400000), // 1 day
      },
    });
  }
}

export async function recordQuizScore(playId: string, score: number) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const existing = await db.playerProgress.findUnique({
    where: { userId_playId: { userId: session.user.id, playId } },
  });

  const now = new Date();
  const quality = qualityFromScore(score);

  if (existing) {
    const reviewState = calculateNextReview(
      { easeFactor: existing.easeFactor, intervalDays: existing.intervalDays, repetition: existing.views },
      quality
    );
    const mastery = masteryFromInterval(reviewState.intervalDays);

    await db.playerProgress.update({
      where: { id: existing.id },
      data: {
        easeFactor: reviewState.easeFactor,
        intervalDays: reviewState.intervalDays,
        nextReviewAt: new Date(now.getTime() + reviewState.intervalDays * 86400000),
        masteryLevel: mastery as "new_play" | "learning" | "reviewing" | "mastered",
        quizScores: { push: score },
      },
    });
  } else {
    const reviewState = calculateNextReview(
      { easeFactor: 2.5, intervalDays: 0, repetition: 0 },
      quality
    );
    const mastery = masteryFromInterval(reviewState.intervalDays);

    await db.playerProgress.create({
      data: {
        userId: session.user.id,
        playId,
        views: 0,
        masteryLevel: mastery as "new_play" | "learning" | "reviewing" | "mastered",
        easeFactor: reviewState.easeFactor,
        intervalDays: reviewState.intervalDays,
        nextReviewAt: new Date(now.getTime() + reviewState.intervalDays * 86400000),
        quizScores: [score],
      },
    });
  }
}

export async function getPlayerProgress(userId: string) {
  return db.playerProgress.findMany({
    where: { userId },
    include: { play: { include: { playbook: true } } },
    orderBy: { nextReviewAt: "asc" },
  });
}

export async function getDueForReview(userId: string) {
  return db.playerProgress.findMany({
    where: {
      userId,
      nextReviewAt: { lte: new Date() },
    },
    include: { play: true },
    orderBy: { nextReviewAt: "asc" },
    take: 10,
  });
}
```

- [ ] **Step 2: Create `src/lib/actions/quiz-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getQuizzes(orgId: string) {
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true, attempts: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuiz(id: string) {
  return db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: { play: { select: { name: true, formation: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getPlayerQuizzes(orgId: string) {
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function createQuiz(data: {
  orgId: string;
  name: string;
  gamePlanId?: string;
  dueDate?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const quiz = await db.quiz.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      gamePlanId: data.gamePlanId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/quizzes");
  return quiz;
}

export async function addQuizQuestion(data: {
  quizId: string;
  playId: string;
  questionType: string;
  questionText: string;
  options?: unknown;
  correctAnswer?: string;
  sortOrder: number;
}) {
  return db.quizQuestion.create({
    data: {
      quizId: data.quizId,
      playId: data.playId,
      questionType: data.questionType as "multiple_choice" | "tap_field" | "identify_route" | "situation_match" | "assignment_recall",
      questionText: data.questionText,
      options: data.options ?? undefined,
      correctAnswer: data.correctAnswer,
      sortOrder: data.sortOrder,
    },
  });
}

export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string; correct: boolean }[];
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const totalQuestions = data.answers.length;
  const correctAnswers = data.answers.filter((a) => a.correct).length;
  const score = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: data.quizId,
      userId: session.user.id,
      score,
      answers: data.answers,
      completedAt: new Date(),
    },
  });

  // Update progress for each play in the quiz
  const quiz = await db.quiz.findUnique({
    where: { id: data.quizId },
    include: { questions: true },
  });

  if (quiz) {
    const playScores = new Map<string, number[]>();
    for (const answer of data.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (question) {
        const scores = playScores.get(question.playId) || [];
        scores.push(answer.correct ? 1 : 0);
        playScores.set(question.playId, scores);
      }
    }

    // Import dynamically to avoid circular deps
    const { recordQuizScore } = await import("./progress-actions");
    for (const [playId, scores] of playScores) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      await recordQuizScore(playId, avgScore);
    }
  }

  return attempt;
}

export async function getQuizAttempts(quizId: string, userId: string) {
  return db.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { startedAt: "desc" },
  });
}
```

- [ ] **Step 3: Create `src/lib/actions/game-plan-actions.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getGamePlans(orgId: string) {
  return db.gamePlan.findMany({
    where: { orgId },
    include: {
      _count: { select: { plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveGamePlan(orgId: string) {
  return db.gamePlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plays: {
        include: { play: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createGamePlan(data: {
  orgId: string;
  name: string;
  week?: number;
  opponent?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const gamePlan = await db.gamePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      week: data.week,
      opponent: data.opponent,
      createdById: session.user.id,
    },
  });

  revalidatePath("/game-plans");
  return gamePlan;
}

export async function setActiveGamePlan(orgId: string, gamePlanId: string) {
  // Deactivate all, then activate the selected one
  await db.gamePlan.updateMany({
    where: { orgId },
    data: { isActive: false },
  });

  await db.gamePlan.update({
    where: { id: gamePlanId },
    data: { isActive: true },
  });

  revalidatePath("/game-plans");
}

export async function addPlayToGamePlan(gamePlanId: string, playId: string) {
  const maxOrder = await db.gamePlanPlay.aggregate({
    where: { gamePlanId },
    _max: { sortOrder: true },
  });

  return db.gamePlanPlay.create({
    data: {
      gamePlanId,
      playId,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function removePlayFromGamePlan(gamePlanId: string, playId: string) {
  await db.gamePlanPlay.deleteMany({
    where: { gamePlanId, playId },
  });
  revalidatePath("/game-plans");
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/
git commit -m "feat: add server actions for progress tracking, quizzes, and game plans"
```

---

### Task 3: Play Viewer Component (Read-Only for Players)

**Files:**
- Create: `src/components/play/play-viewer.tsx`

- [ ] **Step 1: Create `src/components/play/play-viewer.tsx`**

A read-only version of the play canvas for players to view plays. Uses dynamic import for Konva.

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { deserializeCanvas } from "@/engine/serialization";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Loading...</div> }
);

interface PlayViewerProps {
  canvasData: unknown;
  className?: string;
}

export function PlayViewer({ canvasData, className }: PlayViewerProps) {
  const data = deserializeCanvas(canvasData);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <div className={className ?? "aspect-[5/3] w-full"}>
      <PlayCanvas
        canvasData={data}
        onChange={() => {}}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
        drawingRoute={false}
        readOnly
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/play/play-viewer.tsx
git commit -m "feat: add read-only play viewer component for players"
```

---

### Task 4: Quiz Components

**Files:**
- Create: `src/components/quiz/quiz-card.tsx`, `src/components/quiz/multiple-choice.tsx`, `src/components/quiz/quiz-flow.tsx`

- [ ] **Step 1: Create `src/components/quiz/quiz-card.tsx`**

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion } from "lucide-react";

interface QuizCardProps {
  id: string;
  name: string;
  questionCount: number;
  dueDate?: string | null;
  gamePlanName?: string | null;
  href: string;
}

export function QuizCard({ id, name, questionCount, dueDate, gamePlanName, href }: QuizCardProps) {
  const isDue = dueDate ? new Date(dueDate) <= new Date() : false;

  return (
    <Link href={href}>
      <Card className="group cursor-pointer transition-colors hover:border-zinc-600">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
              <FileQuestion className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>
                {gamePlanName && <span>· {gamePlanName}</span>}
              </div>
              {dueDate && (
                <Badge variant={isDue ? "warning" : "outline"} className="mt-2">
                  {isDue ? "Due now" : `Due ${new Date(dueDate).toLocaleDateString()}`}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/components/quiz/multiple-choice.tsx`**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface Option {
  text: string;
  correct: boolean;
}

interface MultipleChoiceProps {
  questionText: string;
  options: Option[];
  onAnswer: (correct: boolean, answer: string) => void;
  showResult: boolean;
}

export function MultipleChoice({ questionText, options, onAnswer, showResult }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    if (showResult) return;
    setSelected(index);
    onAnswer(options[index].correct, options[index].text);
  }

  return (
    <div>
      <h3 className="mb-6 text-lg font-semibold text-white">{questionText}</h3>
      <div className="space-y-3">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = option.correct;

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={showResult}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition-colors",
                showResult && isCorrect
                  ? "border-green-600 bg-green-600/10 text-green-400"
                  : showResult && isSelected && !isCorrect
                  ? "border-red-600 bg-red-600/10 text-red-400"
                  : isSelected
                  ? "border-indigo-600 bg-indigo-600/10 text-white"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isSelected ? "border-indigo-500 bg-indigo-600 text-white" : "border-zinc-600 text-zinc-500"
                )}
              >
                {showResult && isCorrect ? (
                  <Check className="h-4 w-4" />
                ) : showResult && isSelected && !isCorrect ? (
                  <X className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </div>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/quiz/quiz-flow.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MultipleChoice } from "./multiple-choice";
import { submitQuizAttempt } from "@/lib/actions/quiz-actions";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: { text: string; correct: boolean }[] | null;
  correctAnswer: string | null;
  play: { name: string; formation: string };
}

interface QuizFlowProps {
  quizId: string;
  quizName: string;
  questions: Question[];
}

export function QuizFlow({ quizId, quizName, questions }: QuizFlowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string; correct: boolean }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<{ correct: boolean; answer: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentIndex];
  const progress = ((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100;

  function handleAnswer(correct: boolean, answer: string) {
    setCurrentAnswer({ correct, answer });
    setShowResult(true);
  }

  function handleNext() {
    if (!currentAnswer) return;

    const newAnswers = [...answers, {
      questionId: question.id,
      answer: currentAnswer.answer,
      correct: currentAnswer.correct,
    }];
    setAnswers(newAnswers);
    setShowResult(false);
    setCurrentAnswer(null);

    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      handleSubmit(newAnswers);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  async function handleSubmit(finalAnswers: typeof answers) {
    setSubmitting(true);
    await submitQuizAttempt({ quizId, answers: finalAnswers });
    setSubmitting(false);
  }

  const score = answers.length > 0
    ? Math.round((answers.filter((a) => a.correct).length / answers.length) * 100)
    : 0;

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className={cn("h-16 w-16 mb-4", score >= 70 ? "text-green-400" : "text-amber-400")} />
        <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
        <p className="text-4xl font-bold mb-2" style={{ color: score >= 70 ? "#22c55e" : "#f59e0b" }}>
          {score}%
        </p>
        <p className="text-sm text-zinc-500 mb-6">
          {answers.filter((a) => a.correct).length} of {answers.length} correct
        </p>
        <Button onClick={() => router.push("/quiz")}>Back to Quizzes</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{quizName}</span>
          <span className="text-xs text-zinc-500">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Play context */}
      <div className="mb-4 text-xs text-zinc-500">
        Play: {question.play.name} · {question.play.formation}
      </div>

      {/* Question */}
      <Card>
        <CardContent className="p-6">
          {question.questionType === "multiple_choice" && question.options && (
            <MultipleChoice
              questionText={question.questionText}
              options={question.options as { text: string; correct: boolean }[]}
              onAnswer={handleAnswer}
              showResult={showResult}
            />
          )}

          {/* Fallback for other question types */}
          {question.questionType !== "multiple_choice" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">{question.questionText}</h3>
              <p className="text-sm text-zinc-500">This question type is not yet supported.</p>
              <Button className="mt-4" onClick={() => handleAnswer(false, "skipped")}>
                Skip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next button */}
      {showResult && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleNext}>
            {currentIndex + 1 >= questions.length ? "Finish" : "Next"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
```

Note: The `cn` function in quiz-flow.tsx is a local helper — the component also uses the proper `cn` from `@/lib/utils` via imported components. The local one is just for inline conditional classes in this file.

- [ ] **Step 4: Commit**

```bash
git add src/components/quiz/
git commit -m "feat: add quiz components (quiz card, multiple choice, quiz flow)"
```

---

### Task 5: Player Pages (Plays Browser, Play Detail, Quiz List, Take Quiz, Progress)

**Files:**
- Create: `src/app/(player)/plays/page.tsx`, `src/app/(player)/plays/[id]/page.tsx`, `src/app/(player)/quiz/page.tsx`, `src/app/(player)/quiz/[id]/page.tsx`, `src/app/(player)/progress/page.tsx`

- [ ] **Step 1: Create `src/app/(player)/plays/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlayerPlaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  // Get all plays from the player's org
  const playbooks = await db.playbook.findMany({
    where: { orgId: membership.orgId },
    include: {
      plays: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const allPlays = playbooks.flatMap((pb) =>
    pb.plays.map((play) => ({ ...play, playbookName: pb.name, side: pb.side }))
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Plays</h1>
        <p className="text-sm text-zinc-500">{allPlays.length} plays available</p>
      </div>

      {allPlays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500">No plays available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allPlays.map((play) => (
            <Link key={play.id} href={`/plays/${play.id}`}>
              <Card className="group cursor-pointer transition-colors hover:border-zinc-600">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#1a3a1a]">
                    <span className="text-[10px] text-green-700">▶</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {play.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{play.formation}</span>
                      <Badge variant="outline">{play.playType}</Badge>
                      <span>· {play.playbookName}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(player)/plays/[id]/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPlay } from "@/lib/actions/play-actions";
import { recordPlayView } from "@/lib/actions/progress-actions";
import { PlayViewer } from "@/components/play/play-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlayDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const play = await getPlay(id);
  if (!play) notFound();

  // Record view
  await recordPlayView(id);

  return (
    <div>
      <Link
        href="/plays"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Plays
      </Link>

      <h1 className="text-xl font-bold text-white mb-1">{play.name}</h1>
      <div className="flex items-center gap-2 mb-4">
        <Badge>{play.playType}</Badge>
        <span className="text-xs text-zinc-500">{play.formation}</span>
      </div>

      {/* Play viewer */}
      <div className="mb-6 overflow-hidden rounded-xl border border-zinc-800">
        <PlayViewer canvasData={play.canvasData} />
      </div>

      {/* Situation tags */}
      {play.situationTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {play.situationTags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Coach notes */}
      {play.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-zinc-500 mb-2">COACH NOTES</div>
            <p className="text-sm text-zinc-300">{play.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Film link */}
      {play.filmUrl && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-zinc-500 mb-2">GAME FILM</div>
            <a
              href={play.filmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:underline"
            >
              Watch film →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(player)/quiz/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getPlayerQuizzes } from "@/lib/actions/quiz-actions";
import { QuizCard } from "@/components/quiz/quiz-card";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerQuizPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const quizzes = await getPlayerQuizzes(membership.orgId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Quizzes</h1>
        <p className="text-sm text-zinc-500">{quizzes.length} available</p>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500">No quizzes assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              id={quiz.id}
              name={quiz.name}
              questionCount={quiz._count.questions}
              dueDate={quiz.dueDate?.toISOString()}
              gamePlanName={quiz.gamePlan?.name}
              href={`/quiz/${quiz.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(player)/quiz/[id]/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getQuiz } from "@/lib/actions/quiz-actions";
import { QuizFlow } from "@/components/quiz/quiz-flow";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TakeQuizPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) notFound();

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-zinc-500">This quiz has no questions yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <QuizFlow
        quizId={quiz.id}
        quizName={quiz.name}
        questions={quiz.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options as { text: string; correct: boolean }[] | null,
          correctAnswer: q.correctAnswer,
          play: q.play,
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/(player)/progress/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlayerProgress } from "@/lib/actions/progress-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const masteryColors: Record<string, string> = {
  new_play: "destructive",
  learning: "warning",
  reviewing: "default",
  mastered: "success",
};

const masteryLabels: Record<string, string> = {
  new_play: "New",
  learning: "Learning",
  reviewing: "Reviewing",
  mastered: "Mastered",
};

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const progress = await getPlayerProgress(session.user.id);

  const mastered = progress.filter((p) => p.masteryLevel === "mastered").length;
  const reviewing = progress.filter((p) => p.masteryLevel === "reviewing").length;
  const learning = progress.filter((p) => p.masteryLevel === "learning").length;
  const newPlays = progress.filter((p) => p.masteryLevel === "new_play").length;
  const total = progress.length;

  const avgScore = progress.length > 0
    ? progress.reduce((acc, p) => {
        const scores = p.quizScores as number[];
        if (scores.length === 0) return acc;
        return acc + scores.reduce((a, b) => a + b, 0) / scores.length;
      }, 0) / progress.filter((p) => (p.quizScores as number[]).length > 0).length
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Progress</h1>
        <p className="text-sm text-zinc-500">{total} plays tracked</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500">Mastered</div>
            <div className="text-2xl font-bold text-green-400">{mastered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500">Reviewing</div>
            <div className="text-2xl font-bold text-indigo-400">{reviewing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500">Learning</div>
            <div className="text-2xl font-bold text-amber-400">{learning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500">Avg Quiz Score</div>
            <div className="text-2xl font-bold text-white">
              {isNaN(avgScore) ? "—" : `${Math.round(avgScore * 100)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-500 mb-2">Mastery Breakdown</div>
            <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
              {mastered > 0 && (
                <div className="bg-green-500" style={{ width: `${(mastered / total) * 100}%` }} />
              )}
              {reviewing > 0 && (
                <div className="bg-indigo-500" style={{ width: `${(reviewing / total) * 100}%` }} />
              )}
              {learning > 0 && (
                <div className="bg-amber-500" style={{ width: `${(learning / total) * 100}%` }} />
              )}
              {newPlays > 0 && (
                <div className="bg-red-500" style={{ width: `${(newPlays / total) * 100}%` }} />
              )}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Mastered</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Reviewing</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Learning</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> New</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Play list */}
      <h2 className="text-sm font-semibold text-white mb-3">All Plays</h2>
      <div className="space-y-2">
        {progress.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium text-white">{p.play.name}</div>
                <div className="text-xs text-zinc-500">{p.play.formation} · {p.views} views</div>
              </div>
              <Badge variant={masteryColors[p.masteryLevel] as "default" | "success" | "warning" | "destructive"}>
                {masteryLabels[p.masteryLevel]}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-zinc-500">Start viewing plays to track your progress.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(player\)/
git commit -m "feat: add player pages (plays browser, play detail, quiz, progress dashboard)"
```

---

### Task 6: Coach Quiz & Game Plan Pages

**Files:**
- Create: `src/app/(coach)/quizzes/page.tsx`, `src/app/(coach)/game-plans/page.tsx`

- [ ] **Step 1: Create `src/app/(coach)/quizzes/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getQuizzes } from "@/lib/actions/quiz-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachQuizzesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const quizzes = await getQuizzes(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quizzes</h1>
          <p className="text-sm text-zinc-500">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500">No quizzes yet. Create one to test your players.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <CardTitle className="text-base">{quiz.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{quiz._count.questions} questions</span>
                  <span>· {quiz._count.attempts} attempts</span>
                </div>
                {quiz.gamePlan && (
                  <Badge className="mt-2">{quiz.gamePlan.name}</Badge>
                )}
                {quiz.dueDate && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Due: {new Date(quiz.dueDate).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(coach)/game-plans/page.tsx`**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getGamePlans } from "@/lib/actions/game-plan-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GamePlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const gamePlans = await getGamePlans(membership.orgId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Plans</h1>
          <p className="text-sm text-zinc-500">{gamePlans.length} game plan{gamePlans.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {gamePlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500">No game plans yet. Create one for this week.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gamePlans.map((gp) => (
            <Card key={gp.id} className={gp.isActive ? "border-indigo-600" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{gp.name}</CardTitle>
                  {gp.isActive && <Badge>Active</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{gp._count.plays} plays</span>
                  {gp.opponent && <span>· vs {gp.opponent}</span>}
                  {gp.week && <span>· Week {gp.week}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(coach\)/quizzes/ src/app/\(coach\)/game-plans/
git commit -m "feat: add coach quiz management and game plan pages"
```

---

### Task 7: Updated Player Home with Study Feed

**Files:**
- Modify: `src/app/(player)/home/page.tsx`

- [ ] **Step 1: Update `src/app/(player)/home/page.tsx`**

Replace the placeholder with a real study feed:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMembership } from "@/lib/membership";
import { getDueForReview, getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerQuizzes } from "@/lib/actions/quiz-actions";
import { getActiveGamePlan } from "@/lib/actions/game-plan-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlayerHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await getUserMembership(session.user.id);
  if (!membership) redirect("/join");

  const [dueForReview, progress, quizzes, activeGamePlan] = await Promise.all([
    getDueForReview(session.user.id),
    getPlayerProgress(session.user.id),
    getPlayerQuizzes(membership.orgId),
    getActiveGamePlan(membership.orgId),
  ]);

  const totalPlays = progress.length;
  const masteredCount = progress.filter((p) => p.masteryLevel === "mastered").length;
  const completionPct = totalPlays > 0 ? Math.round((masteredCount / totalPlays) * 100) : 0;
  const userName = session.user.name?.split(" ")[0] ?? "Player";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Hey {userName} 👋</h1>
        {activeGamePlan && (
          <p className="text-sm text-zinc-500">{activeGamePlan.name}</p>
        )}
      </div>

      {/* Due for review */}
      {dueForReview.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-amber-500">
          <CardContent className="py-4">
            <div className="text-[11px] font-semibold text-amber-400">DUE FOR REVIEW</div>
            <div className="mt-1 text-sm font-medium text-white">
              {dueForReview.length} play{dueForReview.length !== 1 ? "s" : ""} need review
            </div>
            <div className="mt-2 space-y-1">
              {dueForReview.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/plays/${p.playId}`} className="block text-xs text-zinc-400 hover:text-indigo-400">
                  → {p.play.name}
                </Link>
              ))}
              {dueForReview.length > 3 && (
                <Link href="/plays" className="block text-xs text-indigo-400">
                  + {dueForReview.length - 3} more
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending quizzes */}
      {quizzes.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-indigo-500">
          <CardContent className="py-4">
            <div className="text-[11px] font-semibold text-indigo-400">QUIZZES</div>
            <div className="mt-1 space-y-2">
              {quizzes.slice(0, 2).map((q) => (
                <Link key={q.id} href={`/quiz/${q.id}`} className="block">
                  <div className="text-sm font-medium text-white hover:text-indigo-400">{q.name}</div>
                  <div className="text-xs text-zinc-500">
                    {q._count.questions} questions
                    {q.dueDate && ` · Due ${new Date(q.dueDate).toLocaleDateString()}`}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-white">Mastery</div>
            <div className="text-sm font-semibold text-zinc-400">{masteredCount}/{totalPlays}</div>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {totalPlays === 0 && dueForReview.length === 0 && quizzes.length === 0 && (
        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">
              No plays assigned yet. Check back when your coach adds content.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(player\)/home/page.tsx
git commit -m "feat: update player home with study feed, due reviews, and quiz notifications"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: All tests pass (existing 18 + new SM-2 tests).

- [ ] **Step 2: Run the build**

```bash
npm run build
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Phase 3 Summary

After completing Phase 3, you have:

- ✅ SM-2 spaced repetition algorithm with quality scoring and mastery levels
- ✅ Server actions for progress tracking, quiz CRUD, and game plans
- ✅ Read-only play viewer component for players
- ✅ Quiz components (quiz card, multiple choice, quiz flow with scoring)
- ✅ Player play browser with play detail view (records views for spaced repetition)
- ✅ Player quiz pages (list + take quiz flow with results)
- ✅ Player progress dashboard with mastery breakdown
- ✅ Player home with personalized study feed (due reviews, quizzes, progress)
- ✅ Coach quiz management and game plan pages

**Next: Phase 4 — Analytics & AI (Coach dashboards, AI play generation, PWA)**
