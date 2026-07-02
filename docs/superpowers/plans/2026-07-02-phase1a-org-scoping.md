# PlayForge Phase 1a — Org Scoping (Security) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the multi-tenant authorization holes in every server action and detail page so an authenticated user of org A can no longer read or mutate org B's playbooks, plays, game plans, quizzes, practice plans, roster, or analytics.

**Architecture:** Introduce one authorization module, `src/lib/authz.ts`, exporting an `AuthzError` class plus session-scoping helpers. `requireOrgAccess(orgId, { coach? })` resolves the signed-in user and verifies membership (optionally coach role), throwing `AuthzError` on failure. Five per-resource resolvers (`requirePlaybookAccess`, `requirePlayAccess`, `requireGamePlanAccess`, `requireQuizAccess`, `requirePracticePlanAccess`) resolve a resource's owning org via its relation and delegate to `requireOrgAccess`; each throws `AuthzError` when the row is missing **or** access fails, so "not found" and "forbidden" are indistinguishable. Every server action calls the appropriate helper at the top: collection reads that accept `orgId` validate it instead of trusting it; mutations-by-id resolve the resource's org; player-facing reads scope to the session user. Read-by-id actions (`getPlay`/`getGamePlan`/`getQuiz`/`getPracticePlan`) keep returning `null` on a genuinely missing row but `throw AuthzError` on an org mismatch. Detail pages catch `AuthzError` (and treat `null`) as `notFound()`, so existence never leaks.

**Tech Stack:** Next.js 16.2.2 (App Router, server actions, `force-dynamic` pages), React 19.2, NextAuth v5 beta (`auth()` from `src/lib/auth.ts`, JWT session, `session.user.id`), Prisma 7.6 (`db` from `src/lib/db.ts`), Vitest 4 (jsdom, globals, `@` alias).

## Global Constraints

- **No new npm dependencies.** Use only what `package.json` already declares.
- **Do not change any existing exported function signature.** Client and page callers must keep compiling and working unchanged (e.g. `getQuizzes(orgId)`, `getRoster(orgId)`, `getLeaderboard(orgId, positionGroup)` keep their exact parameter lists). Scoping is added *inside* each function.
- **Follow the existing code style of each file** (double-quoted imports, `"use server"` directive at top of action files, `db`/`auth` import aliases, 2-space indent).
- **Vitest setup is fixed:** jsdom environment, `globals: true`, `@` → `./src` alias, setup file `tests/setup.ts`. New tests live under `tests/` mirroring `src/` (i.e. `tests/lib/authz.test.ts`).
- **Tests must not require a real database.** Mock `@/lib/db`, `@/lib/auth`, and `@/lib/membership` with `vi.mock`. No Postgres, no `.env`, no network.
- **`verify-invite` stays public.** `src/app/api/auth/verify-invite/route.ts` is intentionally unauthenticated (revealing a team name to a valid-code holder is the feature). Do not touch it.
- **Auth API routes are out of scope for 1a.** `src/app/api/auth/join/route.ts` and `.../signup/route.ts` perform user-by-email lookups for the credential/join flows (spec Section 3), not org-scoped resource access. Do not add org scoping to them here.
- **Per-task verification (sweep tasks 3–11):** the deliverable is *typecheck-clean and existing tests still green*, since these tasks add guard calls to real DB-backed actions that cannot run under Vitest. After each sweep task run **both**:
  - `npx tsc --noEmit` → Expected: no errors.
  - `npm run test:run` → Expected: all existing suites pass (the authz suite from tasks 1–2 plus the pre-existing suites).
  Also remove any import left unused by the rewrite (e.g. `auth`, `redirect`) so `npm run lint` stays clean.
- **`npm run build` and `npm run test:run` green** is the final acceptance gate (spec Section 7). `npm run build` may require a generated Prisma client and a `DATABASE_URL`; per the spec that environment is stood up at implementation time. It is not required to pass an individual sweep task — `npx tsc --noEmit` is the per-task typecheck proxy.

---

## Task 1: Authz core — `AuthzError`, `requireOrgAccess`, `requireMembership`

**Files:**
- Create: `src/lib/authz.ts`
- Test: `tests/lib/authz.test.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`; `db` from `@/lib/db`; `getUserMembership`, `isCoachRole` from `@/lib/membership`; `Membership` type from `@prisma/client`. Verified facts: `Membership` has compound unique `userId_orgId`; `auth()` resolves to a session with `user.id`; `getUserMembership(userId)` returns the user's primary membership **including `org`**; `isCoachRole(role)` returns true for `owner`/`coach`/`coordinator`.
- Produces (downstream plans 1b+ depend on these EXACT names/shapes — do not drift):
  - `class AuthzError extends Error` (`name === "AuthzError"`).
  - `requireOrgAccess(orgId: string, opts?: { coach?: boolean }): Promise<Membership>` — throws `AuthzError` when unauthenticated, not a member, or `coach` required but role fails; else returns the `Membership`.
  - `requireMembership(opts?: { coach?: boolean })` — resolves the signed-in user's primary membership (via `getUserMembership`), **including `org`**; throws `AuthzError` when unauthenticated, no membership, or coach check fails.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/authz.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    membership: { findUnique: vi.fn() },
    playbook: { findUnique: vi.fn() },
    play: { findUnique: vi.fn() },
    gamePlan: { findUnique: vi.fn() },
    quiz: { findUnique: vi.fn() },
    practicePlan: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/membership")>();
  return { ...actual, getUserMembership: vi.fn() };
});

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserMembership } from "@/lib/membership";
import {
  AuthzError,
  requireOrgAccess,
  requireMembership,
} from "@/lib/authz";

const mockAuth = vi.mocked(auth);
const mockGetUserMembership = vi.mocked(getUserMembership);
const mockMembershipFindUnique = vi.mocked(db.membership.findUnique);

const coachMembership = {
  id: "m1",
  userId: "u1",
  orgId: "o1",
  role: "coach",
  positionGroup: null,
  position: null,
};
const playerMembership = { ...coachMembership, id: "m2", role: "player" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireOrgAccess", () => {
  it("throws AuthzError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(requireOrgAccess("o1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws AuthzError when the user is not a member of the org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(null as never);
    await expect(requireOrgAccess("o1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership when the user is a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requireOrgAccess("o1")).resolves.toEqual(coachMembership);
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { userId_orgId: { userId: "u1", orgId: "o1" } },
    });
  });

  it("throws AuthzError for coach-only access when the role is player", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(playerMembership as never);
    await expect(
      requireOrgAccess("o1", { coach: true }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership for coach-only access when the role is coach", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(
      requireOrgAccess("o1", { coach: true }),
    ).resolves.toEqual(coachMembership);
  });
});

describe("requireMembership", () => {
  it("throws AuthzError when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(requireMembership()).rejects.toBeInstanceOf(AuthzError);
  });

  it("throws AuthzError when the user has no membership", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(null as never);
    await expect(requireMembership()).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns the membership (with org) when present", async () => {
    const withOrg = { ...coachMembership, org: { id: "o1", name: "Org" } };
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(withOrg as never);
    await expect(requireMembership()).resolves.toEqual(withOrg);
  });

  it("throws AuthzError for coach-only when the role is player", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetUserMembership.mockResolvedValue(playerMembership as never);
    await expect(
      requireMembership({ coach: true }),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/authz.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/authz"` (module does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/authz.ts`:

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserMembership, isCoachRole } from "@/lib/membership";
import type { Membership } from "@prisma/client";

export class AuthzError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Verifies the signed-in user belongs to orgId (optionally as coach). Throws AuthzError otherwise. */
export async function requireOrgAccess(
  orgId: string,
  opts: { coach?: boolean } = {},
): Promise<Membership> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError();
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new AuthzError();
  if (opts.coach && !isCoachRole(membership.role)) throw new AuthzError();
  return membership;
}

