# PlayForge Phase 1c — Player Loop Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the broken player-facing loops in PlayForge — quiz finish routing/rewards, join-with-existing-email, auto sign-in, coach-mediated + self-service password change, honest home empty-state copy, and live notification wiring.

**Architecture:** Extract pure, unit-testable helpers (reward delta, join decision, temp-password generation, deterministic notification ids) from the DB-bound server actions and route handlers, then wire them into the existing Next.js App Router surfaces. Server actions and route handlers stay thin; UI reuses existing primitives (`Button`, `Input`, `Card`, `DropdownMenu`, toast) plus one new shared `Dialog` wrapper over the already-installed `@radix-ui/react-dialog`.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), React 19, Prisma 7 (PostgreSQL), NextAuth v5 beta (JWT credentials), bcryptjs (cost 12), Node `crypto`, Tailwind v4, Radix UI, Vitest + Testing Library (jsdom).

## Global Constraints

- **No new npm dependencies.** `crypto` is a Node built-in; `@radix-ui/react-dialog@^1.1.17` is already in `package.json`.
- **Tailwind only**; keep the existing dark-theme utility classes verbatim (semantic-token migration is Phase 2 — do NOT migrate colors here).
- **bcrypt cost 12** for every hash (matches `join/route.ts` and `signup/route.ts`).
- **Tests** live under `tests/` mirroring `src/` (e.g. `src/lib/x.ts` → `tests/lib/x.test.ts`). Run with Vitest (jsdom, globals enabled).
- **No real database in tests.** Mock `@/lib/db`, `@/lib/auth`, `@/lib/authz`, `bcryptjs`, and `next/cache` with `vi.mock`. Prefer testing extracted pure helpers over DB-bound actions.
- **Node >= 20.9** (per `package.json` engines).
- Single-test command: `npx vitest run <path>`. Full suite: `npm run test:run`. Build: `npm run build`.

## Interfaces consumed from plan 1a (treat as already existing — do NOT re-implement)

From `src/lib/authz.ts`:
- `class AuthzError extends Error`
- `requireOrgAccess(orgId: string, opts?: { coach?: boolean }): Promise<Membership>` — resolves the session, verifies membership (and coach role if `opts.coach`), returns the membership or throws `AuthzError`.

> **Cross-plan ordering:** Task 5 (`resetMemberPassword`) imports `requireOrgAccess`. Plan 1a must land before Task 5 executes, otherwise the import will not resolve. Every other task in this plan is independent of plan 1a.

> **Dialog approach (confirmed with lead):** There is **no** shared `src/components/ui/dialog.tsx` and this plan does **not** create one. The form/display dialogs here (change-password in Task 4, reset-password temp-password display in Task 5) import `@radix-ui/react-dialog` **directly**, matching the styling already used by the designer's Print Panel modal (`src/app/(coach)/designer/page.tsx:5` imports `* as Dialog`; markup at `:895-958`). Plan 1d separately creates `src/components/ui/confirm-dialog.tsx` for confirmation dialogs — that is a different concern; do not consume or duplicate it here.

---

### Task 1: Quiz finish routing + reward feedback

Fixes the "Back to Quizzes" link (currently targets the coach route `/quizzes`, bouncing players Home) and adds XP-earned + newly-unlocked-badge feedback to the finish screen. The reward delta is computed by a pure helper so it is unit-testable without a database.

**Files:**
- Modify: `src/lib/gamification.ts` (add `RewardBadge`, `playerStatsFromProgress`, `computeQuizReward`)
- Modify: `src/lib/actions/quiz-actions.ts:88-137` (`submitQuizAttempt` returns the reward)
- Modify: `src/components/quiz/quiz-flow.tsx:52-92` (capture reward; fix link; render XP + badges)
- Test: `tests/lib/gamification.test.ts`

**Interfaces:**
- Consumes: existing `calculateXP(stats: PlayerStats): number` and `getEarnedBadges(stats: PlayerStats): Badge[]` from `src/lib/gamification.ts`.
- Produces:
  - `type RewardBadge = { id: string; name: string; description: string; icon: string }`
  - `playerStatsFromProgress(rows: { views: number; masteryLevel: string; quizScores: number[] }[]): PlayerStats`
  - `computeQuizReward(before: PlayerStats, after: PlayerStats): { xpEarned: number; newBadges: RewardBadge[] }`
  - `submitQuizAttempt(data): Promise<{ xpEarned: number; newBadges: RewardBadge[] }>` (changed return type; only caller is `quiz-flow.tsx`)

> **Design note (verified):** The home page computes player stats with `averageScore`, `currentStreak`, `longestStreak`, `daysActive` all set to `0` placeholders (`home/page.tsx:44-53`). `playerStatsFromProgress` mirrors that exactly so the finish-screen reward stays consistent with what the player sees on Home. Real streak/averageScore math is Phase 1 §5 / Phase 3 — out of scope here. Because those fields are identical in the before/after snapshots, they cancel out of the XP delta and never spuriously unlock streak/perfect-score badges.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/gamification.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  playerStatsFromProgress,
  computeQuizReward,
  type PlayerStats,
} from "@/lib/gamification";

const base: PlayerStats = {
  totalViews: 0,
  totalQuizzes: 0,
  averageScore: 0,
  currentStreak: 0,
  longestStreak: 0,
  playsMastered: 0,
  totalPlays: 0,
  daysActive: 0,
};

describe("playerStatsFromProgress", () => {
  it("sums views and quiz-score counts and counts mastered plays", () => {
    const stats = playerStatsFromProgress([
      { views: 3, masteryLevel: "mastered", quizScores: [0.8, 1] },
      { views: 1, masteryLevel: "learning", quizScores: [] },
    ]);
    expect(stats.totalViews).toBe(4);
    expect(stats.totalQuizzes).toBe(2);
    expect(stats.playsMastered).toBe(1);
    expect(stats.totalPlays).toBe(2);
  });

  it("returns zeroed placeholders for streak/averageScore/daysActive", () => {
    const stats = playerStatsFromProgress([]);
    expect(stats.averageScore).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.daysActive).toBe(0);
  });
});

