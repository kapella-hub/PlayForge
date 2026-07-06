# PlayForge Phase 3a — Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Burn down the Phase 1–2 follow-up backlog: close a set of small, pre-diagnosed security/correctness, performance, UX, visual/a11y, lint, cleanup, and test-rigor gaps on `phase-3a-hardening`.

**Architecture:** Server-action authz is already centralized in `@/lib/authz` (resolver functions that throw `AuthzError`); the design token system lives in `src/app/globals.css` with a `@theme inline` bridge; tests are vitest suites under `tests/` mirroring `src/`, mocking `@/lib/db`, `@/lib/auth`, and `@/lib/authz`. This plan makes surgical edits within those established patterns — no new subsystems.

**Tech Stack:** Next 16 (App Router, RSC), React 19, Prisma 7 (postgres adapter), NextAuth 5 beta, Tailwind v4, Radix UI, framer-motion, Konva/react-konva, vitest + @testing-library/react.

## Global Constraints

- **Branch:** `phase-3a-hardening`, stacked on `phase-2-design-system`. Do not rebase or retarget.
- **Per-task verification quartet (run ALL, in this order):**
  1. `npm run test:run` — green. Baseline **161** passing; count only grows.
  2. `npx tsc --noEmit` — clean.
  3. `npm run lint` — error count **ratchets down, never up**. Baseline **7 errors**. Expected running count is stated in each task's final step.
  4. `npm run build` — succeeds.
- **Lint budget:** baseline 7 errors → **5** after Task 1 → **0** after Task 11 → stays 0 for Tasks 12–14. Warnings may remain; only *errors* are gated.
- **No `eslint-disable` unless a rule is genuinely wrong for the case, and then with a one-line justification comment.** The only sanctioned disables in this plan are the two in Task 1 (notification-bell), justified inline.
- **Engine behavior is frozen:** lint fixes in `src/engine/**` (`play-canvas.tsx`) must not change canvas behavior — only declaration order / dependency arrays.
- **Behavior preservation for perf refactors:** the light coach-notification query (Task 6) must produce the *same* `installCompletion` and `inactivePlayers` as `getTeamAnalytics` does today.
- **DB / migration:** the dev database runs via `docker compose -f docker-compose.dev.yml up -d`. Migrations use `npx prisma migrate dev`. After any schema change: **migrate → generate → tsc** (in that order).
- **Money-quote copy is verbatim:** user-facing strings in this plan (banner text, toast text, refusal messages) are copied exactly from the spec and must not be paraphrased.
- **SPEC CORRECTION (accent-foreground):** the spec/task-brief prescribe `--accent-foreground: #1c1409` in **both** palettes. That value **fails WCAG AA in the light theme** (`#1c1409` on light `--accent: #b45309` = **3.63**, below 4.5), so the contrast test this plan adds would fail. The math is forced: light `#b45309` (luminance ≈0.16) needs a *near-white* foreground; dark `#d97706` needs a *near-black* one. This plan therefore uses a **theme split**: `:root { --accent-foreground: #1c1409 }` (dark ink, 5.71 on dark accent) and `.light { --accent-foreground: #ffffff }` (white, 5.02 on light accent). Both clear AA. See Task 10.

---

## File map (what each task touches)

| Task | Section | Primary files |
| --- | --- | --- |
| 1 | §1 | `src/components/ui/notification-bell.tsx`, `src/components/layout/coach-sidebar.tsx`, `src/app/(coach)/layout.tsx`, `src/app/(player)/layout.tsx` |
| 2 | §1 | `src/app/api/auth/join/route.ts`, `src/app/api/ai/generate-play/route.ts` |
| 3 | §1 | `src/lib/actions/progress-actions.ts`, `tests/lib/actions/progress-actions.test.ts` (new) |
| 4 | §1 | `src/lib/actions/quiz-actions.ts`, `tests/lib/actions/quiz-actions.test.ts` |
| 5 | §1 | `src/lib/actions/roster-actions.ts`, `tests/lib/actions/roster-actions.test.ts` |
| 6 | §2 | `src/lib/actions/analytics-actions.ts`, `src/lib/notifications.ts`, `src/app/(coach)/layout.tsx` |
| 7 | §2 | `prisma/schema.prisma`, `prisma/migrations/**` |
| 8 | §3 | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/join/page.tsx` |
| 9 | §3 | `src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx`, `create-game-plan-dialog.tsx`, `game-plan-actions.ts`, `designer/page.tsx`, `settings/files/page.tsx` |
| 10 | §4 | `src/app/globals.css`, `tests/lib/contrast.test.ts`, `designer/page.tsx`, `progress/page.tsx`, `play-toolbar.tsx`, `src/lib/qr.ts`, `invite-code-card.tsx` |
| 11 | §5 | `play-library.tsx`, `play-canvas.tsx`, `dashboard-client.tsx`, `theme-provider.tsx`, `version-history.tsx` |
| 12 | §6 | `quiz-actions.ts`, `game-plan-actions.ts`, `practice-actions.ts`, `confirm-dialog.tsx`, `tests/components/ui/confirm-dialog.test.tsx` (new) |
| 13 | §7 | `tests/lib/authz.test.ts`, `tests/lib/streak.test.ts`, `tests/lib/gamification.test.ts`, `tests/lib/quiz-score.test.ts`, `tests/lib/actions/team-file-actions.test.ts` |
| 14 | close | grep gates + full quartet + QA checklist |

---

### Task 1: Notification bell — user-scoped storage (§1) + its two lint errors (§5)

The bell keys `localStorage` by a global constant, so notifications leak across accounts sharing a browser. Scope the key by `userId`, threaded as a prop from the two layouts (both server components that already hold the session). This task also resolves the bell's two `react-hooks/set-state-in-effect` lint errors: these two effects are the legitimate "read/merge client-only persisted state after mount to stay hydration-safe" pattern (the component SSRs with an empty list to match the server, then loads/merges on the client). Converting them to `useSyncExternalStore` cannot preserve the intricate read-state/clear/merge semantics without behavior changes, so a justified `eslint-disable-next-line` on each is the correct call here.

**Files:**
- Modify: `src/components/ui/notification-bell.tsx`
- Modify: `src/components/layout/coach-sidebar.tsx`
- Modify: `src/app/(coach)/layout.tsx`
- Modify: `src/app/(player)/layout.tsx`

**Interfaces:**
- Produces: `NotificationBell({ userId, incoming }: { userId: string; incoming?: Notification[] })` — `userId` is now required.
- Produces: `CoachSidebar({ userId, notifications }: { userId: string; notifications?: Notification[] })` — `userId` is now required and forwarded to the bell.

**Note:** the coach's bell is rendered by `CoachSidebar` (`coach-sidebar.tsx:155` → `<NotificationBell incoming={notifications} />`), NOT directly in the coach layout. Because `userId` becomes a required prop, the coach layout must pass it into `CoachSidebar`, which forwards it to the bell — otherwise `tsc` fails on a missing prop AND the coach bell stays unscoped (defeating the fix).

- [ ] **Step 1: Scope the bell's storage key by userId + accept the prop**

In `src/components/ui/notification-bell.tsx`, replace the storage constant and both storage helpers (lines 9–24) and the component signature/effects (lines 32–44) so the key is per-user and the two mount/merge effects carry a justification for their intentional post-mount setState.

Replace lines 9–24 (the `STORAGE_KEY` const through `saveNotifications`):

```tsx
const KEY_PREFIX = "playforge_notifications";

function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`;
}

function loadNotifications(userId: string): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(userId: string, notifications: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(notifications));
}
```

Replace the component signature + first two effects (lines 32–44 through the `setNotifications((prev) => {` opener):

```tsx
export function NotificationBell({
  userId,
  incoming,
}: {
  userId: string;
  incoming?: Notification[];
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Load persisted notifications on mount. Client-only: the component SSRs with
  // an empty list to match the server, so this post-mount setState is required
  // for hydration safety, not a cascading-render bug.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setNotifications(loadNotifications(userId));
  }, [userId]);

  // Merge incoming: add new ids, refresh content on existing ids (keep read state
  // unless the message actually changed), keep history for ids no longer incoming.
  // Same client-only persisted-store sync as above; the merge is intentionally stateful.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!incoming?.length) return;
    setNotifications((prev) => {
```

- [ ] **Step 2: Pass `userId` into the two `saveNotifications` call sites inside the component**

Still in `notification-bell.tsx`, `saveNotifications` is called in the merge effect and in `markRead`/`markAllRead`/`clearAll`. Update every call to pass `userId` first:

- In the merge effect: `saveNotifications(merged);` → `saveNotifications(userId, merged);`
- In `markRead`: `saveNotifications(updated);` → `saveNotifications(userId, updated);`
- In `markAllRead`: `saveNotifications(updated);` → `saveNotifications(userId, updated);`
- In `clearAll`: `saveNotifications([]);` → `saveNotifications(userId, []);`

- [ ] **Step 3: Thread `userId` from the player layout**