/** Resolves the signed-in user's primary membership (optionally requiring coach role). Throws AuthzError. */
export async function requireMembership(opts: { coach?: boolean } = {}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthzError();
  const membership = await getUserMembership(userId);
  if (!membership) throw new AuthzError();
  if (opts.coach && !isCoachRole(membership.role)) throw new AuthzError();
  return membership;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/authz.test.ts`
Expected: PASS — both `requireOrgAccess` and `requireMembership` describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authz.ts tests/lib/authz.test.ts
git commit -m "feat(authz): add AuthzError, requireOrgAccess, requireMembership"
```

---

## Task 2: Per-resource resolvers in `authz.ts`

**Files:**
- Modify: `src/lib/authz.ts`
- Test: `tests/lib/authz.test.ts`

**Interfaces:**
- Consumes: `requireOrgAccess` (Task 1); `db` model `findUnique` methods. Resource → org mapping: `Play` resolves org via `playbook.orgId` (relation); `Playbook`, `GamePlan`, `Quiz`, `PracticePlan` each carry `orgId` as a scalar column.
- Produces (downstream plans 1b+ depend on these EXACT names/shapes):
  - `requirePlaybookAccess(playbookId: string, opts?: { coach?: boolean }): Promise<{ playbook; membership }>`
  - `requirePlayAccess(playId: string, opts?: { coach?: boolean }): Promise<{ play; membership }>`
  - `requireGamePlanAccess(gamePlanId: string, opts?: { coach?: boolean }): Promise<{ gamePlan; membership }>`
  - `requireQuizAccess(quizId: string, opts?: { coach?: boolean }): Promise<{ quiz; membership }>`
  - `requirePracticePlanAccess(planId: string, opts?: { coach?: boolean }): Promise<{ plan; membership }>`
  - Each throws `AuthzError` when the row is missing OR access fails (missing and forbidden are indistinguishable).

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/authz.test.ts` (after the existing `describe` blocks). Add the resolver imports to the existing import from `@/lib/authz` at the top of the file so it reads:

```ts
import {
  AuthzError,
  requireOrgAccess,
  requireMembership,
  requirePlaybookAccess,
  requirePlayAccess,
  requireGamePlanAccess,
  requireQuizAccess,
  requirePracticePlanAccess,
} from "@/lib/authz";
```

Then append these describe blocks:

```ts
describe("requirePlaybookAccess", () => {
  it("throws AuthzError when the playbook does not exist", async () => {
    vi.mocked(db.playbook.findUnique).mockResolvedValue(null as never);
    await expect(requirePlaybookAccess("pb1")).rejects.toBeInstanceOf(
      AuthzError,
    );
  });

  it("returns { playbook, membership } for a member of the owning org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.playbook.findUnique).mockResolvedValue({
      id: "pb1",
      orgId: "o1",
    } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requirePlaybookAccess("pb1")).resolves.toEqual({
      playbook: { id: "pb1", orgId: "o1" },
      membership: coachMembership,
    });
  });

  it("throws AuthzError for a non-member of the owning org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.playbook.findUnique).mockResolvedValue({
      id: "pb1",
      orgId: "o1",
    } as never);
    mockMembershipFindUnique.mockResolvedValue(null as never);
    await expect(requirePlaybookAccess("pb1")).rejects.toBeInstanceOf(
      AuthzError,
    );
  });
});

describe("requirePlayAccess (org via playbook relation)", () => {
  it("throws AuthzError when the play does not exist", async () => {
    vi.mocked(db.play.findUnique).mockResolvedValue(null as never);
    await expect(requirePlayAccess("p1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns { play, membership } resolving org through playbook", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.play.findUnique).mockResolvedValue({
      id: "p1",
      playbook: { orgId: "o1" },
    } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requirePlayAccess("p1", { coach: true })).resolves.toEqual({
      play: { id: "p1", playbook: { orgId: "o1" } },
      membership: coachMembership,
    });
  });
});

describe("requireGamePlanAccess", () => {
  it("throws AuthzError when the game plan does not exist", async () => {
    vi.mocked(db.gamePlan.findUnique).mockResolvedValue(null as never);
    await expect(requireGamePlanAccess("g1")).rejects.toBeInstanceOf(
      AuthzError,
    );
  });

  it("returns { gamePlan, membership } for a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.gamePlan.findUnique).mockResolvedValue({
      id: "g1",
      orgId: "o1",
    } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requireGamePlanAccess("g1")).resolves.toEqual({
      gamePlan: { id: "g1", orgId: "o1" },
      membership: coachMembership,
    });
  });
});

describe("requireQuizAccess", () => {
  it("throws AuthzError when the quiz does not exist", async () => {
    vi.mocked(db.quiz.findUnique).mockResolvedValue(null as never);
    await expect(requireQuizAccess("q1")).rejects.toBeInstanceOf(AuthzError);
  });

  it("returns { quiz, membership } for a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.quiz.findUnique).mockResolvedValue({
      id: "q1",
      orgId: "o1",
    } as never);
    mockMembershipFindUnique.mockResolvedValue(playerMembership as never);
    await expect(requireQuizAccess("q1")).resolves.toEqual({
      quiz: { id: "q1", orgId: "o1" },
      membership: playerMembership,
    });
  });
});