describe("computeQuizReward", () => {
  it("returns the XP delta between the two snapshots", () => {
    const before = { ...base, totalQuizzes: 0 };
    const after = { ...base, totalQuizzes: 1 };
    expect(computeQuizReward(before, after).xpEarned).toBe(50);
  });

  it("lists badges newly earned in 'after' as plain (function-free) objects", () => {
    const before = { ...base, totalQuizzes: 0 };
    const after = { ...base, totalQuizzes: 1 };
    const { newBadges } = computeQuizReward(before, after);
    expect(newBadges.map((b) => b.id)).toContain("first-quiz");
    expect(newBadges[0]).not.toHaveProperty("condition");
  });

  it("excludes badges already earned before the attempt", () => {
    const before = { ...base, totalQuizzes: 1 };
    const after = { ...base, totalQuizzes: 2 };
    expect(
      computeQuizReward(before, after).newBadges.map((b) => b.id),
    ).not.toContain("first-quiz");
  });

  it("never returns negative XP", () => {
    const before = { ...base, totalViews: 10 };
    const after = { ...base, totalViews: 0 };
    expect(computeQuizReward(before, after).xpEarned).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/gamification.test.ts`
Expected: FAIL — `playerStatsFromProgress` / `computeQuizReward` are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/gamification.ts` (after `getLevel`, at end of file):

```ts
export type RewardBadge = Pick<Badge, "id" | "name" | "description" | "icon">;

export function playerStatsFromProgress(
  rows: { views: number; masteryLevel: string; quizScores: number[] }[],
): PlayerStats {
  return {
    totalViews: rows.reduce((sum, r) => sum + r.views, 0),
    totalQuizzes: rows.reduce((sum, r) => sum + r.quizScores.length, 0),
    averageScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    playsMastered: rows.filter((r) => r.masteryLevel === "mastered").length,
    totalPlays: rows.length,
    daysActive: 0,
  };
}

export function computeQuizReward(
  before: PlayerStats,
  after: PlayerStats,
): { xpEarned: number; newBadges: RewardBadge[] } {
  const beforeIds = new Set(getEarnedBadges(before).map((b) => b.id));
  const newBadges = getEarnedBadges(after)
    .filter((b) => !beforeIds.has(b.id))
    .map(({ id, name, description, icon }) => ({ id, name, description, icon }));
  return {
    xpEarned: Math.max(0, calculateXP(after) - calculateXP(before)),
    newBadges,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/gamification.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire the reward into `submitQuizAttempt`**

Replace `submitQuizAttempt` in `src/lib/actions/quiz-actions.ts` (currently `:88-137`) with the version below. Also add the import at the top of the file (alongside the existing imports):

```ts
import {
  playerStatsFromProgress,
  computeQuizReward,
  type RewardBadge,
} from "@/lib/gamification";
```

```ts
export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string; correct: boolean }[];
}): Promise<{ xpEarned: number; newBadges: RewardBadge[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Snapshot stats BEFORE recording the attempt.
  const beforeRows = await db.playerProgress.findMany({
    where: { userId },
    select: { views: true, masteryLevel: true, quizScores: true },
  });
  const beforeStats = playerStatsFromProgress(beforeRows);

  const correctCount = data.answers.filter((a) => a.correct).length;
  const score = data.answers.length > 0 ? correctCount / data.answers.length : 0;

  await db.quizAttempt.create({
    data: {
      quizId: data.quizId,
      userId,
      score,
      answers: data.answers,
      completedAt: new Date(),
    },
  });

  // Update progress per play (spaced-repetition + mastery recompute).
  const quiz = await db.quiz.findUnique({
    where: { id: data.quizId },
    include: { questions: true },
  });

  if (quiz) {
    const playScores = new Map<string, { correct: number; total: number }>();

    for (const answer of data.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const existing = playScores.get(question.playId) ?? {
        correct: 0,
        total: 0,
      };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      playScores.set(question.playId, existing);
    }

    for (const [playId, counts] of playScores) {
      const playScore = counts.total > 0 ? counts.correct / counts.total : 0;
      await recordQuizScore(playId, playScore);
    }
  }

  // Snapshot stats AFTER, then return the reward delta.
  const afterRows = await db.playerProgress.findMany({
    where: { userId },
    select: { views: true, masteryLevel: true, quizScores: true },
  });
  const afterStats = playerStatsFromProgress(afterRows);

  return computeQuizReward(beforeStats, afterStats);
}
```

- [ ] **Step 6: Fix routing + render the reward in the finish screen**

In `src/components/quiz/quiz-flow.tsx`:

Add a reward state next to the other `useState` calls (after `const [submitError, ...]` at `:37`):

```tsx
  const [reward, setReward] = useState<{
    xpEarned: number;
    newBadges: { id: string; name: string; description: string; icon: string }[];
  } | null>(null);
```

In `handleNext`, replace the finish branch (`:60-63`, the `try { const finalAnswers ...; await submitQuizAttempt(...); setFinished(true); }`) so it captures the reward:

```tsx
      try {
        const finalAnswers = answers;
        const result = await submitQuizAttempt({ quizId, answers: finalAnswers });
        setReward(result);
        setFinished(true);
      } catch (err) {
```

Replace the entire `if (finished) { ... }` block (`:74-92`) with:

```tsx
  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const scorePercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
        <p className="text-4xl font-bold text-white">{scorePercent}%</p>
        <p className="text-sm text-zinc-400">
          {correctCount} of {totalQuestions} correct
        </p>

        {reward && reward.xpEarned > 0 && (
          <p className="text-sm font-semibold text-indigo-400">
            +{reward.xpEarned} XP
          </p>
        )}

        {reward && reward.newBadges.length > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              New badge{reward.newBadges.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-col gap-2">
              {reward.newBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-left"
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{badge.name}</p>
                    <p className="text-xs text-zinc-500">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/quiz">
          <Button variant="outline">Back to Quizzes</Button>
        </Link>
      </div>
    );
  }
```

- [ ] **Step 7: Run the full suite and build**

Run: `npm run test:run`
Expected: PASS (all existing + 6 new).
Run: `npm run build`
Expected: compiles with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/gamification.ts src/lib/actions/quiz-actions.ts src/components/quiz/quiz-flow.tsx tests/lib/gamification.test.ts
git commit -m "feat(quiz): fix finish routing to /quiz and show XP + new badges"
```

---

### Task 2: Join with an existing email

`join/route.ts` currently `upsert`s with `update: {}`, silently discarding the typed password for an existing email and letting anyone "join" onto any existing account. New behavior: verify the password against the stored hash (login-equivalent join), reject on mismatch, and reject OAuth-only accounts. The decision is a pure helper so it is unit-testable without a database.

**Files:**
- Create: `src/lib/auth/join-logic.ts`
- Modify: `src/app/api/auth/join/route.ts` (replace the upsert with lookup + `resolveJoinUser`)
- Test: `tests/lib/auth/join-logic.test.ts`

**Interfaces:**
- Produces:
  - `type JoinResolution = { ok: true; mode: "existing" | "new" } | { ok: false; status: 401 | 409; error: string }`
  - `resolveJoinUser(existingUser: { password: string | null } | null, password: string, compare: (plain: string, hash: string) => Promise<boolean>): Promise<JoinResolution>`

> **Design decision (documented):** An email that exists **without** a password is an OAuth-only account (created by the Prisma adapter during Google sign-in — the only passwordless path, and only when `GOOGLE_CLIENT_ID` is set). We do NOT set the typed password onto it (that would let an attacker claim a Google account by "joining"). We return **409** telling them to sign in with Google first. Wrong password on a password account → **401** with the spec-mandated copy. No existing user → create a new one (unchanged behavior).

> **Join page note (verified):** `join/page.tsx` already surfaces `data.error` from a non-OK response in its red error banner (`handleJoin` `:187-189`), so both the 401 and 409 messages display without any page change in this task. (The join page IS edited in Task 3 for auto sign-in + password toggle.)

- [ ] **Step 1: Write the failing test**

Create `tests/lib/auth/join-logic.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { resolveJoinUser } from "@/lib/auth/join-logic";

describe("resolveJoinUser", () => {
  it("allows a brand-new email (no existing user)", async () => {
    const res = await resolveJoinUser(null, "pw", vi.fn());
    expect(res).toEqual({ ok: true, mode: "new" });
  });

  it("accepts an existing user when the password matches", async () => {
    const compare = vi.fn().mockResolvedValue(true);
    const res = await resolveJoinUser({ password: "hash" }, "pw", compare);
    expect(res).toEqual({ ok: true, mode: "existing" });
    expect(compare).toHaveBeenCalledWith("pw", "hash");
  });

  it("rejects an existing user with a wrong password (401)", async () => {
    const compare = vi.fn().mockResolvedValue(false);
    const res = await resolveJoinUser({ password: "hash" }, "wrong", compare);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.error).toMatch(/already exists/i);
    }
  });

  it("rejects an OAuth-only account (no password) with 409 and never compares", async () => {
    const compare = vi.fn();
    const res = await resolveJoinUser({ password: null }, "pw", compare);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(409);
      expect(res.error).toMatch(/google/i);
    }
    expect(compare).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/auth/join-logic.test.ts`
Expected: FAIL — module `@/lib/auth/join-logic` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/lib/auth/join-logic.ts`:

```ts
export type JoinResolution =
  | { ok: true; mode: "existing" | "new" }
  | { ok: false; status: 401 | 409; error: string };

const WRONG_PASSWORD_ERROR =
  "An account with this email already exists — enter that account's password to join.";
const OAUTH_ONLY_ERROR =
  "This email is already registered through Google sign-in. Sign in with Google, then use your invite link to join.";

export async function resolveJoinUser(
  existingUser: { password: string | null } | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<JoinResolution> {
  if (!existingUser) {
    return { ok: true, mode: "new" };
  }
  if (!existingUser.password) {
    return { ok: false, status: 409, error: OAUTH_ONLY_ERROR };
  }
  const valid = await compare(password, existingUser.password);
  if (!valid) {
    return { ok: false, status: 401, error: WRONG_PASSWORD_ERROR };
  }
  return { ok: true, mode: "existing" };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/auth/join-logic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewire the route**

Replace the whole body of `src/app/api/auth/join/route.ts` with:

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resolveJoinUser } from "@/lib/auth/join-logic";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name, email, position, password, inviteCode } = await req.json();

    if (!name || !email || !position || !password || !inviteCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const org = await db.organization.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    const resolution = await resolveJoinUser(
      existingUser,
      password,
      (plain, hash) => bcrypt.compare(plain, hash),
    );
    if (!resolution.ok) {
      return NextResponse.json(
        { error: resolution.error },
        { status: resolution.status },
      );
    }

    const hashedPassword =
      resolution.mode === "new" ? await bcrypt.hash(password, 12) : null;

    const result = await db.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: { name, email, password: hashedPassword! },
        }));

      const existingMembership = await tx.membership.findUnique({
        where: { userId_orgId: { userId: user.id, orgId: org.id } },
      });

      if (existingMembership) {
        return { alreadyMember: true } as const;
      }

      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "player",
          position,
        },
      });

      return { userId: user.id, orgId: org.id } as const;
    });

    if ("alreadyMember" in result) {
      return NextResponse.json(
        { error: "Already a member of this team" },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: Run the suite and build**

Run: `npx vitest run tests/lib/auth/join-logic.test.ts`
Expected: PASS.
Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/join-logic.ts src/app/api/auth/join/route.ts tests/lib/auth/join-logic.test.ts
git commit -m "feat(join): verify password for existing email instead of silently discarding it"
```

---

### Task 3: Auto sign-in after signup/join + join password visibility toggle

After a successful signup or join, the pages currently `router.push("/login")`, forcing a redundant login. Replace with a client-side credentials `signIn` then route straight to the app (coach → `/dashboard`, player → `/home`); on sign-in failure, fall back to `/login` so nobody is stranded. Also add the show/hide password toggle the login and signup pages already have to the join password fields.

This task is client UX only (auth flows require a live session to exercise) — verified by `npm run build` + the manual checklist. No unit test.

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx` (auto sign-in on success)
- Modify: `src/app/(auth)/join/page.tsx` (auto sign-in on success + password show/hide toggles)

**Interfaces:**
- Consumes: `signIn` from `next-auth/react`; existing `credentials` provider (`src/lib/auth.ts:22-43`), which `bcrypt.compare`s against `User.password`. Both signup (owner, hashed password) and join (new or password-verified existing user) leave a usable credentials login.

- [ ] **Step 1: Auto sign-in after signup**

In `src/app/(auth)/signup/page.tsx`, add to the imports (after `useRouter`):

```tsx
import { signIn } from "next-auth/react";
```

Replace the success branch in `handleSignup` (`:49-54`, the `if (res.ok) { router.push("/login"); } else { ... }`) with:

```tsx
      if (res.ok) {
        const signInResult = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        router.push(signInResult?.error ? "/login" : "/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Signup failed. Please try again.");
      }
```

- [ ] **Step 2: Auto sign-in after join**

In `src/app/(auth)/join/page.tsx`, add to the imports (the file imports from `next/navigation` at `:5`; add a new line):

```tsx
import { signIn } from "next-auth/react";
```

Replace the success branch in `handleJoin` (`:185-190`, the `if (res.ok) { router.push("/login"); } else { ... }`) with:

```tsx
      if (res.ok) {
        const signInResult = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        router.push(signInResult?.error ? "/login" : "/home");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join team. Please try again.");
      }
```

- [ ] **Step 3: Add the password show/hide toggles to join**

In `src/app/(auth)/join/page.tsx`, add `Eye`/`EyeOff` to the imports (add a new import line near the top, matching how `login/page.tsx:6` imports them):

```tsx
import { Eye, EyeOff } from "lucide-react";
```

Add two visibility state hooks next to the existing `useState` calls in `JoinPageContent` (after `const [autoSubmitted, ...]` at `:106`):

```tsx
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
```

Replace the two password field blocks (`:279-304` — the Password `<div>` and the Confirm password `<div>`) with:

```tsx
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compiles clean.
Manual check: after signup you land on `/dashboard`; after join you land on `/home`; the join password fields have working eye toggles.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/signup/page.tsx" "src/app/(auth)/join/page.tsx"
git commit -m "feat(auth): auto sign-in after signup/join and add join password toggles"
```

---

### Task 4: Self-service Change password

Adds a `changePassword` server action (verify current via bcrypt, min 8, hash + store) surfaced through a "Change password" item in the existing hand-rolled user menu, opening a form dialog built on `@radix-ui/react-dialog` directly (matching the designer's Print Panel modal styling — see the Dialog approach note in the interfaces section). The user menu is used by both coach and player layouts, so this ships to all roles.

**Files:**
- Create: `src/lib/actions/account-actions.ts` (`changePassword`)
- Create: `src/components/account/change-password-dialog.tsx` (client — raw Radix Dialog)
- Modify: `src/components/layout/user-menu.tsx` (add the item + render the dialog — do NOT convert the menu to Radix; add to the existing pattern)
- Test: `tests/lib/actions/account-actions.test.ts`

**Interfaces:**
- Produces:
  - `changePassword(currentPassword: string, newPassword: string): Promise<void>` — throws `Error` on unauthorized / short / no-password / wrong-current.
  - `ChangePasswordDialog({ open, onOpenChange })`.

- [ ] **Step 1: Write the failing test for `changePassword`**

Create `tests/lib/actions/account-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

import { changePassword } from "@/lib/actions/account-actions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(db.user.findUnique);
const mockUpdate = vi.mocked(db.user.update);
const mockCompare = vi.mocked(bcrypt.compare);
const mockHash = vi.mocked(bcrypt.hash);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("changePassword", () => {
  it("throws when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(changePassword("old", "newpassword")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("rejects a new password shorter than 8 characters", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    await expect(changePassword("old", "short")).rejects.toThrow(/at least 8/);
  });

  it("rejects when the account has no password", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: null } as never);
    await expect(changePassword("old", "newpassword")).rejects.toThrow(
      /no password/i,
    );
  });

  it("rejects when the current password is wrong", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as never);
    mockCompare.mockResolvedValue(false as never);
    await expect(changePassword("wrong", "newpassword")).rejects.toThrow(
      /incorrect/i,
    );
  });

  it("hashes and stores the new password on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockFindUnique.mockResolvedValue({ id: "u1", password: "hash" } as never);
    mockCompare.mockResolvedValue(true as never);
    mockHash.mockResolvedValue("newhash" as never);
    await changePassword("old", "newpassword");
    expect(mockHash).toHaveBeenCalledWith("newpassword", 12);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "newhash" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/actions/account-actions.test.ts`
Expected: FAIL — module `@/lib/actions/account-actions` does not exist.

- [ ] **Step 3: Implement `changePassword`**

Create `src/lib/actions/account-actions.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    throw new Error("This account has no password set");
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hash },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/actions/account-actions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the Change Password dialog component (raw Radix)**

Create `src/components/account/change-password-dialog.tsx`. Note the dialog chrome (overlay + content + title + close) matches the designer's Print Panel modal (`designer/page.tsx:895-958`): `import * as Dialog from "@radix-ui/react-dialog"`, `bg-black/60 backdrop-blur-sm` overlay, `rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6` content.

```tsx
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/actions/account-actions";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success("Password updated.");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-white">
                Change password
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                Enter your current password and choose a new one.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Current password
              </label>
              <Input
                id="current-password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Confirm new password
              </label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Update password"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 6: Add the "Change password" item to the user menu**

In `src/components/layout/user-menu.tsx`:

Update the lucide import (`:6`) and add the dialog import:

```tsx
import { LogOut, Lock } from "lucide-react";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
```

Add a dialog-open state next to `const [open, setOpen] = useState(false);` (`:18`):

```tsx
  const [pwOpen, setPwOpen] = useState(false);
```

Add a "Change password" button immediately before the "Sign out" button (before the `<button onClick={() => signOut(...)}` at `:65`):

```tsx
            <button
              onClick={() => { setOpen(false); setPwOpen(true); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <Lock className="h-4 w-4" />
              Change password
            </button>
```

Render the dialog just before the closing `</div>` of the root `<div ref={ref} ...>` (after the `</AnimatePresence>` at `:74`):

```tsx
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
```

> The Radix Dialog renders through a Portal, so it is not clipped by the menu's `overflow`/positioning. `useToast` resolves against the app-wide `ToastProvider` in `src/app/layout.tsx:37`.

- [ ] **Step 7: Run the suite and build**

Run: `npm run test:run`
Expected: PASS (all + 5 new).
Run: `npm run build`
Expected: compiles clean.
Manual check: user avatar menu → "Change password" opens the dialog; wrong current password shows an inline error; success shows a toast and closes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/actions/account-actions.ts src/components/account/change-password-dialog.tsx src/components/layout/user-menu.tsx tests/lib/actions/account-actions.test.ts
git commit -m "feat(account): add self-service change-password dialog"
```

---

### Task 5: Coach-mediated password reset from the Roster

Roster player cards get a "Reset password" action → coach-only server action generates a readable temp password, stores its bcrypt hash on `User.password`, and returns the plaintext once for display in a dialog with a copy button. Temp-password generation is a pure helper (it must live outside the `"use server"` module, which may only export async functions).

**Files:**
- Create: `src/lib/temp-password.ts` (`generateTempPassword`)
- Modify: `src/lib/actions/roster-actions.ts` (add `resetMemberPassword`)
- Create: `src/components/roster/player-card.tsx` (client — card + dropdown + reset dialog)
- Modify: `src/app/(coach)/roster/page.tsx:90-135` (render `PlayerCard` for player rows)
- Test: `tests/lib/temp-password.test.ts`, `tests/lib/actions/roster-actions.test.ts`

**Interfaces:**
- Consumes: `requireOrgAccess(orgId, { coach: true })` from `@/lib/authz` (plan 1a).
- Produces:
  - `generateTempPassword(length?: number): string` (default length 10, unambiguous alphabet).
  - `resetMemberPassword(membershipId: string): Promise<{ tempPassword: string }>` — throws on missing membership, non-coach caller (via `requireOrgAccess`), or non-player target.
  - `PlayerCard({ membershipId, name, email, position, playsStudied, lastActiveLabel })`.

> **Safety scope (verified):** Reset is allowed only when the target membership `role === "player"` (schema `MemberRole`: owner/coach/coordinator/player). This prevents resetting another coach's or owner's password. `User.password` exists (`schema.prisma:109`).

- [ ] **Step 1: Write the failing test for `generateTempPassword`**

Create `tests/lib/temp-password.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateTempPassword } from "@/lib/temp-password";

describe("generateTempPassword", () => {
  it("returns a 10-character password by default", () => {
    expect(generateTempPassword()).toHaveLength(10);
  });

  it("respects a custom length", () => {
    expect(generateTempPassword(16)).toHaveLength(16);
  });

  it("only uses the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTempPassword()).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/,
      );
    }
  });

  it("produces different values on successive calls", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/temp-password.test.ts`
Expected: FAIL — module `@/lib/temp-password` does not exist.

- [ ] **Step 3: Implement `generateTempPassword`**

Create `src/lib/temp-password.ts`:

```ts
import { randomInt } from "node:crypto";

// Unambiguous alphabet: no O/0, I/l/1 confusion for a password read aloud/typed.
const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/temp-password.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for `resetMemberPassword`**

Create `tests/lib/actions/roster-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
    user: { update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requireOrgAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { resetMemberPassword } from "@/lib/actions/roster-actions";
import { db } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import bcrypt from "bcryptjs";

const mockFindUnique = vi.mocked(db.membership.findUnique);
const mockUserUpdate = vi.mocked(db.user.update);
const mockRequireOrgAccess = vi.mocked(requireOrgAccess);
const mockHash = vi.mocked(bcrypt.hash);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resetMemberPassword", () => {
  it("throws when the membership does not exist", async () => {
    mockFindUnique.mockResolvedValue(null as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/not found/i);
    expect(mockRequireOrgAccess).not.toHaveBeenCalled();
  });

  it("enforces coach access on the target org", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockHash.mockResolvedValue("hashed" as never);
    await resetMemberPassword("m1");
    expect(mockRequireOrgAccess).toHaveBeenCalledWith("org1", { coach: true });
  });

  it("refuses to reset a non-player (coach/owner) password", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "coach",
    } as never);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/only player/i);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("stores the hashed temp password and returns the plaintext once", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockHash.mockResolvedValue("hashed" as never);
    const { tempPassword } = await resetMemberPassword("m1");
    expect(tempPassword).toHaveLength(10);
    expect(mockHash).toHaveBeenCalledWith(tempPassword, 12);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed" },
    });
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/lib/actions/roster-actions.test.ts`
Expected: FAIL — `resetMemberPassword` is not exported from `roster-actions.ts`.

- [ ] **Step 7: Implement `resetMemberPassword`**

In `src/lib/actions/roster-actions.ts`, add these imports at the top (below the existing imports):

```ts
import bcrypt from "bcryptjs";
import { requireOrgAccess } from "@/lib/authz";
import { generateTempPassword } from "@/lib/temp-password";
```

Append this action at the end of the file:

```ts
export async function resetMemberPassword(
  membershipId: string,
): Promise<{ tempPassword: string }> {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Membership not found");

  await requireOrgAccess(membership.orgId, { coach: true });

  if (membership.role !== "player") {
    throw new Error("Only player passwords can be reset");
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  await db.user.update({
    where: { id: membership.userId },
    data: { password: hash },
  });

  return { tempPassword };
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run tests/lib/actions/roster-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Create the `PlayerCard` client component**

Create `src/components/roster/player-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MoreVertical, KeyRound, Copy, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";
import { resetMemberPassword } from "@/lib/actions/roster-actions";

interface PlayerCardProps {
  membershipId: string;
  name: string;
  email: string;
  position: string | null;
  playsStudied: number;
  lastActiveLabel: string | null;
}

export function PlayerCard({
  membershipId,
  name,
  email,
  position,
  playsStudied,
  lastActiveLabel,
}: PlayerCardProps) {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initial = (name || email || "?")[0]?.toUpperCase() ?? "?";

  function openResetDialog() {
    setTempPassword(null);
    setError(null);
    setDialogOpen(true);
  }

  async function handleReset() {
    setLoading(true);
    setError(null);
    try {
      const result = await resetMemberPassword(membershipId);
      setTempPassword(result.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success("Password copied.");
    } catch {
      toast.error("Copy failed — select and copy the password manually.");
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold leading-none text-emerald-400">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {name || "Unnamed"}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {position && <span className="truncate">{position}</span>}
            <span>{playsStudied} plays studied</span>
          </div>
          {lastActiveLabel && (
            <p className="text-xs text-zinc-600">Last active: {lastActiveLabel}</p>
          )}
        </div>
        <DropdownMenu
          trigger={
            <button
              aria-label={`Actions for ${name || "player"}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={openResetDialog}>
            <KeyRound className="h-4 w-4" />
            Reset password
          </DropdownItem>
        </DropdownMenu>
      </CardContent>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">
                  Reset player password
                </Dialog.Title>
                {!tempPassword && (
                  <Dialog.Description className="mt-1 text-sm text-zinc-400">
                    Generate a new temporary password for {name || "this player"}. Their current password will stop working.
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {tempPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Share this password with the player. It won&apos;t be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white">
                    {tempPassword}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setDialogOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
```

- [ ] **Step 10: Render `PlayerCard` in the roster page**

In `src/app/(coach)/roster/page.tsx`, add the import (below the existing component imports):

```tsx
import { PlayerCard } from "@/components/roster/player-card";
```

Replace the players grid (`:90-135`, the `<div className="grid ...">{players.map(...)}</div>` block) with:

```tsx
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
              const playsStudied = player.user.playerProgress.length;
              const lastActive = player.user.playerProgress.reduce<Date | null>(
                (latest, pp) => {
                  if (!pp.lastViewedAt) return latest;
                  if (!latest || pp.lastViewedAt > latest) return pp.lastViewedAt;
                  return latest;
                },
                null,
              );
              const lastActiveLabel = lastActive
                ? lastActive.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <PlayerCard
                  key={player.id}
                  membershipId={player.id}
                  name={player.user.name ?? ""}
                  email={player.user.email}
                  position={player.position}
                  playsStudied={playsStudied}
                  lastActiveLabel={lastActiveLabel}
                />
              );
            })}
          </div>
```

> Note: `player.id` is the **membership** id (the map is over `getRoster` memberships), which is exactly what `resetMemberPassword(membershipId)` expects.

- [ ] **Step 11: Run the suite and build**

Run: `npm run test:run`
Expected: PASS (all + 8 new across the two files).
Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 12: Commit**

```bash
git add src/lib/temp-password.ts src/lib/actions/roster-actions.ts "src/components/roster/player-card.tsx" "src/app/(coach)/roster/page.tsx" tests/lib/temp-password.test.ts tests/lib/actions/roster-actions.test.ts
git commit -m "feat(roster): coach-mediated player password reset with one-time temp password"
```

---

### Task 6: Home empty-state copy

On-team players who have no assigned plays currently see "Ask your coach for an invite code to join a team" — wrong, since they are already on a team (the page redirects unauthenticated/unaffiliated users first). Change it to reassuring, accurate copy.

**Files:**
- Modify: `src/app/(player)/home/page.tsx:104-109`

- [ ] **Step 1: Update the copy**

In `src/app/(player)/home/page.tsx`, replace the empty-state text block (`:104-109`):

```tsx
              <div className="text-[11px] font-semibold text-amber-400">
                NO PLAYS ASSIGNED
              </div>
              <div className="mt-1 text-sm font-medium text-white">
                Ask your coach for an invite code to join a team.
              </div>
```

with:

```tsx
              <div className="text-[11px] font-semibold text-amber-400">
                NO PLAYS ASSIGNED
              </div>
              <div className="mt-1 text-sm font-medium text-white">
                Your coach hasn&apos;t assigned any plays yet. Check back soon.
              </div>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(player)/home/page.tsx"
git commit -m "fix(home): correct empty-state copy for on-team players with no plays"
```

---

### Task 7: Notifications wiring (coach + player) with dedupe-safe ids

The notification generators exist but are unused; the bell renders with no data. Wire coach and player layouts to feed the bell. **Critical fix:** the generators currently mint ids with `Date.now()` + a counter, so re-running them on every navigation produces new ids — the bell dedupes by id, so unstable ids would spam duplicates and reset read-state on every page change. Replace them with content-stable ids so re-generation is idempotent (this also makes the bell's localStorage read-state actually persist).

**Files:**
- Modify: `src/lib/notifications.ts` (deterministic ids; remove `nextId`/`notifCounter`)
- Modify: `src/lib/actions/quiz-actions.ts` (add `getAttemptedQuizIds`)
- Modify: `src/app/(coach)/layout.tsx` (fetch analytics → notifications → sidebar)
- Modify: `src/components/layout/coach-sidebar.tsx` (accept `notifications` prop → bell)
- Modify: `src/app/(player)/layout.tsx` (fetch progress + quizzes + attempts → map → bell)
- Test: `tests/lib/notifications.test.ts`

**Interfaces:**
- Consumes (verified structural compatibility — pass through, no re-mapping needed except `QuizInfo.attempted`):
  - `getTeamAnalytics(orgId)` returns an object assignable to `TeamAnalytics` — `inactivePlayers` elements carry `{ id, name, lastActive }` (plus extra fields, allowed); `name` is `m.user.name ?? m.user.email` which is a non-null `string` since `User.email` is required.
  - `getPlayerProgress(userId)` rows are assignable to `PlayerProgress[]` — `playId`/`views`/`nextReviewAt` (non-null, `@default(now())`)/`masteryLevel` (enum → `string`) all present.
  - `getPlayerQuizzes(orgId)` does **NOT** provide `attempted` → must be derived (see below).
- Produces:
  - `getAttemptedQuizIds(userId: string): Promise<string[]>`
  - `generateCoachNotifications` / `generatePlayerNotifications` with stable ids.
  - `CoachSidebar({ notifications? })`.

> **Shape mismatch (the one real one — #7):** `QuizInfo` requires `attempted: boolean`, but `getPlayerQuizzes` returns no attempt info. We add a small `getAttemptedQuizIds` action and map it in the player layout. Passing `attempted: false` for all would perpetually notify about already-completed quizzes, so this derivation is required, not cosmetic.

- [ ] **Step 1: Write the failing test for stable ids**

Create `tests/lib/notifications.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  generateCoachNotifications,
  generatePlayerNotifications,
  type TeamAnalytics,
  type PlayerProgress,
  type QuizInfo,
} from "@/lib/notifications";

const analytics: TeamAnalytics = {
  gamePlanName: "Week 1",
  installCompletion: 40,
  avgQuizScore: 55,
  inactivePlayers: [{ id: "p1", name: "Sam", lastActive: null }],
  totalPlays: 12,
};

describe("generateCoachNotifications", () => {
  it("produces stable, unique ids across identical calls (dedupe-safe)", () => {
    const a = generateCoachNotifications(analytics).map((n) => n.id);
    const b = generateCoachNotifications(analytics).map((n) => n.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("emits inactive, low-score, and install notifications for this input", () => {
    const ids = generateCoachNotifications(analytics).map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "coach:inactive",
        "coach:low-quiz",
        "coach:install",
      ]),
    );
  });
});

describe("generatePlayerNotifications", () => {
  const past = new Date(Date.now() - 86_400_000);
  const progress: PlayerProgress[] = [
    { playId: "a", masteryLevel: "learning", nextReviewAt: past, views: 2 },
    { playId: "b", masteryLevel: "new_play", nextReviewAt: past, views: 0 },
  ];
  const quizzes: QuizInfo[] = [
    { id: "q1", name: "Coverages", dueDate: null, attempted: false },
  ];

  it("produces stable, unique ids across identical calls", () => {
    const a = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    const b = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("flags due reviews, available quizzes, and new plays", () => {
    const ids = generatePlayerNotifications(progress, quizzes).map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "player:due-review",
        "player:quiz-available",
        "player:new-plays",
      ]),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/notifications.test.ts`
Expected: FAIL — ids are currently `notif_<timestamp>_<n>`, so the two id arrays differ.

- [ ] **Step 3: Make notification ids deterministic**

In `src/lib/notifications.ts`:

Delete the `nextId` machinery (`:33-37`):

```ts
let notifCounter = 0;
function nextId(): string {
  notifCounter++;
  return `notif_${Date.now()}_${notifCounter}`;
}
```

Then replace each `id: nextId(),` with a content-stable id:
- In `generateCoachNotifications`: the inactive-players push → `id: "coach:inactive",`; the low-quiz-score push → `id: "coach:low-quiz",`; the install-progress push → `id: "coach:install",`.
- In `generatePlayerNotifications`: the due-for-review push → `id: "player:due-review",`; the quiz-available push → `id: "player:quiz-available",`; the new-plays push → `id: "player:new-plays",`.

(Each generator emits at most one of each kind per run, so these ids are unique within a run and identical across runs.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/notifications.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add `getAttemptedQuizIds`**

Append to `src/lib/actions/quiz-actions.ts`:

```ts
export async function getAttemptedQuizIds(userId: string): Promise<string[]> {
  const attempts = await db.quizAttempt.findMany({
    where: { userId },
    select: { quizId: true },
  });
  return [...new Set(attempts.map((a) => a.quizId))];
}
```

- [ ] **Step 6: Wire the coach layout**

In `src/app/(coach)/layout.tsx`, add imports (below the existing imports):

```tsx
import { getTeamAnalytics } from "@/lib/actions/analytics-actions";
import { generateCoachNotifications } from "@/lib/notifications";
```

After the `membership` guard (`:22-25`), compute notifications:

```tsx
  const analytics = await getTeamAnalytics(membership.orgId);
  const notifications = generateCoachNotifications(analytics);
```

Change the sidebar render (`:29`) from `<CoachSidebar />` to:

```tsx
      <CoachSidebar notifications={notifications} />
```

- [ ] **Step 7: Thread the prop through `CoachSidebar` to the bell**

In `src/components/layout/coach-sidebar.tsx`:

Add the type import (below the `NotificationBell` import at `:23`):

```tsx
import type { Notification } from "@/lib/notifications";
```

Change the component signature (`:69`) from `export function CoachSidebar() {` to:

```tsx
export function CoachSidebar({
  notifications,
}: {
  notifications?: Notification[];
}) {
```

Change the bell render (`:150`) from `<NotificationBell />` to:

```tsx
          <NotificationBell incoming={notifications} />
```

- [ ] **Step 8: Wire the player layout**

In `src/app/(player)/layout.tsx`, add imports (below the existing imports):

```tsx
import { getPlayerProgress } from "@/lib/actions/progress-actions";
import { getPlayerQuizzes, getAttemptedQuizIds } from "@/lib/actions/quiz-actions";
import {
  generatePlayerNotifications,
  type Notification,
  type QuizInfo,
} from "@/lib/notifications";
```

After the coach-redirect guard (`:23-26`), build the notifications (guarded by membership, since a player without a membership reaches this layout):

```tsx
  let notifications: Notification[] = [];
  if (membership) {
    const [progress, quizzes, attemptedIds] = await Promise.all([
      getPlayerProgress(session.user.id),
      getPlayerQuizzes(membership.orgId),
      getAttemptedQuizIds(session.user.id),
    ]);
    const attempted = new Set(attemptedIds);
    const quizInfos: QuizInfo[] = quizzes.map((q) => ({
      id: q.id,
      name: q.name,
      dueDate: q.dueDate,
      attempted: attempted.has(q.id),
    }));
    notifications = generatePlayerNotifications(progress, quizInfos);
  }
```

Change the bell render (`:38`) from `<NotificationBell />` to:

```tsx
          <NotificationBell incoming={notifications} />
```

- [ ] **Step 9: Run the suite and build**

Run: `npm run test:run`
Expected: PASS (all + 4 new).
Run: `npm run build`
Expected: compiles clean.
Manual check: as a coach with an inactive/low-score/incomplete-install team the bell shows a badge; navigating between coach pages does NOT duplicate notifications and read-state persists. Same for a player with due reviews / pending quizzes / new plays.

- [ ] **Step 10: Commit**

```bash
git add src/lib/notifications.ts src/lib/actions/quiz-actions.ts "src/app/(coach)/layout.tsx" src/components/layout/coach-sidebar.tsx "src/app/(player)/layout.tsx" tests/lib/notifications.test.ts
git commit -m "feat(notifications): wire coach + player bells with dedupe-safe stable ids"
```

---

## Self-Review

**1. Spec coverage (Phase 1 spec §3, the whole of this plan's scope):**
- Quiz finish routing (`/quizzes` → `/quiz`) → Task 1, Step 6.
- Quiz reward feedback (XP + new badges) → Task 1.
- Join with existing email (compare / 401 / 409) → Task 2.
- Auto sign-in after signup + join → Task 3.
- Password reset (coach-mediated) → Task 5; Change password (all roles) → Task 4.
- Home empty-state copy → Task 6.
- Notifications wiring (coach + player) → Task 7.
- Join password visibility toggle → Task 3, Step 3.

Every §3 bullet maps to a task. Bell localStorage read-state mechanism is unchanged (Task 7 only stabilizes ids, which is what makes that mechanism function).

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every code step shows complete code. All error messages, class strings, and file paths are literal.

**3. Type consistency:**
- `RewardBadge` is defined in Task 1 (`gamification.ts`) and consumed by `submitQuizAttempt` (Task 1); `quiz-flow.tsx` uses a structurally identical inline shape.
- `resolveJoinUser` signature in Task 2's test matches the implementation and the route call (`compare` injected as `(plain, hash) => bcrypt.compare(plain, hash)`).
- `changePassword(current, new)` and `resetMemberPassword(membershipId) → { tempPassword }` are used identically in their dialogs.
- `Dialog({ open, onOpenChange, title, description?, children })` — same prop shape in `change-password-dialog.tsx` and `player-card.tsx`.
- `Notification` / `TeamAnalytics` / `PlayerProgress` / `QuizInfo` types are imported from `@/lib/notifications`; `CoachSidebar`'s new `notifications?: Notification[]` prop matches the coach layout's `generateCoachNotifications` return.

**Discoveries / deviations (report to lead):**
1. `src/components/ui/dialog.tsx` does **not** exist (the brief originally assumed it did; lead corrected this). Per the lead, this plan does NOT create a shared wrapper — the form/display dialogs in Task 4 (change-password) and Task 5 (reset-password display) import `@radix-ui/react-dialog` directly, matching the designer Print Panel modal styling (`designer/page.tsx:895-958`). Plan 1d separately owns `src/components/ui/confirm-dialog.tsx` for confirmations (a different concern) — not consumed here.
2. The notification bell lives at `src/components/ui/notification-bell.tsx` (not `layout/`), takes `incoming?: Notification[]`, and dedupes by id. `CoachSidebar` renders it with **no props and itself takes no props** — Task 7 threads a new `notifications` prop through.
3. **Only real shape mismatch:** `getPlayerQuizzes` produces no `attempted` field required by `QuizInfo`; Task 7 adds `getAttemptedQuizIds` and maps it. `getTeamAnalytics → TeamAnalytics` and `getPlayerProgress → PlayerProgress[]` are structurally assignable and pass through directly (verified against schema: `User.email` non-null, `PlayerProgress.nextReviewAt` non-null).
4. **Latent bug surfaced by wiring:** unstable `Date.now()` notification ids would spam duplicates on every navigation and reset read-state. Task 7 makes ids content-stable — a small change to `notifications.ts` beyond bare "wiring," but required for the feature to work.
5. `generateTempPassword` had to be extracted to a non-`"use server"` module (`src/lib/temp-password.ts`) because `"use server"` files may only export async functions.
6. Cross-plan dependency: Task 5 imports `requireOrgAccess` from `@/lib/authz` (plan 1a) — 1a must land first.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-02-phase1c-player-loops.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration (REQUIRED SUB-SKILL: superpowers:subagent-driven-development).
2. **Inline Execution** — execute tasks in this session with checkpoints (REQUIRED SUB-SKILL: superpowers:executing-plans).