In `src/app/(player)/layout.tsx`, the bell is rendered at line 62. The session is available as `session.user.id`. Change:

```tsx
<NotificationBell incoming={notifications} />
```
to:
```tsx
<NotificationBell userId={session.user.id} incoming={notifications} />
```

- [ ] **Step 4: Thread `userId` through `CoachSidebar` to the coach bell**

`CoachSidebar` renders the coach's `NotificationBell` (line 155). Add a required `userId` prop and forward it.

In `src/components/layout/coach-sidebar.tsx`, change the component signature (lines 70–74):
```tsx
export function CoachSidebar({
  userId,
  notifications,
}: {
  userId: string;
  notifications?: Notification[];
}) {
```
Forward it to the bell (line 155):
```tsx
          <NotificationBell userId={userId} incoming={notifications} />
```

In `src/app/(coach)/layout.tsx`, pass `userId` into the sidebar (line 34). The session was validated at line 20, so `session.user.id` is available:
```tsx
      <CoachSidebar userId={session.user.id} notifications={notifications} />
```

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run   # 161 passing
npx tsc --noEmit   # clean — CoachSidebar now supplies the required userId prop
npm run lint       # 5 errors (was 7 — notification-bell's 2 are now disabled with justification)
npm run build      # succeeds
```
Expected lint: the two `notification-bell.tsx:37/44` errors are gone; 5 errors remain (`dashboard-client`, `play-library`, `version-history`, `theme-provider`, `play-canvas`).

```bash
git add src/components/ui/notification-bell.tsx src/components/layout/coach-sidebar.tsx "src/app/(coach)/layout.tsx" "src/app/(player)/layout.tsx"
git commit -m "fix: scope notification storage by userId (player + coach bells); silence intentional bell effects"
```

---

### Task 2: Join create-race + AI route logging (§1)

Two API-route catch-block hardenings. `join` can 500 on a concurrent user-create; catch Prisma `P2002` and return the friendly 409. `generate-play` swallows server errors silently; log them server-side (client message stays generic).

**Files:**
- Modify: `src/app/api/auth/join/route.ts`
- Modify: `src/app/api/ai/generate-play/route.ts`

- [ ] **Step 1: Import the Prisma namespace in the join route**

In `src/app/api/auth/join/route.ts`, add the `Prisma` import under the existing imports (after line 4):

```tsx
import { Prisma } from "@prisma/client";
```

- [ ] **Step 2: Catch P2002 in the join route's catch block**

Replace the catch block (lines 88–94):

```tsx
  } catch (error) {
    // Concurrent create of the same email loses the unique race → friendly 409,
    // matching the "already a member"/duplicate path rather than a 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    }
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
```

- [ ] **Step 3: Log server-side in the generate-play catch block**

In `src/app/api/ai/generate-play/route.ts`, the catch block returns generic messages but never logs. Add a `console.error` **after** the `AuthzError` early-return (an `AuthzError` is an expected 403, not worth logging) and before computing `message`. Replace lines 51–65:

```tsx
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: "Only coaches can generate plays." },
        { status: 403 },
      );
    }
    console.error("generate-play failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate play";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json(
      { error: "Play generation failed. Please try again." },
      { status },
    );
  }