describe("requirePracticePlanAccess", () => {
  it("throws AuthzError when the practice plan does not exist", async () => {
    vi.mocked(db.practicePlan.findUnique).mockResolvedValue(null as never);
    await expect(requirePracticePlanAccess("pp1")).rejects.toBeInstanceOf(
      AuthzError,
    );
  });

  it("returns { plan, membership } for a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(db.practicePlan.findUnique).mockResolvedValue({
      id: "pp1",
      orgId: "o1",
    } as never);
    mockMembershipFindUnique.mockResolvedValue(coachMembership as never);
    await expect(requirePracticePlanAccess("pp1")).resolves.toEqual({
      plan: { id: "pp1", orgId: "o1" },
      membership: coachMembership,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/authz.test.ts`
Expected: FAIL — `requirePlaybookAccess is not a function` (and the other four resolvers) are not yet exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `src/lib/authz.ts` (below `requireMembership`):

```ts
/** Resolves a playbook's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePlaybookAccess(
  playbookId: string,
  opts: { coach?: boolean } = {},
) {
  const playbook = await db.playbook.findUnique({ where: { id: playbookId } });
  if (!playbook) throw new AuthzError();
  const membership = await requireOrgAccess(playbook.orgId, opts);
  return { playbook, membership };
}

/** Resolves a play's org (via its playbook) and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePlayAccess(
  playId: string,
  opts: { coach?: boolean } = {},
) {
  const play = await db.play.findUnique({
    where: { id: playId },
    include: { playbook: { select: { orgId: true } } },
  });
  if (!play) throw new AuthzError();
  const membership = await requireOrgAccess(play.playbook.orgId, opts);
  return { play, membership };
}

/** Resolves a game plan's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requireGamePlanAccess(
  gamePlanId: string,
  opts: { coach?: boolean } = {},
) {
  const gamePlan = await db.gamePlan.findUnique({ where: { id: gamePlanId } });
  if (!gamePlan) throw new AuthzError();
  const membership = await requireOrgAccess(gamePlan.orgId, opts);
  return { gamePlan, membership };
}

/** Resolves a quiz's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requireQuizAccess(
  quizId: string,
  opts: { coach?: boolean } = {},
) {
  const quiz = await db.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AuthzError();
  const membership = await requireOrgAccess(quiz.orgId, opts);
  return { quiz, membership };
}

/** Resolves a practice plan's org and verifies access. Throws AuthzError if missing or forbidden. */
export async function requirePracticePlanAccess(
  planId: string,
  opts: { coach?: boolean } = {},
) {
  const plan = await db.practicePlan.findUnique({ where: { id: planId } });
  if (!plan) throw new AuthzError();
  const membership = await requireOrgAccess(plan.orgId, opts);
  return { plan, membership };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/authz.test.ts`
Expected: PASS — all `describe` blocks green (Task 1 + Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/authz.ts tests/lib/authz.test.ts
git commit -m "feat(authz): add per-resource access resolvers"
```

---

## Task 3: Sweep `play-actions.ts`

**Files:**
- Modify: `src/lib/actions/play-actions.ts`

**Functions in this file (all get scoping):** `getPlay`, `getPlaysByPlaybook`, `createPlay`, `updatePlay`, `getPlayVersions`, `restorePlayVersion`, `deletePlay`, `duplicatePlay`, `mirrorPlayAction`, `getPlaysByOrg`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `requirePlayAccess`, `requirePlaybookAccess` from `@/lib/authz`. `requirePlayAccess`/`requirePlaybookAccess` return `{ ..., membership }`; use `membership.userId` for `createdById`.
- Scoping decisions: `getPlay` is player-reachable (player play viewer) → **member-level**, returns `null` on missing, throws on cross-org. All other functions are coach authoring/versioning → **coach-only**.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–9 (the current import block) with:

```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { mirrorPlay as mirrorCanvasData } from "@/engine/mirror";
import { deserializeCanvas } from "@/engine/serialization";
import type { PlayType, Prisma } from "@prisma/client";
import {
  requireOrgAccess,
  requirePlayAccess,
  requirePlaybookAccess,
} from "@/lib/authz";
```

(`auth` and `redirect` are no longer used in this file — they are removed.)

- [ ] **Step 2: Rewrite `getPlay`**

```ts
export async function getPlay(id: string) {
  const play = await db.play.findUnique({
    where: { id },
    include: {
      assignments: true,
      playbook: true,
    },
  });
  if (!play) return null;
  await requireOrgAccess(play.playbook.orgId);
  return play;
}
```

- [ ] **Step 3: Rewrite `getPlaysByPlaybook`**

```ts
export async function getPlaysByPlaybook(playbookId: string) {
  await requirePlaybookAccess(playbookId, { coach: true });
  const plays = await db.play.findMany({
    where: { playbookId },
    orderBy: { createdAt: "desc" },
  });
  return plays;
}
```

- [ ] **Step 4: Rewrite `createPlay`** (keep the parameter object identical; change only the auth line and `createdById`)

```ts
export async function createPlay(data: {
  playbookId: string;
  name: string;
  formation: string;
  playType: PlayType;
  canvasData?: unknown;
  animationData?: unknown;
  notes?: string;
}) {
  const { membership } = await requirePlaybookAccess(data.playbookId, {
    coach: true,
  });

  const play = await db.play.create({
    data: {
      playbookId: data.playbookId,
      name: data.name,
      formation: data.formation,
      playType: data.playType,
      canvasData: data.canvasData ?? {},
      animationData: data.animationData ?? {},
      notes: data.notes,
      createdById: membership.userId,
    },
  });

  return play;
}
```

- [ ] **Step 5: Rewrite `updatePlay`** (signature unchanged)

```ts
export async function updatePlay(
  id: string,
  data: {
    name?: string;
    formation?: string;
    playType?: PlayType;
    canvasData?: Prisma.InputJsonValue;
    animationData?: Prisma.InputJsonValue;
    notes?: string;
    filmUrl?: string | null;
    filmTimestamp?: number | null;
    thumbnailUrl?: string;
    situationTags?: string[];
  },
) {
  const { membership } = await requirePlayAccess(id, { coach: true });

  // Snapshot the current state as a version before updating
  const current = await db.play.findUnique({ where: { id } });
  if (current) {
    const lastVersion = await db.playVersion.findFirst({
      where: { playId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;
    await db.playVersion.create({
      data: {
        playId: id,
        version: nextVersion,
        canvasData: current.canvasData ?? {},
        animationData: current.animationData ?? {},
        notes: current.notes,
        createdById: membership.userId,
      },
    });
  }

  const play = await db.play.update({
    where: { id },
    data,
  });

  return play;
}
```

- [ ] **Step 6: Rewrite `getPlayVersions`**

```ts
export async function getPlayVersions(playId: string) {
  await requirePlayAccess(playId, { coach: true });
  return db.playVersion.findMany({
    where: { playId },
    orderBy: { version: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
}
```

- [ ] **Step 7: Rewrite `restorePlayVersion`**

```ts
export async function restorePlayVersion(playId: string, versionId: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const version = await db.playVersion.findUnique({
    where: { id: versionId },
  });
  if (!version || version.playId !== playId) {
    throw new Error("Version not found");
  }

  // Snapshot current state before restoring (safety net)
  const current = await db.play.findUnique({ where: { id: playId } });
  if (current) {
    const lastVersion = await db.playVersion.findFirst({
      where: { playId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;
    await db.playVersion.create({
      data: {
        playId,
        version: nextVersion,
        canvasData: current.canvasData ?? {},
        animationData: current.animationData ?? {},
        notes: `Auto-saved before restoring v${version.version}`,
        createdById: membership.userId,
      },
    });
  }

  // Restore the version's data into the play
  const play = await db.play.update({
    where: { id: playId },
    data: {
      canvasData: version.canvasData ?? {},
      animationData: version.animationData ?? {},
    },
  });

  revalidatePath(`/designer`);
  return play;
}
```

- [ ] **Step 8: Rewrite `deletePlay`**

```ts
export async function deletePlay(id: string, playbookId: string) {
  await requirePlayAccess(id, { coach: true });

  await db.play.delete({
    where: { id },
  });

  revalidatePath(`/playbooks/${playbookId}`);
}
```

- [ ] **Step 9: Rewrite `duplicatePlay`**

```ts
export async function duplicatePlay(playId: string, newName?: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const original = await db.play.findUnique({
    where: { id: playId },
  });

  if (!original) throw new Error("Play not found");

  const play = await db.play.create({
    data: {
      playbookId: original.playbookId,
      name: newName ?? `${original.name} (Copy)`,
      formation: original.formation,
      playType: original.playType,
      situationTags: original.situationTags,
      canvasData: original.canvasData ?? {},
      animationData: original.animationData ?? {},
      notes: original.notes,
      thumbnailUrl: original.thumbnailUrl,
      createdById: membership.userId,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}
```

- [ ] **Step 10: Rewrite `mirrorPlayAction`**

```ts
export async function mirrorPlayAction(playId: string) {
  const { membership } = await requirePlayAccess(playId, { coach: true });

  const original = await db.play.findUnique({
    where: { id: playId },
  });

  if (!original) throw new Error("Play not found");

  const canvas = deserializeCanvas(original.canvasData);
  const mirrored = mirrorCanvasData(canvas);

  const play = await db.play.create({
    data: {
      playbookId: original.playbookId,
      name: `${original.name} (Mirrored)`,
      formation: original.formation,
      playType: original.playType,
      situationTags: original.situationTags,
      canvasData: JSON.parse(JSON.stringify(mirrored)),
      animationData: original.animationData ?? {},
      notes: original.notes,
      filmUrl: original.filmUrl,
      filmTimestamp: original.filmTimestamp,
      thumbnailUrl: null,
      createdById: membership.userId,
    },
  });

  revalidatePath(`/playbooks/${original.playbookId}`);
  return play;
}
```

- [ ] **Step 11: Rewrite `getPlaysByOrg`**

```ts
export async function getPlaysByOrg(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.play.findMany({
    where: {
      playbook: { orgId },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      formation: true,
      playType: true,
      thumbnailUrl: true,
    },
  });
}
```

- [ ] **Step 12: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 13: Commit**

```bash
git add src/lib/actions/play-actions.ts
git commit -m "feat(authz): org-scope play-actions server actions"
```

---

## Task 4: Sweep `playbook-actions.ts`

**Files:**
- Modify: `src/lib/actions/playbook-actions.ts`

**Functions in this file:** `getPlaybooks`, `createPlaybook`, `deletePlaybook`, `sharePlaybook`, `getSharedPlaybooks`, `revokePlaybookShare`, `importSharedPlaybook`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `requirePlaybookAccess`, `AuthzError` from `@/lib/authz`.
- Scoping decisions: all coach-only (playbook management is a coach surface). `revokePlaybookShare` resolves the share → owning playbook's org (only the owning org may revoke). `importSharedPlaybook` validates the caller belongs (coach) to `share.sharedWithOrgId` and imports into **that** org — replacing the old loose `db.membership.findFirst`.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–6 with:

```ts
"use server";

import { db } from "@/lib/db";
import type { Side, Visibility } from "@prisma/client";
import { requireOrgAccess, requirePlaybookAccess, AuthzError } from "@/lib/authz";
```

(`auth` and `redirect` are removed.)

- [ ] **Step 2: Rewrite `getPlaybooks`**

```ts
export async function getPlaybooks(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const playbooks = await db.playbook.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { plays: true } },
    },
  });
  return playbooks;
}
```

- [ ] **Step 3: Rewrite `createPlaybook`** (still reads `FormData`; validate `orgId` against the session after parsing)

```ts
export async function createPlaybook(formData: FormData) {
  const orgId = formData.get("orgId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const side = (formData.get("side") as Side) || "offense";
  const visibility =
    (formData.get("visibility") as Visibility) || "private";

  if (!orgId || !name) {
    throw new Error("Organization ID and name are required");
  }

  const membership = await requireOrgAccess(orgId, { coach: true });

  const playbook = await db.playbook.create({
    data: {
      orgId,
      name,
      description,
      side,
      visibility,
      createdById: membership.userId,
    },
  });

  return playbook;
}
```

- [ ] **Step 4: Rewrite `deletePlaybook`**

```ts
export async function deletePlaybook(id: string) {
  await requirePlaybookAccess(id, { coach: true });

  await db.playbook.delete({
    where: { id },
  });
}
```

- [ ] **Step 5: Rewrite `sharePlaybook`**

```ts
export async function sharePlaybook(playbookId: string, targetSlug: string) {
  const { playbook, membership } = await requirePlaybookAccess(playbookId, {
    coach: true,
  });

  // Find the target org by slug or invite code
  const targetOrg = await db.organization.findFirst({
    where: {
      OR: [{ slug: targetSlug }, { inviteCode: targetSlug }],
    },
  });

  if (!targetOrg) {
    throw new Error("Organization not found. Check the slug or invite code.");
  }

  if (targetOrg.id === playbook.orgId) {
    throw new Error("Cannot share a playbook with its own organization.");
  }

  const share = await db.playbookShare.create({
    data: {
      playbookId,
      sharedWithOrgId: targetOrg.id,
      sharedById: membership.userId,
    },
  });

  return { id: share.id, orgName: targetOrg.name };
}
```

- [ ] **Step 6: Rewrite `getSharedPlaybooks`**

```ts
export async function getSharedPlaybooks(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const shares = await db.playbookShare.findMany({
    where: { sharedWithOrgId: orgId },
    include: {
      playbook: {
        include: {
          org: { select: { name: true } },
          _count: { select: { plays: true } },
        },
      },
      sharedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return shares;
}
```

- [ ] **Step 7: Rewrite `revokePlaybookShare`** (owning org, resolved via the share's playbook)

```ts
export async function revokePlaybookShare(shareId: string) {
  const share = await db.playbookShare.findUnique({
    where: { id: shareId },
    include: { playbook: { select: { orgId: true } } },
  });
  if (!share) throw new AuthzError();
  await requireOrgAccess(share.playbook.orgId, { coach: true });

  await db.playbookShare.delete({ where: { id: shareId } });
}
```

- [ ] **Step 8: Rewrite `importSharedPlaybook`** (validate caller belongs to the shared-with org)

```ts
export async function importSharedPlaybook(shareId: string) {
  const share = await db.playbookShare.findUnique({
    where: { id: shareId },
    include: {
      playbook: {
        include: { plays: true },
      },
    },
  });

  if (!share) throw new AuthzError();

  // Caller must be a coach of the org the playbook was shared with.
  const membership = await requireOrgAccess(share.sharedWithOrgId, {
    coach: true,
  });

  // Create a copy of the playbook in the caller's org
  const newPlaybook = await db.playbook.create({
    data: {
      orgId: membership.orgId,
      name: `${share.playbook.name} (imported)`,
      description: share.playbook.description,
      side: share.playbook.side,
      visibility: "private",
      createdById: membership.userId,
      plays: {
        create: share.playbook.plays.map((play) => ({
          name: play.name,
          formation: play.formation,
          playType: play.playType,
          situationTags: play.situationTags,
          canvasData: play.canvasData ?? {},
          animationData: play.animationData ?? {},
          notes: play.notes,
          createdById: membership.userId,
        })),
      },
    },
  });

  return newPlaybook;
}
```

- [ ] **Step 9: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/actions/playbook-actions.ts
git commit -m "feat(authz): org-scope playbook-actions server actions"
```

---

## Task 5: Sweep `game-plan-actions.ts`

**Files:**
- Modify: `src/lib/actions/game-plan-actions.ts`

**Functions in this file:** `getGamePlans`, `getActiveGamePlan`, `createGamePlan`, `setActiveGamePlan`, `addPlayToGamePlan`, `removePlayFromGamePlan`, `getGamePlan`, `reorderGamePlanPlays`, `deleteGamePlan`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `requireGamePlanAccess`, `requirePlayAccess`, `AuthzError` from `@/lib/authz`.
- Scoping decisions: `getActiveGamePlan` is player-reachable (player home) → **member-level**. Everything else is coach-only. `setActiveGamePlan` uses the **validated** `gamePlan.orgId` for the deactivate scope instead of the client-supplied `orgId`. `addPlayToGamePlan` verifies the play and the game plan belong to the **same** org.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–4 with:

```ts
"use server";

import { db } from "@/lib/db";
import {
  requireOrgAccess,
  requireGamePlanAccess,
  requirePlayAccess,
  AuthzError,
} from "@/lib/authz";
```

(`auth` is removed.)

- [ ] **Step 2: Rewrite `getGamePlans`**

```ts
export async function getGamePlans(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.gamePlan.findMany({
    where: { orgId },
    include: {
      _count: { select: { plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 3: Rewrite `getActiveGamePlan`** (member-level — player home consumes this)

```ts
export async function getActiveGamePlan(orgId: string) {
  await requireOrgAccess(orgId);
  return db.gamePlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plays: {
        include: {
          play: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
```

- [ ] **Step 4: Rewrite `createGamePlan`**

```ts
export async function createGamePlan(data: {
  orgId: string;
  name: string;
  week?: number;
  opponent?: string;
}) {
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  return db.gamePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      week: data.week,
      opponent: data.opponent,
      createdById: membership.userId,
    },
  });
}
```

- [ ] **Step 5: Rewrite `setActiveGamePlan`** (deactivate scope uses validated `gamePlan.orgId`)

```ts
export async function setActiveGamePlan(orgId: string, gamePlanId: string) {
  const { gamePlan } = await requireGamePlanAccess(gamePlanId, { coach: true });

  // Deactivate all game plans for the game plan's org (validated, not client-supplied)
  await db.gamePlan.updateMany({
    where: { orgId: gamePlan.orgId },
    data: { isActive: false },
  });

  // Activate the selected one
  return db.gamePlan.update({
    where: { id: gamePlan.id },
    data: { isActive: true },
  });
}
```

- [ ] **Step 6: Rewrite `addPlayToGamePlan`** (both resources must share an org)

```ts
export async function addPlayToGamePlan(gamePlanId: string, playId: string) {
  const { gamePlan } = await requireGamePlanAccess(gamePlanId, { coach: true });
  const { play } = await requirePlayAccess(playId, { coach: true });
  if (play.playbook.orgId !== gamePlan.orgId) throw new AuthzError();

  // Get the next sort order
  const lastPlay = await db.gamePlanPlay.findFirst({
    where: { gamePlanId },
    orderBy: { sortOrder: "desc" },
  });

  const sortOrder = (lastPlay?.sortOrder ?? -1) + 1;

  return db.gamePlanPlay.create({
    data: {
      gamePlanId,
      playId,
      sortOrder,
    },
  });
}
```

- [ ] **Step 7: Rewrite `removePlayFromGamePlan`**

```ts
export async function removePlayFromGamePlan(
  gamePlanId: string,
  playId: string,
) {
  await requireGamePlanAccess(gamePlanId, { coach: true });

  return db.gamePlanPlay.delete({
    where: { gamePlanId_playId: { gamePlanId, playId } },
  });
}
```

- [ ] **Step 8: Rewrite `getGamePlan`** (coach-only read; `null` on missing)

```ts
export async function getGamePlan(id: string) {
  const gamePlan = await db.gamePlan.findUnique({
    where: { id },
    include: {
      plays: {
        include: { play: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!gamePlan) return null;
  await requireOrgAccess(gamePlan.orgId, { coach: true });
  return gamePlan;
}
```

- [ ] **Step 9: Rewrite `reorderGamePlanPlays`**

```ts
export async function reorderGamePlanPlays(
  gamePlanId: string,
  playIds: string[],
) {
  await requireGamePlanAccess(gamePlanId, { coach: true });

  // Update sortOrder for each play based on array index
  await Promise.all(
    playIds.map((playId, index) =>
      db.gamePlanPlay.update({
        where: { gamePlanId_playId: { gamePlanId, playId } },
        data: { sortOrder: index },
      }),
    ),
  );
}
```

- [ ] **Step 10: Rewrite `deleteGamePlan`**

```ts
export async function deleteGamePlan(id: string) {
  await requireGamePlanAccess(id, { coach: true });

  return db.gamePlan.delete({ where: { id } });
}
```

- [ ] **Step 11: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 12: Commit**

```bash
git add src/lib/actions/game-plan-actions.ts
git commit -m "feat(authz): org-scope game-plan-actions server actions"
```

---

## Task 6: Sweep `quiz-actions.ts`

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts`

**Functions in this file:** `getQuizzes`, `getQuiz`, `getPlayerQuizzes`, `createQuiz`, `addQuizQuestion`, `submitQuizAttempt`, `getQuizAttempts`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `requireQuizAccess`, `AuthzError` from `@/lib/authz`; `recordQuizScore` from `./progress-actions` (unchanged).
- Scoping decisions: `getQuiz` (player takes quiz) and `getPlayerQuizzes` and `submitQuizAttempt` are **member-level**; `getQuizAttempts` is member-level **and** enforces self (`userId === membership.userId`). `getQuizzes`, `createQuiz`, `addQuizQuestion` are coach-only. `submitQuizAttempt` and `createQuiz` now source the user id from `membership.userId`.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–6 with:

```ts
"use server";

import { db } from "@/lib/db";
import { recordQuizScore } from "./progress-actions";
import type { QuestionType } from "@prisma/client";
import { requireOrgAccess, requireQuizAccess, AuthzError } from "@/lib/authz";
```

(`auth` is removed.)

- [ ] **Step 2: Rewrite `getQuizzes`** (coach-only)

```ts
export async function getQuizzes(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true, attempts: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 3: Rewrite `getQuiz`** (member-level read; `null` on missing)

```ts
export async function getQuiz(id: string) {
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
  return quiz;
}
```

- [ ] **Step 4: Rewrite `getPlayerQuizzes`** (member-level)

```ts
export async function getPlayerQuizzes(orgId: string) {
  await requireOrgAccess(orgId);
  return db.quiz.findMany({
    where: { orgId },
    include: {
      _count: { select: { questions: true } },
      gamePlan: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}
```

- [ ] **Step 5: Rewrite `createQuiz`** (coach-only)

```ts
export async function createQuiz(data: {
  orgId: string;
  name: string;
  gamePlanId?: string;
  dueDate?: Date;
}) {
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  return db.quiz.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      gamePlanId: data.gamePlanId,
      dueDate: data.dueDate,
      createdById: membership.userId,
    },
  });
}
```

- [ ] **Step 6: Rewrite `addQuizQuestion`** (previously had NO auth — now coach-only, scoped to the quiz's org)

```ts
export async function addQuizQuestion(data: {
  quizId: string;
  playId: string;
  questionType: QuestionType;
  questionText: string;
  options?: unknown;
  correctZone?: unknown;
  correctAnswer?: string;
  sortOrder: number;
}) {
  await requireQuizAccess(data.quizId, { coach: true });

  return db.quizQuestion.create({
    data: {
      quizId: data.quizId,
      playId: data.playId,
      questionType: data.questionType,
      questionText: data.questionText,
      options: data.options ?? undefined,
      correctZone: data.correctZone ?? undefined,
      correctAnswer: data.correctAnswer,
      sortOrder: data.sortOrder,
    },
  });
}
```

- [ ] **Step 7: Rewrite `submitQuizAttempt`** (member-level; attempt attributed to `membership.userId`)

```ts
export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; answer: string; correct: boolean }[];
}) {
  const { membership } = await requireQuizAccess(data.quizId);

  const correctCount = data.answers.filter((a) => a.correct).length;
  const score = data.answers.length > 0 ? correctCount / data.answers.length : 0;

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: data.quizId,
      userId: membership.userId,
      score,
      answers: data.answers,
      completedAt: new Date(),
    },
  });

  // Update progress per play
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

  return attempt;
}
```

- [ ] **Step 8: Rewrite `getQuizAttempts`** (member-level + self)

```ts
export async function getQuizAttempts(quizId: string, userId: string) {
  const { membership } = await requireQuizAccess(quizId);
  if (userId !== membership.userId) throw new AuthzError();
  return db.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { startedAt: "desc" },
  });
}
```

- [ ] **Step 9: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/actions/quiz-actions.ts
git commit -m "feat(authz): org-scope quiz-actions server actions"
```

---

## Task 7: Sweep `practice-actions.ts`

**Files:**
- Modify: `src/lib/actions/practice-actions.ts`

**Functions in this file:** `getPracticePlans`, `getPracticePlan`, `createPracticePlan`, `updatePracticePlan`, `deletePracticePlan`, `addPracticePeriod`, `updatePracticePeriod`, `deletePracticePeriod`, `reorderPracticePeriods`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `requirePracticePlanAccess`, `AuthzError` from `@/lib/authz`.
- Scoping decisions: all coach-only. `getPracticePlan` returns `null` on missing, throws on cross-org. Period-level mutations (`updatePracticePeriod`, `deletePracticePeriod`) resolve `period → practicePlan → orgId` inline (no dedicated resolver). `reorderPracticePeriods` checks access at the plan level (individual `periodIds` are not re-verified — accepted residual, consistent with `reorderGamePlanPlays`).

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–5 with:

```ts
"use server";

import { db } from "@/lib/db";
import {
  requireOrgAccess,
  requirePracticePlanAccess,
  AuthzError,
} from "@/lib/authz";
```

(`auth` and `redirect` are removed.)

- [ ] **Step 2: Rewrite `getPracticePlans`**

```ts
export async function getPracticePlans(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const plans = await db.practicePlan.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { periods: true } },
      periods: { select: { durationMin: true } },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    totalDuration: plan.periods.reduce((sum, p) => sum + p.durationMin, 0),
    periodCount: plan._count.periods,
  }));
}
```

- [ ] **Step 3: Rewrite `getPracticePlan`** (coach-only read; `null` on missing)

```ts
export async function getPracticePlan(id: string) {
  const plan = await db.practicePlan.findUnique({
    where: { id },
    include: {
      periods: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!plan) return null;
  await requireOrgAccess(plan.orgId, { coach: true });
  return plan;
}
```

- [ ] **Step 4: Rewrite `createPracticePlan`**

```ts
export async function createPracticePlan(data: {
  orgId: string;
  name: string;
  date?: string | null;
  notes?: string | null;
}) {
  const membership = await requireOrgAccess(data.orgId, { coach: true });

  const plan = await db.practicePlan.create({
    data: {
      orgId: data.orgId,
      name: data.name,
      date: data.date ? new Date(data.date) : null,
      notes: data.notes ?? null,
      createdById: membership.userId,
    },
  });

  return plan;
}
```

- [ ] **Step 5: Rewrite `updatePracticePlan`**

```ts
export async function updatePracticePlan(
  id: string,
  data: { name?: string; date?: string | null; notes?: string | null },
) {
  await requirePracticePlanAccess(id, { coach: true });

  const plan = await db.practicePlan.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.date !== undefined && {
        date: data.date ? new Date(data.date) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return plan;
}
```

- [ ] **Step 6: Rewrite `deletePracticePlan`**

```ts
export async function deletePracticePlan(id: string) {
  await requirePracticePlanAccess(id, { coach: true });

  await db.practicePlan.delete({ where: { id } });
}
```

- [ ] **Step 7: Rewrite `addPracticePeriod`**

```ts
export async function addPracticePeriod(data: {
  practicePlanId: string;
  name: string;
  durationMin: number;
  playIds?: string[];
  notes?: string | null;
}) {
  await requirePracticePlanAccess(data.practicePlanId, { coach: true });

  // Get next sort order
  const maxOrder = await db.practicePeriod.findFirst({
    where: { practicePlanId: data.practicePlanId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const period = await db.practicePeriod.create({
    data: {
      practicePlanId: data.practicePlanId,
      name: data.name,
      durationMin: data.durationMin,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      playIds: data.playIds ?? [],
      notes: data.notes ?? null,
    },
  });

  return period;
}
```

- [ ] **Step 8: Rewrite `updatePracticePeriod`** (resolve org via the period's plan)

```ts
export async function updatePracticePeriod(
  id: string,
  data: {
    name?: string;
    durationMin?: number;
    playIds?: string[];
    notes?: string | null;
  },
) {
  const period = await db.practicePeriod.findUnique({
    where: { id },
    include: { practicePlan: { select: { orgId: true } } },
  });
  if (!period) throw new AuthzError();
  await requireOrgAccess(period.practicePlan.orgId, { coach: true });

  const updated = await db.practicePeriod.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
      ...(data.playIds !== undefined && { playIds: data.playIds }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return updated;
}
```

- [ ] **Step 9: Rewrite `deletePracticePeriod`** (resolve org via the period's plan)

```ts
export async function deletePracticePeriod(id: string) {
  const period = await db.practicePeriod.findUnique({
    where: { id },
    include: { practicePlan: { select: { orgId: true } } },
  });
  if (!period) throw new AuthzError();
  await requireOrgAccess(period.practicePlan.orgId, { coach: true });

  await db.practicePeriod.delete({ where: { id } });
}
```

- [ ] **Step 10: Rewrite `reorderPracticePeriods`**

```ts
export async function reorderPracticePeriods(
  planId: string,
  periodIds: string[],
) {
  await requirePracticePlanAccess(planId, { coach: true });

  await db.$transaction(
    periodIds.map((id, index) =>
      db.practicePeriod.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}
```

- [ ] **Step 11: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 12: Commit**

```bash
git add src/lib/actions/practice-actions.ts
git commit -m "feat(authz): org-scope practice-actions server actions"
```

---

## Task 8: Sweep `progress-actions.ts`

**Files:**
- Modify: `src/lib/actions/progress-actions.ts`

**Functions in this file:** `recordPlayView`, `recordQuizScore`, `getPlayerProgress`, `getDueForReview`.

**Interfaces:**
- Consumes: `auth` from `@/lib/auth` (kept); `AuthzError` from `@/lib/authz` (added).
- Scoping decisions: `recordPlayView` and `recordQuizScore` are **left unchanged** — they already write only to the session user's own progress rows (`userId = session.user.id`), so they cannot read or destroy another org's data (the spec's threat model). Documented accepted residual: a player could record a self-only view/score against a play id outside their org; this affects only their own progress and is not cross-org read/destroy. `getPlayerProgress(userId)` and `getDueForReview(userId)` accept a `userId` argument and must enforce that it is the session user.

- [ ] **Step 1: Add the `AuthzError` import**

Change the import block (lines 1–10) so the imports read (add the `authz` import; keep everything else):

```ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  calculateNextReview,
  qualityFromScore,
  masteryFromInterval,
} from "@/lib/spaced-repetition/sm2";
import type { MasteryLevel } from "@prisma/client";
import { AuthzError } from "@/lib/authz";
```

- [ ] **Step 2: Leave `recordPlayView` and `recordQuizScore` unchanged**

No edits. Confirm they still begin with the existing session guard (`if (!session?.user?.id) throw new Error("Unauthorized");`) and write with `userId = session.user.id`.

- [ ] **Step 3: Rewrite `getPlayerProgress`** (enforce self)

```ts
export async function getPlayerProgress(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new AuthzError();
  if (userId !== session.user.id) throw new AuthzError();

  return db.playerProgress.findMany({
    where: { userId },
    include: {
      play: {
        include: {
          playbook: true,
        },
      },
    },
    orderBy: { nextReviewAt: "asc" },
  });
}
```

- [ ] **Step 4: Rewrite `getDueForReview`** (enforce self)

```ts
export async function getDueForReview(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new AuthzError();
  if (userId !== session.user.id) throw new AuthzError();

  const now = new Date();

  return db.playerProgress.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
    },
    include: {
      play: true,
    },
    orderBy: { nextReviewAt: "asc" },
    take: 10,
  });
}
```

- [ ] **Step 5: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/progress-actions.ts
git commit -m "feat(authz): scope player progress reads to the session user"
```

---

## Task 9: Sweep `analytics-actions.ts`

**Files:**
- Modify: `src/lib/actions/analytics-actions.ts`

**Functions in this file:** `getTeamAnalytics`, `getInstallProgress`, `getLeaderboard`, `getPlayerRank`.

**Interfaces:**
- Consumes: `requireOrgAccess` from `@/lib/authz`.
- Scoping decisions: `getTeamAnalytics` and `getInstallProgress` expose whole-team aggregates → **coach-only**. `getLeaderboard` is consumed both by the coach analytics leaderboard component **and** transitively by `getPlayerRank` (player progress page) → **member-level**. `getPlayerRank` is **member-level**; it also calls `getLeaderboard` which re-checks — the double check is intentional and acceptable.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–4 with:

```ts
"use server";

import { db } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
```

(`auth` was imported but unused; it is removed and replaced by `requireOrgAccess`.)

- [ ] **Step 2: Add the guard to `getTeamAnalytics`**

Insert as the **first line** of the function body (before the `const [...] = await Promise.all([...])`):

```ts
export async function getTeamAnalytics(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const [memberships, playbooks, activeGamePlan, recentAttempts] =
    await Promise.all([
```

(The rest of the function body is unchanged.)

- [ ] **Step 3: Add the guard to `getInstallProgress`**

Insert as the **first line** of the function body:

```ts
export async function getInstallProgress(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const [activeGamePlan, players] = await Promise.all([
```

(The rest of the function body is unchanged.)

- [ ] **Step 4: Add the guard to `getLeaderboard`** (member-level)

Insert as the **first line** of the function body:

```ts
export async function getLeaderboard(
  orgId: string,
  positionGroup?: string | null,
): Promise<LeaderboardEntry[]> {
  await requireOrgAccess(orgId);
  const memberships = await db.membership.findMany({
```

(The rest of the function body is unchanged.)

- [ ] **Step 5: Add the guard to `getPlayerRank`** (member-level)

```ts
export async function getPlayerRank(orgId: string, userId: string) {
  await requireOrgAccess(orgId);
  const leaderboard = await getLeaderboard(orgId);
  const total = leaderboard.length;
  const entry = leaderboard.find((e) => e.userId === userId);
  return {
    rank: entry?.rank ?? null,
    total,
    compositeScore: entry?.compositeScore ?? 0,
  };
}
```

- [ ] **Step 6: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/analytics-actions.ts
git commit -m "feat(authz): org-scope analytics-actions server actions"
```

---

## Task 10: Sweep `roster-actions.ts`

**Files:**
- Modify: `src/lib/actions/roster-actions.ts`

**Functions in this file:** `getRoster`, `removeMember`, `updateMemberPosition`, `updateMemberRole`, `regenerateInviteCode`, `getOrganization`.

**Interfaces:**
- Consumes: `requireOrgAccess`, `AuthzError` from `@/lib/authz`; `generateInviteCode` from `@/lib/utils`; `revalidatePath` from `next/cache`; `MemberRole` type.
- Scoping decisions: `updateMemberRole` stays **owner-only**. `removeMember` and `regenerateInviteCode` **preserve their original `["owner","coach"]` gate** — an explicit role check layered on top of `requireOrgAccess(orgId)`, so `coordinator` is NOT admitted (a security-tightening plan must not loosen an existing gate). `getRoster`, `updateMemberPosition`, and `getOrganization` had no prior role gate and become coach-only via `requireOrgAccess({ coach: true })`. Membership-row mutations resolve the target membership's `orgId` and check the caller against it. No existing gate is loosened.

- [ ] **Step 1: Replace the file's imports**

Replace lines 1–7 with:

```ts
"use server";

import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@prisma/client";
import { requireOrgAccess, AuthzError } from "@/lib/authz";
```

(`auth` is removed.)

- [ ] **Step 2: Rewrite `getRoster`**

```ts
export async function getRoster(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  const memberships = await db.membership.findMany({
    where: { orgId },
    include: {
      user: {
        include: {
          playerProgress: {
            select: { masteryLevel: true, lastViewedAt: true },
          },
        },
      },
    },
    orderBy: [{ role: "asc" }],
  });
  return memberships;
}
```

- [ ] **Step 3: Rewrite `removeMember`** (resolve target org; keep the original owner/coach gate; missing → AuthzError)

```ts
export async function removeMember(membershipId: string) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  const caller = await requireOrgAccess(membership.orgId);
  if (!["owner", "coach"].includes(caller.role)) throw new AuthzError();

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath(`/team/${membership.orgId}/roster`);
}
```

- [ ] **Step 4: Rewrite `updateMemberPosition`** (previously had NO auth — now coach-level, scoped to target org)

```ts
export async function updateMemberPosition(
  membershipId: string,
  position: string
) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  await requireOrgAccess(membership.orgId, { coach: true });

  await db.membership.update({
    where: { id: membershipId },
    data: { position },
  });
}
```

- [ ] **Step 5: Rewrite `updateMemberRole`** (owner-only; resolve target org via `requireOrgAccess` then assert owner)

```ts
export async function updateMemberRole(
  membershipId: string,
  role: MemberRole
) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new AuthzError();

  const caller = await requireOrgAccess(membership.orgId);
  if (caller.role !== "owner") throw new AuthzError();

  await db.membership.update({
    where: { id: membershipId },
    data: { role },
  });
  revalidatePath(`/team/${membership.orgId}/roster`);
}
```

- [ ] **Step 6: Rewrite `regenerateInviteCode`** (keep the original owner/coach gate)

```ts
export async function regenerateInviteCode(orgId: string) {
  const caller = await requireOrgAccess(orgId);
  if (!["owner", "coach"].includes(caller.role)) throw new AuthzError();

  const newCode = generateInviteCode();
  await db.organization.update({
    where: { id: orgId },
    data: { inviteCode: newCode },
  });

  revalidatePath(`/team/${orgId}/roster`);
  revalidatePath(`/team/${orgId}/settings`);

  return newCode;
}
```

- [ ] **Step 7: Rewrite `getOrganization`** (coach-level — exposes `inviteCode`)

```ts
export async function getOrganization(orgId: string) {
  await requireOrgAccess(orgId, { coach: true });
  return db.organization.findUnique({
    where: { id: orgId },
  });
}
```

- [ ] **Step 8: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/actions/roster-actions.ts
git commit -m "feat(authz): org-scope roster-actions server actions"
```

---

## Task 11: Detail pages — catch `AuthzError` → `notFound()`

**Files:**
- Modify: `src/app/(coach)/playbooks/[id]/page.tsx`
- Modify: `src/app/(coach)/game-plans/[id]/page.tsx`
- Modify: `src/app/(coach)/practice/[id]/page.tsx`
- Modify: `src/app/(player)/plays/[id]/page.tsx`
- Modify: `src/app/(player)/quiz/[id]/page.tsx`

**Interfaces:**
- Consumes: `AuthzError` from `@/lib/authz`; `requireOrgAccess` from `@/lib/authz` (playbooks page only); `notFound` from `next/navigation`.
- Design: read-by-id actions now `throw AuthzError` on cross-org access and return `null` on a genuinely missing row. Each page maps **both** outcomes to `notFound()`, so existence never leaks (no 403, identical to a nonexistent id). The `(coach)/playbooks/[id]` page reads the playbook via an inline `db.playbook.findUnique` (not an action), so it guards with `requireOrgAccess` directly. Cross-plan note: the designer's `getPlay` load can now throw on cross-org access — graceful in-app `.catch` UX for the designer is spec Section 4 (Phase 1 safety net), not part of 1a; legitimate coach use (own play; the coach is a member) does not throw, so there is no 1a regression.

- [ ] **Step 1: Update `(coach)/playbooks/[id]/page.tsx`**

Change the import on line 1 from:

```ts
import { redirect } from "next/navigation";
```

to:

```ts
import { redirect, notFound } from "next/navigation";
```

Add this import alongside the other `@/lib` imports (e.g. after the `getPlaysByPlaybook` import on line 5):

```ts
import { requireOrgAccess, AuthzError } from "@/lib/authz";
```

Replace the fetch-and-null-check block (current lines 24–37) with:

```ts
  const playbook = await db.playbook.findUnique({
    where: { id },
    include: {
      shares: {
        include: {
          sharedWith: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!playbook) notFound();

  try {
    await requireOrgAccess(playbook.orgId, { coach: true });
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }

  const plays = await getPlaysByPlaybook(id);
```

- [ ] **Step 2: Update `(coach)/game-plans/[id]/page.tsx`**

Add this import after the existing `getGamePlan` import (line 4):

```ts
import { AuthzError } from "@/lib/authz";
```

Replace the current lines 22–24:

```ts
  const { id } = await params;
  const gamePlan = await getGamePlan(id);
  if (!gamePlan) notFound();
```

with:

```ts
  const { id } = await params;
  let gamePlan;
  try {
    gamePlan = await getGamePlan(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!gamePlan) notFound();
```

- [ ] **Step 3: Update `(coach)/practice/[id]/page.tsx`**

Change the import on line 1 from:

```ts
import { redirect } from "next/navigation";
```

to:

```ts
import { redirect, notFound } from "next/navigation";
```

Add this import after the existing `getPracticePlan` import (line 5):

```ts
import { AuthzError } from "@/lib/authz";
```

Replace the current lines 26–27:

```ts
  const plan = await getPracticePlan(id);
  if (!plan) redirect("/practice");
```

with:

```ts
  let plan;
  try {
    plan = await getPracticePlan(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!plan) notFound();
```

- [ ] **Step 4: Update `(player)/plays/[id]/page.tsx`**

Add this import after the existing `getPlay` import (line 4):

```ts
import { AuthzError } from "@/lib/authz";
```

Replace the current lines 22–24:

```ts
  const { id } = await params;
  const play = await getPlay(id);
  if (!play) notFound();
```

with:

```ts
  const { id } = await params;
  let play;
  try {
    play = await getPlay(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!play) notFound();
```

- [ ] **Step 5: Update `(player)/quiz/[id]/page.tsx`**

Add this import after the existing `getQuiz` import (line 3):

```ts
import { AuthzError } from "@/lib/authz";
```

Replace the current lines 17–19:

```ts
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) notFound();
```

with:

```ts
  const { id } = await params;
  let quiz;
  try {
    quiz = await getQuiz(id);
  } catch (e) {
    if (e instanceof AuthzError) notFound();
    throw e;
  }
  if (!quiz) notFound();
```

- [ ] **Step 6: Verify typecheck and existing tests**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run test:run`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(coach)/playbooks/[id]/page.tsx" "src/app/(coach)/game-plans/[id]/page.tsx" "src/app/(coach)/practice/[id]/page.tsx" "src/app/(player)/plays/[id]/page.tsx" "src/app/(player)/quiz/[id]/page.tsx"
git commit -m "feat(authz): detail pages render notFound() on scope mismatch"
```

---

## Final acceptance (run once, after Task 11)

- [ ] **Full test suite green**

Run: `npm run test:run`
Expected: all suites pass, including `tests/lib/authz.test.ts`.

- [ ] **Full build green** (requires a generated Prisma client + `DATABASE_URL` per spec Section 7)

Run: `npm run build`
Expected: build completes with no type errors.

---

## Coverage map (spec Section 1 → tasks)

- "New helper `requireOrgAccess(orgId, { coach })` … returns the membership on success and throws on failure" → Task 1.
- "A convenience wrapper resolves a resource's `orgId` via its relation (e.g. play → playbook → orgId)" → Task 2 (`requirePlayAccess`) + resolvers for playbook/gameplan/quiz/practiceplan.
- "Every server action in `src/lib/actions/*` gets a scoping check" → Tasks 3–10 (all 8 files; every exported function enumerated).
- "Actions that currently accept `orgId` from the client … derive/validate it against the session membership instead of trusting the argument" → Tasks 3–10 (all `get*(orgId)` collection reads + `create*` actions that take `orgId`; `setActiveGamePlan` uses the validated org).
- "Detail pages return `notFound()` on scope mismatch — identical to a nonexistent id" → Task 11 (5 pages).
- "`verify-invite` stays public; documented as accepted" → Global Constraints (untouched).
- Spec risk note "the sweep must enumerate all `findUnique`/`update`/`delete` by-id calls in `src/lib/actions/` and API routes" → actions covered in Tasks 3–10; API routes addressed in Global Constraints (`verify-invite` public; `join`/`signup` are auth flows, Section 3, out of 1a scope).

## Deviations & discoveries (report to team lead)

1. **No existing gate loosened (stricter gates preserved).** `removeMember` and `regenerateInviteCode` keep their original `["owner","coach"]` role set via an explicit check layered on top of `requireOrgAccess(orgId)` — `coordinator` is deliberately NOT admitted, even though `isCoachRole` would include it. `updateMemberRole` stays owner-only. Actions that newly gain a coach gate (`getRoster`, `updateMemberPosition`, `getOrganization`, and the coach-only reads/mutations across the other files) had no prior role restriction, so those are strictly a tightening.
2. **Redirect → throw for unauthenticated callers.** Actions that previously did `if (!session) redirect("/login")` (play/playbook/practice actions) now `throw AuthzError` instead. This is the spec's intended propagate-to-caller model (surfaced by error boundaries / toasts) and is safe — the coach/player layouts already redirect unauthenticated users before any action runs.
3. **Actions the spec did not name individually but that were unprotected** and are now scoped: `addQuizQuestion` (had **no** auth check at all), `updateMemberPosition` (had **no** auth check at all), and the share/period helpers (`revokePlaybookShare`, `importSharedPlaybook`, `updatePracticePeriod`, `deletePracticePeriod`) which have no dedicated resolver in the pinned contract and are handled with inline org resolution.
4. **`importSharedPlaybook` hardened.** It previously imported into whatever org `db.membership.findFirst({ where: { userId } })` returned; it now validates the caller against `share.sharedWithOrgId` and imports into that org.
5. **Accepted residuals (self-scoped, not cross-org):** `recordPlayView`/`recordQuizScore` are unchanged — they only ever write the session user's own progress. `reorderPracticePeriods`/`reorderGamePlanPlays` check access at the parent level and do not re-verify each child id.