```

- [ ] **Step 4: Confirm the AI-route test still passes**

`tests/api/ai/generate-play.test.ts` exercises the catch path. The added `console.error` writes to stderr but changes no response. Run just that file to confirm no assertion depends on a silent console:

```bash
npx vitest run tests/api/ai/generate-play.test.ts
```
Expected: PASS. (If a test asserts `console.error` was NOT called, spy-and-restore is out of scope — the response contract is unchanged; leave the log.)

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected lint: **5 errors** (unchanged).

```bash
git add "src/app/api/auth/join/route.ts" "src/app/api/ai/generate-play/route.ts"
git commit -m "fix: 409 on join create-race (P2002); log generate-play failures server-side"
```

---

### Task 3: Progress writes org-scoped + `recordQuizScore` client param (§1)

`recordPlayView`/`recordQuizScore` take an arbitrary `playId` and only check `session.user.id`, so a member can write progress against a foreign play. Route both through `requirePlayAccess(playId)` (resolves org via play→playbook→orgId and throws bare `AuthzError` for unknown/foreign ids), sourcing `userId` from the returned membership. Additionally, `recordQuizScore` gains an optional Prisma client param (default `db`) so Task 4 can pass its transaction client.

**Files:**
- Modify: `src/lib/actions/progress-actions.ts`
- Create: `tests/lib/actions/progress-actions.test.ts`

**Interfaces:**
- Produces: `recordQuizScore(playId: string, score: number, client?: Prisma.TransactionClient)` — defaults to `db`; Task 4 passes a `tx`.
- Produces: `recordPlayView(playId: string)` — unchanged signature; now org-scoped.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/actions/progress-actions.test.ts`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  requirePlayAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {
    constructor(message = "Not authorized") {
      super(message);
      this.name = "AuthzError";
    }
  },
}));
vi.mock("@/lib/db", () => ({
  db: { playerProgress: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { recordPlayView, recordQuizScore } from "@/lib/actions/progress-actions";
import { db } from "@/lib/db";
import { requirePlayAccess, AuthzError } from "@/lib/authz";

const mockRequire = vi.mocked(requirePlayAccess);
const membership = { id: "m1", userId: "u1", orgId: "o1", role: "player" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordPlayView", () => {
  it("authorizes the play (org via playbook) before writing and derives userId from membership", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    vi.mocked(db.playerProgress.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.playerProgress.upsert).mockResolvedValue({ id: "pp1" } as never);

    await recordPlayView("p1");

    expect(mockRequire).toHaveBeenCalledWith("p1");
    expect(mockRequire.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.playerProgress.upsert).mock.invocationCallOrder[0],
    );
    const upsertArg = vi.mocked(db.playerProgress.upsert).mock.calls[0][0] as {
      where: { userId_playId: { userId: string; playId: string } };
    };
    expect(upsertArg.where.userId_playId).toEqual({ userId: "u1", playId: "p1" });
  });

  it("propagates AuthzError for a foreign/unknown play and never writes", async () => {
    mockRequire.mockRejectedValue(new AuthzError());
    await expect(recordPlayView("p1")).rejects.toBeInstanceOf(AuthzError);
    expect(db.playerProgress.upsert).not.toHaveBeenCalled();
  });
});

describe("recordQuizScore", () => {
  it("writes through the default db client when none is passed", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    vi.mocked(db.playerProgress.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.playerProgress.upsert).mockResolvedValue({ id: "pp1" } as never);

    await recordQuizScore("p1", 0.8);

    expect(mockRequire).toHaveBeenCalledWith("p1");
    expect(db.playerProgress.upsert).toHaveBeenCalledTimes(1);
  });

  it("writes through a provided transaction client instead of db", async () => {
    mockRequire.mockResolvedValue({ play: { id: "p1" }, membership } as never);
    const tx = {
      playerProgress: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: "pp1" }),
      },
    };

    await recordQuizScore("p1", 0.8, tx as never);

    expect(tx.playerProgress.upsert).toHaveBeenCalledTimes(1);
    expect(db.playerProgress.upsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/lib/actions/progress-actions.test.ts
```
Expected: FAIL (current `recordPlayView` calls `auth()`/`db` directly; `requirePlayAccess` is never called; `recordQuizScore` has no `client` param).

- [ ] **Step 3: Refactor `progress-actions.ts`**

Replace the top imports (lines 1–11) — drop the `auth` import, add `requirePlayAccess` and the `Prisma` type:

```tsx
"use server";

import { db } from "@/lib/db";
import {
  calculateNextReview,
  qualityFromScore,
  masteryFromInterval,
} from "@/lib/spaced-repetition/sm2";
import type { MasteryLevel, Prisma } from "@prisma/client";
import { requirePlayAccess } from "@/lib/authz";
```

Replace `recordPlayView` (lines 13–56) — authorize the play, then derive `userId` from the membership:

```tsx
export async function recordPlayView(playId: string) {
  const { membership } = await requirePlayAccess(playId);
  const userId = membership.userId;
  const now = new Date();

  const existing = await db.playerProgress.findUnique({
    where: { userId_playId: { userId, playId } },
  });

  const state = {
    easeFactor: existing?.easeFactor ?? 2.5,
    intervalDays: existing?.intervalDays ?? 0,
    repetition: existing ? (existing.intervalDays === 0 ? 0 : 1) : 0,
  };

  const next = calculateNextReview(state, 3);
  const nextReviewAt = new Date(
    now.getTime() + next.intervalDays * 24 * 60 * 60 * 1000,
  );

  return db.playerProgress.upsert({
    where: { userId_playId: { userId, playId } },
    create: {
      userId,
      playId,
      views: 1,
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
    update: {
      views: { increment: 1 },
      lastViewedAt: now,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
  });
}
```

Replace `recordQuizScore` (lines 58–102) — add the optional client param (default `db`), authorize the play, and read/write through `client`:

```tsx
export async function recordQuizScore(
  playId: string,
  score: number,
  client: Prisma.TransactionClient = db,
) {
  const { membership } = await requirePlayAccess(playId);
  const userId = membership.userId;
  const now = new Date();

  const existing = await client.playerProgress.findUnique({
    where: { userId_playId: { userId, playId } },
  });

  const quality = qualityFromScore(score);
  const state = {
    easeFactor: existing?.easeFactor ?? 2.5,
    intervalDays: existing?.intervalDays ?? 0,
    repetition: existing ? (existing.intervalDays === 0 ? 0 : 1) : 0,
  };

  const next = calculateNextReview(state, quality);
  const nextReviewAt = new Date(
    now.getTime() + next.intervalDays * 24 * 60 * 60 * 1000,
  );

  const quizScores = existing ? [...existing.quizScores, score] : [score];

  return client.playerProgress.upsert({
    where: { userId_playId: { userId, playId } },
    create: {
      userId,
      playId,
      quizScores: [score],
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
    update: {
      quizScores,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      nextReviewAt,
      masteryLevel: masteryFromInterval(next.intervalDays) as MasteryLevel,
    },
  });
}
```

Leave `getPlayerProgress`/`getDueForReview` unchanged.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run tests/lib/actions/progress-actions.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: tests ≥ **165** passing; lint **5 errors**.

```bash
git add src/lib/actions/progress-actions.ts tests/lib/actions/progress-actions.test.ts
git commit -m "fix: org-scope progress writes via requirePlayAccess; recordQuizScore takes optional client"
```

---

### Task 4: Transactional quiz reward (§1)

`submitQuizAttempt` runs before-snapshot → attempt write → per-play `recordQuizScore` → after-snapshot as separate statements, so a second tab reading mid-flight sees a torn reward delta. Wrap the whole sequence in an interactive `db.$transaction`, passing the `tx` client into `recordQuizScore` (from Task 3).

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts`
- Modify: `tests/lib/actions/quiz-actions.test.ts`

**Interfaces:**
- Consumes: `recordQuizScore(playId, score, client)` from Task 3.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/actions/quiz-actions.test.ts`. First extend the existing mocks — the current `vi.mock("@/lib/db", …)` only stubs `quiz.update/delete`. Replace that mock block (lines 3–7) with one that covers the transaction path, and add a mock for `progress-actions`:

```tsx
vi.mock("@/lib/db", () => {
  const tx = {
    playerProgress: { findMany: vi.fn().mockResolvedValue([]) },
    quizAttempt: { create: vi.fn().mockResolvedValue({ id: "a1" }) },
    quiz: {
      findUnique: vi.fn().mockResolvedValue({ id: "q1", questions: [] }),
    },
  };
  return {
    db: {
      quiz: { update: vi.fn(), delete: vi.fn() },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
// Mock via the alias: it resolves to the same absolute module as quiz-actions.ts's
// relative `./progress-actions` import, so vitest intercepts it.
vi.mock("@/lib/actions/progress-actions", () => ({ recordQuizScore: vi.fn() }));
```

Then add a new describe block at the end of the file:

```tsx
describe("submitQuizAttempt (transactional)", () => {
  it("runs snapshot/attempt/reward inside db.$transaction", async () => {
    const { submitQuizAttempt } = await import("@/lib/actions/quiz-actions");
    mockedRequire.mockResolvedValue({
      quiz: { id: "q1" },
      membership: { userId: "u1" },
    } as never);

    const result = await submitQuizAttempt({ quizId: "q1", answers: [] });

    expect(vi.mocked(db.$transaction)).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ xpEarned: 0, newBadges: [] });
    // the attempt write went through the tx client, not the root db
    expect((db as unknown as { __tx: { quizAttempt: { create: ReturnType<typeof vi.fn> } } }).__tx.quizAttempt.create).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/lib/actions/quiz-actions.test.ts
```
Expected: FAIL — `db.$transaction` is never called (current code uses bare `db.*`).

- [ ] **Step 3: Wrap `submitQuizAttempt` in a transaction**

In `src/lib/actions/quiz-actions.ts`, replace the body of `submitQuizAttempt` (lines 112–175). Keep the signature; move all reads/writes onto `tx` and pass `tx` into `recordQuizScore`:

```tsx
export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string; correct: boolean }[];
}): Promise<{ xpEarned: number; newBadges: RewardBadge[] }> {
  const { membership } = await requireQuizAccess(data.quizId);
  const userId = membership.userId;

  return db.$transaction(async (tx) => {
    // Snapshot stats BEFORE recording the attempt.
    const beforeRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true },
    });
    const beforeStats = playerStatsFromProgress(beforeRows);

    const correctCount = data.answers.filter((a) => a.correct).length;
    const score =
      data.answers.length > 0 ? correctCount / data.answers.length : 0;

    await tx.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId,
        score,
        answers: data.answers,
        completedAt: new Date(),
      },
    });

    // Update progress per play
    const quiz = await tx.quiz.findUnique({
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
        await recordQuizScore(playId, playScore, tx);
      }
    }

    // Snapshot stats AFTER, then return the reward delta.
    const afterRows = await tx.playerProgress.findMany({
      where: { userId },
      select: { views: true, masteryLevel: true, quizScores: true },
    });
    const afterStats = playerStatsFromProgress(afterRows);

    return computeQuizReward(beforeStats, afterStats);
  });
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run tests/lib/actions/quiz-actions.test.ts
```
Expected: PASS (existing update/delete tests + the new transaction test).

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: tests ≥ **166**; lint **5 errors**.

```bash
git add src/lib/actions/quiz-actions.ts tests/lib/actions/quiz-actions.test.ts
git commit -m "fix: run submitQuizAttempt snapshot/write/reward in one transaction"
```

---

### Task 5: Reset guard for multi-team players (§1)

`resetMemberPassword` rewrites the account-global `User.password`. Today it only refuses when the target holds an *elevated* role on another team; a plain player on two teams can still have their shared password reset out from under their other team. Refuse **any** target with more than one membership, and throw `AuthzError` (not bare `Error`) on the not-found and refusal paths, matching sibling actions. **This changes the existing "elevated role" test — update it.**

**Files:**
- Modify: `src/lib/actions/roster-actions.ts`
- Modify: `tests/lib/actions/roster-actions.test.ts`

- [ ] **Step 1: Update the failing/obsolete tests + add the new-refusal case**

In `tests/lib/actions/roster-actions.test.ts`:

Add `AuthzError` to the authz import (line 19):
```tsx
import { requireOrgAccess, AuthzError } from "@/lib/authz";
```

Replace the "not found" test (lines 36–42) so it asserts the AuthzError type + message:
```tsx
  it("throws AuthzError when the membership does not exist", async () => {
    mockFindUnique.mockResolvedValue(null as never);
    await expect(resetMemberPassword("m1")).rejects.toBeInstanceOf(AuthzError);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/not found/i);
    expect(mockRequireOrgAccess).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
```

Replace the "refuses to reset when the target is an owner/coach on another team" test (lines 95–117) with a version that reflects the new "any second membership" rule and message:
```tsx
  it("refuses to reset any player who belongs to more than one team", async () => {
    mockFindUnique.mockResolvedValue({
      id: "m1",
      orgId: "org1",
      userId: "u1",
      role: "player",
    } as never);
    mockRequireOrgAccess.mockResolvedValue({
      id: "caller-m",
      orgId: "org1",
      userId: "coach-u",
      role: "coach",
    } as never);
    // A plain PLAYER membership on another team is now enough to refuse.
    mockFindMany.mockResolvedValue([
      { id: "m2", orgId: "org2", userId: "u1", role: "player" },
    ] as never);
    await expect(resetMemberPassword("m1")).rejects.toBeInstanceOf(AuthzError);
    await expect(resetMemberPassword("m1")).rejects.toThrow(/multiple teams/i);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "u1", NOT: { id: "m1" } },
    });
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run to confirm the updated tests fail against current code**

```bash
npx vitest run tests/lib/actions/roster-actions.test.ts
```
Expected: FAIL — current message is "elevated role…" (not "multiple teams"), and the not-found path throws bare `Error` (not `AuthzError`).

- [ ] **Step 3: Rewrite `resetMemberPassword`**

In `src/lib/actions/roster-actions.ts`, replace `resetMemberPassword` (lines 101–136):

```tsx
export async function resetMemberPassword(
  membershipId: string,
): Promise<{ tempPassword: string }> {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError("Membership not found");

  const caller = await requireOrgAccess(membership.orgId);
  if (!["owner", "coach"].includes(caller.role)) throw new AuthzError();

  if (membership.role !== "player") {
    throw new AuthzError("Only player passwords can be reset");
  }

  // User.password is account-global, not per-org. If this player belongs to ANY
  // other team, resetting here would silently take over the shared credential —
  // refuse and point them elsewhere.
  const otherMemberships = await db.membership.findMany({
    where: { userId: membership.userId, NOT: { id: membershipId } },
  });
  if (otherMemberships.length > 0) {
    throw new AuthzError(
      "This player belongs to multiple teams; they can change their password themselves or via their other team.",
    );
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

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run tests/lib/actions/roster-actions.test.ts
```
Expected: PASS. Note the pre-existing "refuses to reset a non-player" test asserts `/only player/i` — still satisfied (message unchanged, now an `AuthzError`).

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: lint **5 errors**.

```bash
git add src/lib/actions/roster-actions.ts tests/lib/actions/roster-actions.test.ts
git commit -m "fix: refuse password reset for any multi-team player; throw AuthzError on guard paths"
```

---

### Task 6: Light coach-notification query (§2)

The coach layout loads `getTeamAnalytics` (which eager-includes every player's full `playerProgress` + last-10 `quizAttempts`) solely to feed `generateCoachNotifications`, which reads only four fields. Add a lean `getCoachNotificationData(orgId)` that fetches exactly those, and point the layout at it. **Behavior must match `getTeamAnalytics` exactly** — in particular `installCompletion` counts *any* progress row for a game-plan play (no `views > 0` filter), and `inactivePlayers` = players with no `lastViewedAt` within the last 3 days (or never viewed).

**Files:**
- Modify: `src/lib/actions/analytics-actions.ts`
- Modify: `src/lib/notifications.ts`
- Modify: `src/app/(coach)/layout.tsx`

**Interfaces:**
- Produces: `getCoachNotificationData(orgId: string): Promise<CoachNotificationData>` (cache-wrapped).
- Produces: `interface CoachNotificationData { gamePlanName: string | null; installCompletion: number; avgQuizScore: number; inactivePlayers: { id: string; name: string }[] }`.
- Changes: `generateCoachNotifications(data: CoachNotificationData)` — param type narrowed (was `TeamAnalytics`). `TeamAnalytics` still satisfies it structurally, so the existing `notifications.test.ts` is unaffected.

- [ ] **Step 1: Narrow `generateCoachNotifications` to a `CoachNotificationData` param**

In `src/lib/notifications.ts`, add the new interface just above `generateCoachNotifications` (after the `TeamAnalytics` interface, ~line 17):

```tsx
export interface CoachNotificationData {
  gamePlanName: string | null;
  installCompletion: number;
  avgQuizScore: number;
  inactivePlayers: { id: string; name: string }[];
}
```

Change the function signature (line 33–35) from `analytics: TeamAnalytics` to:
```tsx
export function generateCoachNotifications(
  analytics: CoachNotificationData,
): Notification[] {
```
Leave the body unchanged (it already reads only `inactivePlayers`, `avgQuizScore`, `gamePlanName`, `installCompletion`). Leave `TeamAnalytics` defined (still used by the test and conceptually by `getTeamAnalytics`).

- [ ] **Step 2: Add `getCoachNotificationData` to `analytics-actions.ts`**

In `src/lib/actions/analytics-actions.ts`, add the import for the return type and a cache-wrapped function. Extend the imports (lines 3–5):

```tsx
import { cache } from "react";
import { db } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import type { CoachNotificationData } from "@/lib/notifications";
```

Add this function immediately after `getTeamAnalytics` (after line 126):

```tsx
/**
 * Lean input for generateCoachNotifications — fetches ONLY the four fields it
 * reads, avoiding the per-player playerProgress/quizAttempts includes that
 * getTeamAnalytics pulls. Behavior-matched to getTeamAnalytics:
 *  - installCompletion counts ANY progress row for a game-plan play (no views filter)
 *  - inactivePlayers = players with no lastViewedAt in the last 3 days (or never viewed)
 */
export const getCoachNotificationData = cache(
  async (orgId: string): Promise<CoachNotificationData> => {
    await requireOrgAccess(orgId, { coach: true });
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const [players, activeGamePlan, recentAttempts] = await Promise.all([
      db.membership.findMany({
        where: { orgId, role: "player" },
        select: { user: { select: { id: true, name: true, email: true } } },
      }),
      db.gamePlan.findFirst({
        where: { orgId, isActive: true },
        select: { name: true, plays: { select: { playId: true } } },
      }),
      db.quizAttempt.findMany({
        where: { quiz: { orgId } },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: { score: true },
      }),
    ]);

    const totalPlayers = players.length;
    const playerIds = players.map((p) => p.user.id);
    const gamePlanPlayIds = activeGamePlan?.plays.map((gpp) => gpp.playId) ?? [];

    // Install completion: % of players who have a progress row for EVERY
    // game-plan play. (userId,playId) is unique in PlayerProgress, so a row-count
    // per user among the game-plan plays IS the viewed-play count.
    let installCompletion = 0;
    if (gamePlanPlayIds.length > 0 && totalPlayers > 0) {
      const rows = await db.playerProgress.findMany({
        where: { userId: { in: playerIds }, playId: { in: gamePlanPlayIds } },
        select: { userId: true },
      });
      const viewedCount = new Map<string, number>();
      for (const r of rows) {
        viewedCount.set(r.userId, (viewedCount.get(r.userId) ?? 0) + 1);
      }
      let completedPlayers = 0;
      for (const id of playerIds) {
        if ((viewedCount.get(id) ?? 0) === gamePlanPlayIds.length) {
          completedPlayers++;
        }
      }
      installCompletion = Math.round((completedPlayers / totalPlayers) * 100);
    }

    // Inactive players: no lastViewedAt within the last 3 days. A player with a
    // recent view is "active"; everyone else (including never-viewed) is inactive.
    const activeUserIds = new Set(
      (
        await db.playerProgress.findMany({
          where: { userId: { in: playerIds }, lastViewedAt: { gte: threeDaysAgo } },
          select: { userId: true },
          distinct: ["userId"],
        })
      ).map((r) => r.userId),
    );
    const inactivePlayers = players
      .filter((p) => !activeUserIds.has(p.user.id))
      .map((p) => ({ id: p.user.id, name: p.user.name ?? p.user.email }));

    const avgQuizScore =
      recentAttempts.length > 0
        ? Math.round(
            (recentAttempts.reduce((sum, a) => sum + a.score, 0) /
              recentAttempts.length) *
              100,
          )
        : 0;

    return {
      gamePlanName: activeGamePlan?.name ?? null,
      installCompletion,
      avgQuizScore,
      inactivePlayers,
    };
  },
);
```

- [ ] **Step 3: Point the coach layout at the lean query**

In `src/app/(coach)/layout.tsx`, change the import (line 8) and the call (lines 29–30):

```tsx
import { getCoachNotificationData } from "@/lib/actions/analytics-actions";
```
```tsx
  const data = await getCoachNotificationData(membership.orgId);
  const notifications = generateCoachNotifications(data);
```
Remove the now-unused `getTeamAnalytics` import from this file. (`getTeamAnalytics` remains used by the dashboard and analytics pages — do not delete it from `analytics-actions.ts`.)

- [ ] **Step 4: Confirm the notifications test still passes (structural compatibility)**

```bash
npx vitest run tests/lib/notifications.test.ts
```
Expected: PASS — the test's `analytics: TeamAnalytics` object structurally satisfies `CoachNotificationData`.

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: lint **5 errors**. Manually confirm `build` still typechecks the coach layout (server component).

```bash
git add src/lib/actions/analytics-actions.ts src/lib/notifications.ts "src/app/(coach)/layout.tsx"
git commit -m "perf: feed coach notifications from a lean query, not full team analytics"
```

---

### Task 7: Org index migration (§2)

Every coach list query filters by `orgId` (`Playbook`, `GamePlan`, `Quiz`, `PracticePlan`, `TeamFile`, `Membership`), but only `Membership` has an index touching `orgId` — and its compound `@@unique([userId, orgId])` leads with `userId`, so it does **not** serve `orgId`-first lookups. Add single-column `@@index([orgId])` to all six models via one migration.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_org_indexes/migration.sql` (generated)

- [ ] **Step 1: Add `@@index([orgId])` to the six models**

In `prisma/schema.prisma`, add an `@@index([orgId])` line to each model's block (alongside existing block attributes):

- `Membership` (after `@@unique([userId, orgId])`, ~line 156): add `@@index([orgId])`
- `Playbook` (after the relations, before the closing `}`, ~line 172): add `@@index([orgId])`
- `GamePlan` (~line 227): add `@@index([orgId])`
- `Quiz` (~line 256): add `@@index([orgId])`
- `PracticePlan` (~line 331): add `@@index([orgId])`
- `TeamFile` (~line 371): add `@@index([orgId])`

Example (Playbook):
```prisma
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy User         @relation("PlaybookCreator", fields: [createdById], references: [id])
  plays     Play[]
  shares    PlaybookShare[]

  @@index([orgId])
}
```

- [ ] **Step 2: Bring up the dev DB and run the migration (migrate → generate → tsc order)**

```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate dev --name add_org_indexes
npx prisma generate
npx tsc --noEmit
```
Expected: a new `prisma/migrations/<timestamp>_add_org_indexes/migration.sql` with six `CREATE INDEX` statements; `generate` succeeds (indexes do not alter generated types); `tsc` clean.

- [ ] **Step 3: Confirm the migration SQL is index-only**

Open the generated `migration.sql` and confirm it contains only `CREATE INDEX "..._orgId_idx" ON "..." ("orgId");` statements (no table/column drops). This is a non-destructive, forward-only change.

- [ ] **Step 4: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: lint **5 errors**.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "perf: add @@index([orgId]) to org-scoped models"
```

---

### Task 8: Login handoff banner (§3)

When signup/join create the account but the auto-sign-in fallback fires, they push to `/login` with no context. Push `/login?created=1` instead, and have the login page show an info banner. `useSearchParams` must sit inside a `<Suspense>` boundary (the Next 16 prerender rule).

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`
- Modify: `src/app/(auth)/join/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Signup + join push `?created=1` on the fallback**

In `src/app/(auth)/signup/page.tsx` line 56, change:
```tsx
        router.push(signInResult?.error ? "/login" : "/dashboard");
```
to:
```tsx
        router.push(signInResult?.error ? "/login?created=1" : "/dashboard");
```

In `src/app/(auth)/join/page.tsx` line 195, change:
```tsx
        router.push(signInResult?.error ? "/login" : "/home");
```
to:
```tsx
        router.push(signInResult?.error ? "/login?created=1" : "/home");
```

- [ ] **Step 2: Wrap the login page body in Suspense and read `created`**

In `src/app/(auth)/login/page.tsx`, add `Suspense` + `useSearchParams` to the imports:

```tsx
import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
```

Rename the current default component to `LoginForm` (change line 15 `export default function LoginPage()` → `function LoginForm()`), and read the flag at the top of that function (right after the existing `useState` hooks, ~line 20):

```tsx
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
```

Inside the `<CardContent className="pt-6">` (immediately above the existing `{error && (` block at line 98), add the info banner:

```tsx
          {justCreated && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary-emphasis">
              Account created — sign in to continue.
            </div>
          )}
```

Finally, add a new default export at the end of the file (after the closing brace of `LoginForm`):

```tsx
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: `build` must succeed — this is the step that would fail with a "useSearchParams must be wrapped in a suspense boundary" prerender error if the Suspense wrap were wrong. Lint **5 errors**.

```bash
git add "src/app/(auth)/signup/page.tsx" "src/app/(auth)/join/page.tsx" "src/app/(auth)/login/page.tsx"
git commit -m "feat: account-created handoff banner on login (Suspense-wrapped searchParams)"
```

---

### Task 9: UX polish batch — quiz rename, week clamp, draft banner, team-files pending split (§3)

Four small independent UX fixes. Grouped because each is a few lines; all are client-component behavior tweaks.

**Files:**
- Modify: `src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx`
- Modify: `src/app/(coach)/game-plans/create-game-plan-dialog.tsx`
- Modify: `src/lib/actions/game-plan-actions.ts`
- Modify: `src/app/(coach)/designer/page.tsx`
- Modify: `src/app/(coach)/settings/files/page.tsx`

- [ ] **Step 1: Quiz rename — empty name errors + input disabled while saving**

In `quiz-detail-client.tsx`, replace `handleSaveName` (lines 28–46) so an empty name surfaces a toast and keeps editing:

```tsx
  function handleSaveName() {
    const next = draftName.trim();
    if (!next) {
      toast.error("Name can't be empty");
      return; // keep editing state
    }
    if (next === name) {
      setEditing(false);
      setDraftName(name);
      return;
    }
    startSaveName(async () => {
      try {
        await updateQuiz(quizId, { name: next });
        setName(next);
        setEditing(false);
        toast.success("Quiz renamed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename quiz");
      }
    });
  }
```

Disable the input while a save is pending — add `disabled={savingName}` to the `<Input>` (lines 65–77), e.g. after `onKeyDown={…}`:
```tsx
            className="max-w-sm"
            disabled={savingName}
            autoFocus
```

- [ ] **Step 2: Week clamp — client-side (dialog) and server-side (action)**

In `create-game-plan-dialog.tsx` line 53, clamp the parsed week to ≥1:
```tsx
          week: Number.isFinite(parsedWeek) ? Math.max(1, parsedWeek) : undefined,
```

In `src/lib/actions/game-plan-actions.ts`, clamp server-side inside `createGamePlan` (lines 45–53). Replace the `db.gamePlan.create` call:
```tsx
  return db.gamePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      week: data.week !== undefined ? Math.max(1, data.week) : undefined,
      opponent: data.opponent,
      createdById: membership.userId,
    },
  });
```

- [ ] **Step 3: Draft banner — pointer-events pass-through**

In `designer/page.tsx`, the draft-restore banner wrapper (line 685) spans the full width and swallows canvas clicks. Add `pointer-events-none` to the wrapper and `pointer-events-auto` to the pill.

Line 685 wrapper — change:
```tsx
          <div className="absolute inset-x-0 top-24 z-30 flex justify-center px-3">
```
to:
```tsx
          <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-3">
```

Line 686 pill — change:
```tsx
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
```
to:
```tsx
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
```

- [ ] **Step 4: Team files — separate transitions for edit-save vs delete**

In `settings/files/page.tsx`, `confirmDelete` currently reuses `startSaveEdit`, so a pending delete lights the edit-save spinner (and vice-versa). Add a dedicated delete transition.

Add a transition next to the edit one (after line 81 `const [savingEdit, startSaveEdit] = useTransition();`):
```tsx
  const [deletingFile, startDelete] = useTransition();
```

In `confirmDelete` (line 145), change `startSaveEdit(async () => {` to `startDelete(async () => {`. (The delete is optimistic — the reference to `deletingFile` guards against unmount races and keeps the two spinners independent; it may be read later for a row-level spinner but is not required by this task.)

To avoid an unused-variable lint warning if `deletingFile` is otherwise unread, gate the "Add Link" button's `disabled` on it as a harmless, correct use — or simply reference it in the delete `ConfirmDialog`'s confirm button. Minimal correct wiring: pass it through to disable re-triggering delete. In the `ConfirmDialog` (lines 425–439), the confirm handler already closes on confirm; no change needed. If lint flags `deletingFile` as unused, prefix with `void deletingFile;` is NOT acceptable — instead disable the delete button during a pending delete by adding `disabled={deletingFile}` to the row delete `<button>` (line 406–412):
```tsx
                            <button
                              onClick={() => setConfirmDeleteId(file.id)}
                              disabled={deletingFile}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive disabled:opacity-50"
                              title="Delete"
                            >
```

- [ ] **Step 5: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: lint **5 errors** (no new warnings from `deletingFile` — it is now read by the row button's `disabled`).

```bash
git add "src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx" "src/app/(coach)/game-plans/create-game-plan-dialog.tsx" src/lib/actions/game-plan-actions.ts "src/app/(coach)/designer/page.tsx" "src/app/(coach)/settings/files/page.tsx"
git commit -m "fix: quiz-rename empty guard, week clamp, draft-banner click passthrough, team-files pending split"
```

---

### Task 10: Accent-foreground token + on-accent fills + ModeButton rename + contrast test + QR (§4)

Add a theme-aware `--accent-foreground` token (see the SPEC CORRECTION in Global Constraints — dark ink in dark theme, white in light theme, both clearing AA), switch every solid `bg-accent` fill to `text-accent-foreground`, rename the stale ModeButton `cyan` key to `accent`, extend the contrast test to parse the dark `:root` block, and make the invite QR scanner-safe.

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/lib/contrast.test.ts`
- Modify: `src/app/(coach)/designer/page.tsx`
- Modify: `src/app/(player)/progress/page.tsx`
- Modify: `src/components/play/play-toolbar.tsx`
- Modify: `src/lib/qr.ts`
- Modify: `src/components/roster/invite-code-card.tsx`

- [ ] **Step 1: Write the failing contrast test (parse `:root` dark block + new pairs)**

In `tests/lib/contrast.test.ts`, add a dark-palette parser mirroring `readLightPalette`, and assertions for the dark pairs plus accent-foreground in both themes. Insert after `readLightPalette` (line 30) a second parser + accessor:

```ts
/** Parse the committed dark (:root) palette (hex tokens only) from globals.css */
function readDarkPalette(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const block = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const vars: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[m[1]] = m[2];
  }
  return vars;
}

const d = readDarkPalette();

function darkToken(name: string): string {
  const v = d[name];
  if (!v) throw new Error(`missing --${name} (hex) in :root palette of globals.css`);
  return v;
}
```

Then add these describe blocks at the end of the file:

```ts
describe("accent-foreground on accent meets WCAG AA in both themes", () => {
  it("light: accent-foreground on accent", () =>
    void expect(contrast(token("accent-foreground"), token("accent"))).toBeGreaterThanOrEqual(AA));
  it("dark: accent-foreground on accent", () =>
    void expect(contrast(darkToken("accent-foreground"), darkToken("accent"))).toBeGreaterThanOrEqual(AA));
});

describe("dark palette meets WCAG AA (4.5:1) for core text pairs", () => {
  it("primary-foreground on primary", () =>
    void expect(contrast(darkToken("primary-foreground"), darkToken("primary"))).toBeGreaterThanOrEqual(AA));
  it("foreground on background", () =>
    void expect(contrast(darkToken("foreground"), darkToken("background"))).toBeGreaterThanOrEqual(AA));
  it("foreground on card", () =>
    void expect(contrast(darkToken("foreground"), darkToken("card"))).toBeGreaterThanOrEqual(AA));
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run tests/lib/contrast.test.ts
```
Expected: FAIL — `--accent-foreground` is not yet defined in either palette (`missing --accent-foreground`).

- [ ] **Step 3: Add the `--accent-foreground` token (theme split) + `@theme inline` bridge**

In `src/app/globals.css`:

Register the color in `@theme inline` — add after line 17 (`--color-accent: var(--accent);`):
```css
  --color-accent-foreground: var(--accent-foreground);
```

In `:root` (dark), add after line 40 (`--accent: #d97706;`):
```css
  --accent-foreground: #1c1409;
```

In `.light`, add after line 73 (`--accent: #b45309;`):
```css
  --accent-foreground: #ffffff;
```

(Dark ink `#1c1409` on dark accent `#d97706` = 5.71; white on light accent `#b45309` = 5.02 — both ≥ 4.5.)

- [ ] **Step 4: Run the contrast test to confirm it passes**

```bash
npx vitest run tests/lib/contrast.test.ts
```
Expected: PASS (all existing light assertions + the new accent-foreground-both-themes + dark-pair assertions).

- [ ] **Step 5: Switch the solid `bg-accent` fills to `text-accent-foreground`**

Three solid-fill sites currently pair `bg-accent` with `text-primary-foreground` (white — which fails AA in dark). Tinted `bg-accent/NN … text-accent` usages are unaffected.

`designer/page.tsx` line 736 (motion banner) — change `text-primary-foreground` → `text-accent-foreground`:
```tsx
              <div className="flex max-w-full items-center gap-2 rounded-full bg-accent/90 px-4 py-1.5 text-center text-xs font-medium text-accent-foreground shadow-lg backdrop-blur-sm">
```

`progress/page.tsx` line 105 (level circle) — change `text-primary-foreground` → `text-accent-foreground`:
```tsx
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
```

- [ ] **Step 6: Rename the ModeButton `cyan` key → `accent` (+ text-accent-foreground)**

In `src/components/play/play-toolbar.tsx`:

Line 210 call site — `color="cyan"` → `color="accent"`:
```tsx
          color="accent"
```

Line 415 type union — `"emerald" | "cyan" | "amber"` → `"emerald" | "accent" | "amber"`:
```tsx
  color: "emerald" | "accent" | "amber";
```

Line 422 map entry — rename the key and switch the text token:
```tsx
    accent: "bg-accent text-accent-foreground",
```
(Leave the `emerald`/`amber` entries untouched — their rename is out of scope for 3a.)

- [ ] **Step 7: QR — dark modules on a light tile + white tile in the card**

In `src/lib/qr.ts`, swap the `color` so modules are dark on a light background (scanner-safe, theme-proof). Replace lines 11–14:
```tsx
    color: {
      dark: "#10201d",
      light: "#ffffff",
    },
```

In `src/components/roster/invite-code-card.tsx`, the QR renders inside a `bg-secondary` tile (line 216). Give the image a white tile so a light-theme surface never sits under a light-background QR. Change line 216:
```tsx
            <div className="flex flex-col items-center gap-3 rounded-lg bg-secondary p-4">
```
Wrap the `<img>` (lines 218–224) in a white tile — replace the `<img>` element with:
```tsx
              <div className="rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code for invite ${code}`}
                  width={200}
                  height={200}
                  className="rounded"
                />
              </div>
```
(`bg-white` here is an intentional, allowlisted print-like surface — a QR tile must be white in both themes; note it in the close-out gate.)

- [ ] **Step 8: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: contrast test grows; `build` must succeed (confirms the new `text-accent-foreground` utility compiles from `@theme inline`). Lint **5 errors**.

```bash
git add src/app/globals.css tests/lib/contrast.test.ts "src/app/(coach)/designer/page.tsx" "src/app/(player)/progress/page.tsx" src/components/play/play-toolbar.tsx src/lib/qr.ts src/components/roster/invite-code-card.tsx
git commit -m "feat: theme-aware --accent-foreground token; on-accent AA fixes; ModeButton accent rename; scanner-safe QR"
```

---

### Task 11: Lint to zero — the remaining five errors (§5)

Fix the five remaining lint errors with proper structural changes (no disables). Two use the SSR-safe `useSyncExternalStore` client-mount / external-store idiom; one is a declaration reorder in an engine file (behavior frozen); one is a `const`; one derives loading state.

**Files:**
- Modify: `src/components/play/play-library.tsx`
- Modify: `src/engine/play-canvas.tsx`
- Modify: `src/components/dashboard/dashboard-client.tsx`
- Modify: `src/components/theme-provider.tsx`
- Modify: `src/components/play/version-history.tsx`

- [ ] **Step 1: `play-library.tsx:51` — `let pool` → `const pool`**

`pool` is assigned once (a ternary) and never reassigned. Change line 51:
```tsx
    const pool = activeCategory
      ? PLAY_LIBRARY.filter((p) => p.category === activeCategory)
      : PLAY_LIBRARY;
```

- [ ] **Step 2: `play-canvas.tsx:196` — move `finishCurrentRoute` above `handleSelectPlayer` + add to deps**

`handleSelectPlayer` (declared at line 159) calls `finishCurrentRoute` (declared at line 228), tripping `react-hooks/immutability` (use-before-declare) and an `exhaustive-deps` warning. Move the entire `finishCurrentRoute` `useCallback` (lines 227–249) to **immediately before** `handleSelectPlayer` (before line 159), and add `finishCurrentRoute` to `handleSelectPlayer`'s dependency array. No behavior change — only order and deps.

After the move, `handleSelectPlayer`'s dependency array (currently line 224) becomes:
```tsx
    [drawingRoute, drawingPlayerId, canvasData, onChange, onSelectPlayer, motionMode, onMotionPlayerSelect, finishCurrentRoute],
```
`finishCurrentRoute`'s own deps stay `[drawingPlayerId, canvasData, onChange]` — all declared earlier (state at lines 98/100, props), so there is no new forward reference.

- [ ] **Step 3: `dashboard-client.tsx:56` (TimeGreeting) — derive greeting via a mount flag, no effect**

The mount effect calls `setGreeting(...)` synchronously. Replace it with the SSR-safe client-mount idiom and compute the greeting during render. Replace the imports (line 4) and the `TimeGreeting` function (lines 49–69):

```tsx
import { useSyncExternalStore, type ReactNode } from "react";
```
```tsx
function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting({ name }: { name?: string | null }) {
  // SSR-safe client flag: server + hydration render "" (matching the server HTML),
  // then the client swaps in the real greeting — no setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const greeting = mounted ? timeGreeting() : "";

  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
        {greeting}{greeting && name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Team overview, install momentum, and next actions.</p>
    </div>
  );
}
```
(The file's other exports — `DashboardStagger`/`DashboardCard`/`DashboardFadeIn` — still import `motion`; leave that import. Remove `useState`/`useEffect` from the React import since they are no longer used — the top import becomes `import { motion } from "framer-motion";` on its line and the `useSyncExternalStore, type ReactNode` import above.)

- [ ] **Step 4: `theme-provider.tsx:36` — read theme via `useSyncExternalStore`, apply via a class-only effect**

Replace the mount effect (which does `setThemeState` synchronously) with a `useSyncExternalStore` read of `localStorage` (a primitive string, so the snapshot is referentially stable). Class application moves to a side-effect-only effect (`applyTheme` mutates the DOM — not setState — so it does not trip the rule). Replace lines 30–60 (`ThemeProvider`):

```tsx
const themeListeners = new Set<() => void>();

function readStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
}

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => "dark");

  // Apply the resolved class whenever the theme changes (DOM side-effect only).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Track the system preference while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    themeListeners.forEach((l) => l()); // notify useSyncExternalStore to re-read
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```
Update the React import (line 3) — drop `useState`, add `useSyncExternalStore`:
```tsx
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
```
(`theme-toggle.test.tsx` mocks `@/components/theme-provider` wholesale, and no test renders the real provider, so this refactor cannot break the suite.)

- [ ] **Step 5: `version-history.tsx:38` — derive `loading`, setState only in the promise callback**

The effect calls `setLoading(true)` synchronously. Derive `loading` from a "which playId is loaded" marker so state is only set inside the `.then` callback. Replace the state declarations (lines 31–34) and the effect (lines 36–42):

```tsx
  const [versions, setVersions] = useState<PlayVersion[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [restoring, startRestore] = useTransition();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const loading = isOpen && !!playId && loadedKey !== playId;

  useEffect(() => {
    if (!isOpen || !playId || loadedKey === playId) return;
    let active = true;
    getPlayVersions(playId)
      .then((v) => {
        if (!active) return;
        setVersions(v as PlayVersion[]);
        setLoadedKey(playId);
      })
      .catch(() => {
        // Preserve the original's degrade-to-empty-state behavior: mark loaded so
        // `loading` clears instead of spinning forever on a failed fetch.
        if (active) setLoadedKey(playId);
      });
    return () => {
      active = false;
    };
  }, [isOpen, playId, loadedKey]);
```
Remove the now-unused `loading` state (the old `const [loading, setLoading] = useState(false);` line is deleted; `loading` is now derived above). The JSX referencing `loading` (line 88) is unchanged. Setting state only in the `.then`/`.catch` callbacks (asynchronous) satisfies `react-hooks/set-state-in-effect`, and the `.catch` clears the spinner on error (matching the old `.finally(() => setLoading(false))`).

- [ ] **Step 6: Verify + commit — lint hits ZERO**

```bash
npm run test:run   # still green
npx tsc --noEmit   # clean
npm run lint       # 0 ERRORS  ← the gate for this task
npm run build      # succeeds
```
Expected lint: **0 errors** (warnings may remain).

```bash
git add src/components/play/play-library.tsx src/engine/play-canvas.tsx src/components/dashboard/dashboard-client.tsx src/components/theme-provider.tsx src/components/play/version-history.tsx
git commit -m "fix: clear remaining 5 lint errors (const, hook ordering, SSR-safe mount/store, derived loading)"
```

---

### Task 12: Cleanup — dead code, deprecation note, revalidation, ConfirmDialog (§6)

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts`
- Modify: `src/lib/actions/game-plan-actions.ts`
- Modify: `src/lib/actions/practice-actions.ts`
- Modify: `src/components/ui/confirm-dialog.tsx`
- Create: `tests/components/ui/confirm-dialog.test.tsx`

- [ ] **Step 1: Remove dead `getQuizAttempts`**

In `src/lib/actions/quiz-actions.ts`, delete the `getQuizAttempts` function (lines 177–184). It has no code callers (grep-confirmed: only `docs/` and `README.md` mention it; no `.tsx`/`.ts` import). There is **no test to remove** (`quiz-actions.test.ts` never referenced it). Leave `getAttemptedQuizIds` (a different, live function) intact.

- [ ] **Step 2: Deprecate the unused `orgId` param on `setActiveGamePlan`**

In `src/lib/actions/game-plan-actions.ts`, `setActiveGamePlan(orgId, gamePlanId)` ignores `orgId` (org is resolved from the validated game plan). Keep the frozen signature; annotate the param. Change line 56:
```tsx
export async function setActiveGamePlan(
  /** @deprecated orgId unused — resolved from the game plan */ orgId: string,
  gamePlanId: string,
) {
```

- [ ] **Step 3: Add `revalidatePath` to practice-plan mutations**

`practice-actions.ts` mutations never revalidate their pages. The spec says "mirror game-plan-actions conventions"; **`game-plan-actions.ts` has no `revalidatePath` calls**, so there is no in-file convention to mirror — this plan revalidates the actual practice route paths (`/practice` list and `/practice/[id]` detail), which is the correct behavior. Add the import and calls.

Add to the imports (after line 3):
```tsx
import { revalidatePath } from "next/cache";
```
Add `revalidatePath("/practice");` at the end of `createPracticePlan` (before `return plan;`, ~line 59) and `deletePracticePlan` (after the delete, ~line 85). Add both `revalidatePath("/practice");` and `revalidatePath(\`/practice/${id}\`);` at the end of `updatePracticePlan` (before `return plan;`, ~line 79). For the period mutations that take `data.practicePlanId` / resolve `orgId`, revalidate the detail page: in `addPracticePeriod` (before `return period;`) add `revalidatePath(\`/practice/${data.practicePlanId}\`);`; in `updatePracticePeriod`/`deletePracticePeriod`/`reorderPracticePeriods`, revalidate `/practice/[id]` using the resolved plan id (`period.practicePlanId` for period ops; `planId` for reorder):
```tsx
  revalidatePath(`/practice/${period.practicePlanId}`);
```
```tsx
  revalidatePath(`/practice/${planId}`);
```

- [ ] **Step 4: Write the failing ConfirmDialog test**

Create `tests/components/ui/confirm-dialog.test.tsx` (mirrors `dialog.test.tsx` conventions):

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Delete quiz?"
      description="This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDialog", () => {
  it("renders the title, description, and confirm label when open", () => {
    setup();
    expect(screen.getByText("Delete quiz?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("confirm fires onConfirm and then closes via onOpenChange(false)", () => {
    const { onConfirm, onOpenChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancel closes without firing onConfirm", () => {
    const { onConfirm, onOpenChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 5: Run to confirm it fails, then fix ConfirmDialog**

```bash
npx vitest run tests/components/ui/confirm-dialog.test.tsx
```
Expected: PASS on render + confirm; the cancel test may already pass (Radix `DialogClose`). Regardless, apply the confirm-button fix: it lacks `type="button"`, so inside any host `<form>` it would default to `submit`. In `src/components/ui/confirm-dialog.tsx`, add `type="button"` to the confirm `<Button>` (lines 46–55):

```tsx
          <Button
            type="button"
            size="sm"
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
```
The destructive hover is already `hover:bg-destructive/90` via the Button `destructive` variant — no extra class needed (do not add a redundant `className`).

- [ ] **Step 6: Verify + commit**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: tests grow by 3; lint **0 errors** (must stay 0).

```bash
git add src/lib/actions/quiz-actions.ts src/lib/actions/game-plan-actions.ts src/lib/actions/practice-actions.ts src/components/ui/confirm-dialog.tsx tests/components/ui/confirm-dialog.test.tsx
git commit -m "chore: drop dead getQuizAttempts, deprecate setActiveGamePlan orgId, revalidate practice, harden ConfirmDialog + test"
```

---

### Task 13: Test-rigor batch (§7)

Tighten existing suites. No source changes — additions only.

**Files:**
- Modify: `tests/lib/authz.test.ts`
- Modify: `tests/lib/streak.test.ts`
- Modify: `tests/lib/gamification.test.ts`
- Modify: `tests/lib/quiz-score.test.ts`
- Modify: `tests/lib/actions/team-file-actions.test.ts`

- [ ] **Step 1: authz — `AuthzError.name`, `requireMembership` coach-success, `requirePlayAccess` org-thread call args**

In `tests/lib/authz.test.ts`, add an `AuthzError` identity test (new describe, e.g. after the imports/setup):
```ts
describe("AuthzError", () => {
  it("has name 'AuthzError' so callers can branch on it", () => {
    expect(new AuthzError().name).toBe("AuthzError");
    expect(new AuthzError("nope").message).toBe("nope");
  });
});
```
Add a coach-success case inside the existing `requireMembership` describe (after line 114):
```ts
  it("returns the membership for coach-only access when the role is coach", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(coachMembership as never);
    await expect(requireMembership({ coach: true })).resolves.toEqual(coachMembership);
  });
```
In the `requirePlayAccess` describe, extend the existing success test to assert the org-threading `include` (add after line 167, inside that `it`):
```ts
    expect(vi.mocked(db.play.findUnique)).toHaveBeenCalledWith({
      where: { id: "p1" },
      include: { playbook: { select: { orgId: true } } },
    });
```

- [ ] **Step 2: streak — `i<10` cap and `current>0` gate**

In `tests/lib/streak.test.ts`, add two cases inside the `computeStreak` describe:
```ts
  it("caps the CURRENT streak at 10 days while longest keeps growing (i<10 gate)", () => {
    const history = Array.from({ length: 11 }, (_, i) => ({
      lastViewedAt: daysAgo(now, i),
    }));
    const result = computeStreak(history, now);
    expect(result.current).toBe(10); // current stops advancing once i reaches 10
    expect(result.longest).toBe(11); // longest counts the full run
    expect(result.daysActive).toBe(11);
  });

  it("does not revive current from a long past run (current>0 gate)", () => {
    // Three consecutive days, but all ended 3+ days ago → current stays 0.
    const result = computeStreak(
      [
        { lastViewedAt: daysAgo(now, 3) },
        { lastViewedAt: daysAgo(now, 4) },
        { lastViewedAt: daysAgo(now, 5) },
      ],
      now,
    );
    expect(result.current).toBe(0);
    expect(result.longest).toBe(3);
    expect(result.daysActive).toBe(3);
  });
```

- [ ] **Step 3: gamification — `newBadges` `toEqual([])` + `hasPerfectQuiz` true→true no re-unlock**

In `tests/lib/gamification.test.ts`, add to the `computeQuizReward` describe:
```ts
  it("returns an empty newBadges array when no threshold is newly crossed", () => {
    const same = { ...baseStats, totalQuizzes: 1 };
    expect(computeQuizReward(same, same).newBadges).toEqual([]);
  });

  it("does not re-unlock perfect-quiz when it was already earned (true → true)", () => {
    const before = { ...baseStats, hasPerfectQuiz: true };
    const after = { ...baseStats, hasPerfectQuiz: true };
    expect(
      computeQuizReward(before, after).newBadges.map((b) => b.id),
    ).not.toContain("perfect-quiz");
  });
```

- [ ] **Step 4: quiz-score — all-supported no-op case**

In `tests/lib/quiz-score.test.ts`, add to the `computeScorePercent` describe:
```ts
  it("scores every supported question correct as 100% (all-supported, none skipped)", () => {
    expect(computeScorePercent(4, 4)).toBe(100);
  });
```

- [ ] **Step 5: team-file — assert `coach:true` in the three blocks missing it + `assertHttpUrl` catch branch**

In `tests/lib/actions/team-file-actions.test.ts`, add `expect(mockedMembership).toHaveBeenCalledWith({ coach: true });` to the `createTeamFile` "derives orgId…" test (after line 59), the `updateTeamFile` "scopes the update…" test (after line 83), and the `deleteTeamFile` "scopes the delete…" test (after line 107).

Add a case for `assertHttpUrl`'s **catch branch** (a malformed string that makes `new URL()` throw, distinct from the existing `javascript:` protocol case):
```ts
  it("rejects a string that is not a URL at all (catch branch) and never writes", async () => {
    await expect(
      createTeamFile({ title: "Bad", url: "not a url", category: "rules" }),
    ).rejects.toThrow("Only http(s) links are allowed");
    expect(db.teamFile.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 6: Verify + commit**

```bash
npm run test:run   # count grows by ~10
npx tsc --noEmit && npm run lint && npm run build
```
Expected: lint **0 errors**.

```bash
git add tests/lib/authz.test.ts tests/lib/streak.test.ts tests/lib/gamification.test.ts tests/lib/quiz-score.test.ts tests/lib/actions/team-file-actions.test.ts
git commit -m "test: tighten authz/streak/gamification/quiz-score/team-file suites"
```

---

### Task 14: Close-out — hardened grep gates + full quartet + QA checklist

No code changes. Run the phase-close gates (now including `rgba(`/`rgb(` literals and `src/lib` scope), the full verification quartet, and a targeted manual QA. Any gate miss is fixed in the owning task's file, then re-run.

- [ ] **Step 1: Existing token gates (must be zero outside the documented allowlist)**

Run the Phase 2 gate set (ripgrep):
```bash
rg -n --glob 'src/app/**' --glob 'src/components/**' 'indigo-|violet-' src/
rg -n --glob 'src/app/**' --glob 'src/components/**' '\bblue-' src/ | rg -v 'print-layout.tsx|play-library.tsx'
rg -n 'zinc-|slate-|gray-|neutral-' src/app src/components | rg -v 'src/components/play/print-layout.tsx|src/components/play/play-library.tsx'
rg -n '(text|bg|border|fill|stroke|ring|from|via|to|divide|outline|ring-offset)-(white|black)' src/app src/components | rg -v 'print-layout.tsx'
rg -n '\[#' src/app src/components | rg -v 'print-layout.tsx'
```
Expected matches ONLY the pre-documented allowlist: `print-layout.tsx` print paper/ink; Google OAuth SVG hex fills in `login`/`signup`; `bg-black/40..70` scrims; the `playTypeBadge` categorical chips in `play-library.tsx`; **plus** the new `bg-white` QR tile in `invite-code-card.tsx` (Task 10 — a QR must be white in both themes). Anything else is a miss.

- [ ] **Step 2: New `rgba(`/`rgb(` gate (Phase 3a hardening, includes `src/lib`)**

```bash
rg -n -g '*.ts' -g '*.tsx' 'rgba\(|rgb\(' src/app src/components src/lib | rg -v 'shadow-\[|boxShadow'
```
Expected: **no matches.** The `-g '*.ts' -g '*.tsx'` scope excludes `globals.css` (token definitions) automatically; `src/engine/**` (Konva canvas rendering colors) is intentionally out of scope. The only `rgba(`/`rgb(` in the scanned dirs live inside allowlisted idioms filtered out above:
  - **`shadow-[…]` arbitrary-shadow utilities** encoding token shadow values — primary teal `rgba(15,118,110,*)` in `button.tsx`, `login`/`signup` PF badge, `designer/page.tsx`, `coach-sidebar.tsx`, `formation-picker.tsx`, `play-toolbar.tsx`; neutral drop-shadows `rgba(0,0,0,*)` / `rgba(6,78,59,*)` in `card.tsx`, `player-tabs.tsx`.
  - **framer-motion `boxShadow`** accent-pulse `rgba(217,119,6,*)` in `player-home-client.tsx`.
`src/lib` currently has **zero** `rgba(`/`rgb(` — the extended scope is a forward guard.

- [ ] **Step 3: Full verification quartet**

```bash
npm run test:run   # all green; ~184+ passing (161 baseline + Tasks 3,4,5,10,12,13 additions)
npx tsc --noEmit   # clean
npm run lint       # 0 errors
npm run build      # succeeds
```

- [ ] **Step 4: Targeted manual QA (dev DB up, dev login)**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run dev
```
With `coach@playforge.dev` and a player account in the **same browser**, verify:
1. **Bell isolation:** notifications seen as the player do not appear after switching to the coach account (and vice-versa) — the `playforge_notifications:<userId>` keys are distinct.
2. **Login handoff:** trigger the signup/join auto-sign-in fallback (or visit `/login?created=1` directly) → the "Account created — sign in to continue." banner shows.
3. **QR visual:** open the roster invite card → QR renders dark-on-white on a white tile; toggle light/dark theme → the QR tile stays white and scannable.
4. **On-accent contrast:** in the designer, enter Motion mode → the motion banner reads clearly in **both** themes; the player progress level circle digit reads clearly in both themes.

- [ ] **Step 5: Final tag commit (if the branch is ready to hand off)**

```bash
git add -A
git commit -m "chore: phase-3a hardening close-out — gates green, QA passed" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- §1 Security & correctness → Tasks 1 (bell scoping), 2 (join race + AI logging), 3 (progress org-scoping + client param), 4 (transactional reward), 5 (reset guard). ✅
- §2 Performance → Task 6 (light query), Task 7 (org indexes). ✅
- §3 UX polish → Task 8 (login banner), Task 9 (quiz rename, week clamp, draft banner, team-files split). ✅
- §4 Visual & a11y → Task 10 (accent-foreground token + fills + ModeButton + contrast test + QR). ✅
- §5 Lint to zero + gates → Task 11 (5 errors; the other 2 are Task 1) + Task 14 (hardened grep gates). ✅
- §6 Cleanup → Task 12 (getQuizAttempts, setActiveGamePlan note, practice revalidate, ConfirmDialog + test). ✅
- §7 Test-rigor → Task 13. ✅
- Verification contract + close-out QA → Task 14. ✅

**Deviations from the brief (flagged for the team lead):**
1. **accent-foreground is theme-split, not `#1c1409` in both palettes** — the single value fails light-theme AA (3.63). Dark `:root` = `#1c1409` (5.71), light `.light` = `#ffffff` (5.02). Without this, the contrast test in Task 10 would fail its own gate.
2. **Lint inventory differs from the brief's guess** — the 7 errors are in `dashboard-client`, `play-library` (prefer-const), `version-history`, `theme-provider`, `notification-bell` ×2, `play-canvas`. `quiz-card.tsx`, `animation-engine.ts`, `ball.tsx` have **no errors** (only unused-var warnings), so they are not touched by the lint task.
3. **Two justified `eslint-disable` in notification-bell** (Task 1) — the other five errors get proper structural fixes; these two are legitimate client-only localStorage sync where the setState-after-mount is required for hydration.
4. **Coach bell lives in `CoachSidebar`, not the coach layout** — Task 1 threads `userId` through `coach layout → CoachSidebar → NotificationBell` (both bells get scoped). Making `userId` required also forces this wiring or `tsc` fails.
5. **practice `revalidatePath` targets real route paths** (`/practice`, `/practice/[id]`) — the brief says "mirror game-plan-actions," but that file has no `revalidatePath` to mirror.
6. **`getQuizAttempts` had no test coverage** to remove.

**Type consistency:** `recordQuizScore(playId, score, client?: Prisma.TransactionClient)` defined in Task 3, consumed with `tx` in Task 4. `CoachNotificationData` defined in Task 6 (notifications.ts) and consumed by `getCoachNotificationData` + the coach layout. `NotificationBell({ userId, incoming })` (Task 1) — only the player layout consumes it. No signature drift across tasks.
</content>
</invoke>
