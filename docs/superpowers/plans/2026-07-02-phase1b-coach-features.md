# PlayForge Phase 1b — Dead Coach Features Come Alive (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the six silently-broken coach features identified in Phase 1 Section 2 — New Playbook dialog, quiz management, Game Plans create, Team Files persistence, print output, and two designer bugs — so every visible coach control does what it claims.

**Architecture:** Server actions in `src/lib/actions/*` own all data access and derive org scope from the session (never from the client). Coach pages are server components that authorize + fetch, then hand off interactive pieces to small `"use client"` components. Modals reuse `@radix-ui/react-dialog` directly (there is no `ui/dialog` wrapper) following the existing print dialog in `designer/page.tsx`. New logic is covered by vitest unit tests that mock the database and authz layer — no real Postgres.

**Tech Stack:** Next.js 16.2.2 (App Router, async `params`), React 19.2.4, Prisma 7.6 (`@prisma/adapter-pg`), Tailwind 4, `@radix-ui/react-dialog` 1.1.17, framer-motion, lucide-react, vitest 4 + @testing-library/react (jsdom).

## Global Constraints

- **No new npm dependencies.** Everything needed is already in `package.json`.
- **Tailwind only, existing dark-theme classes.** Do NOT migrate to CSS-variable/semantic tokens — that is Phase 2. Copy the class strings used by neighboring components (`bg-zinc-900`, `border-zinc-700/60`, `rounded-2xl`, `text-zinc-100`, etc.).
- **Follow existing component patterns.** There is no `src/components/ui/dialog.tsx`. **Create/form dialogs** (New Playbook, Create Game Plan) use `@radix-ui/react-dialog` directly, imported as `import * as Dialog from "@radix-ui/react-dialog"`, matching the print dialog's styling (`src/app/(coach)/designer/page.tsx:895-958`). **Delete confirmations** (quiz delete, team-file delete) consume the shared `ConfirmDialog` from Plan 1d (`@/components/ui/confirm-dialog`) — do NOT hand-roll a confirm dialog.
- **Server actions derive org scope from the session**, via the plan-1a authz helpers — never trust an `orgId`/id passed from the client for authorization.
- **Detail pages return `notFound()` on scope mismatch** (identical to a nonexistent id — existence never leaks).
- **Tests live under `tests/` mirroring `src/`.** Mock `@/lib/db` and `@/lib/authz`; also mock `@/lib/auth` when importing any action module (importing `@/lib/auth` initializes NextAuth at module load). No real database.
- **Prisma gotcha:** run `npx prisma generate` after any `schema.prisma` change and BEFORE typecheck/tests — the typed client (`db.teamFile`) must exist or everything downstream fails to compile.
- **Verification bar (spec §7):** `npm run build` and `npm run test:run` must be green.
- Node `>=20.9.0`.

## Interfaces consumed from Plan 1a (treat as EXISTING — do NOT re-implement)

From `src/lib/authz.ts`:

- `class AuthzError extends Error` — thrown on authorization failure.
- `requireOrgAccess(orgId: string, opts?: { coach?: boolean }): Promise<Membership>` — throws `AuthzError`.
- `requireMembership(opts?: { coach?: boolean }): Promise<Membership>` — resolves the session user's membership **including its `org` relation**; the returned `Membership` has `id`, `userId`, `orgId`, `role`, and `org`. Throws `AuthzError`.
- `requireQuizAccess(quizId: string, opts?: { coach?: boolean }): Promise<{ quiz: Quiz; membership: Membership }>` — throws `AuthzError`. (Used here for **authorization only**; the returned `quiz` shape's includes are not relied upon — question lists are loaded separately via `getQuiz`.)
- `requirePlaybookAccess`, `requireGamePlanAccess` — analogous (not needed by this plan but available).

`Membership` and `Quiz` are the Prisma model types from `@prisma/client`.

## Interfaces consumed from Plan 1d (treat as EXISTING — do NOT re-implement)

Plan 1d (safety net) creates the shared confirmation dialog. Both delete confirmations in this plan consume it — do NOT hand-roll a Radix confirm dialog.

From `src/components/ui/confirm-dialog.tsx`:

- `ConfirmDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void })` — a controlled confirmation modal built on raw `@radix-ui/react-dialog`. The caller owns the `open` state; the component renders the Cancel/confirm buttons itself (label + destructive styling from props) and calls `onConfirm` when the confirm button is pressed. There is no `pending`/loading prop — surface progress via the caller's toast, and drive teardown from the caller (navigate away, or set `open` false + `onOpenChange`).

> **Cross-plan dependency / sequencing:** Tasks 2 and 7 import `ConfirmDialog`, so plan 1d's `confirm-dialog.tsx` must exist before those two tasks are executed. The team lead sequences 1d's ConfirmDialog ahead of these tasks. This plan also OWNS wiring the **team-file delete** confirmation (Task 7) so plan 1d does not need to re-edit the rewritten Team Files page; plan 1d still owns creating `ConfirmDialog` and wiring its own call sites (invite-code regenerate, practice-period delete).

## File Structure

**Create:**
- `src/app/(coach)/quizzes/[id]/page.tsx` — coach quiz detail (server component).
- `src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx` — rename + delete-with-confirm (client).
- `src/app/(coach)/playbooks/new-playbook-dialog.tsx` — New Playbook dialog (client).
- `src/app/(coach)/game-plans/create-game-plan-dialog.tsx` — Create Game Plan dialog (client).
- `src/lib/actions/team-file-actions.ts` — org-scoped Team File CRUD server actions.
- `tests/lib/actions/quiz-actions.test.ts`
- `tests/lib/actions/team-file-actions.test.ts`
- `tests/engine/export.test.ts`
- `tests/components/play/assignment-panel.test.tsx`

**Modify:**
- `src/lib/actions/quiz-actions.ts` — add `updateQuiz`, `deleteQuiz`.
- `src/app/(coach)/quizzes/page.tsx` — link quiz cards to the detail route.
- `src/app/(coach)/playbooks/page.tsx` — replace the dead TODO button with the dialog.
- `src/app/(coach)/game-plans/page.tsx` — add the Create dialog button.
- `prisma/schema.prisma` — add `TeamFile` model + back-relations on `Organization` and `User`.
- `src/app/(coach)/settings/files/page.tsx` — swap localStorage for the DB actions.
- `src/engine/export.ts` — extract `getStageDataURL`.
- `src/app/(coach)/designer/page.tsx` — capture the stage PNG for print; pass `onMirror` to the assignment panel.
- `src/components/play/assignment-panel.tsx` — wire the Mirror button; fix routeType casing.

**Task order & dependencies:** T1→T2 (quiz actions before detail page). T3, T4 independent. T5→T6→T7 (model→actions→page). T8, T9 independent. Recommended sequence: T1, T2, T3, T4, T5, T6, T7, T8, T9.

---

### Task 1: Quiz management server actions (`updateQuiz`, `deleteQuiz`)

**Files:**
- Modify: `src/lib/actions/quiz-actions.ts`
- Test: `tests/lib/actions/quiz-actions.test.ts`

**Interfaces:**
- Consumes: `requireQuizAccess(id, { coach: true })` and `AuthzError` from `@/lib/authz`; `db.quiz.update`, `db.quiz.delete` from `@/lib/db`.
- Produces (relied on by Task 2):
  - `updateQuiz(id: string, data: { name: string }): Promise<Quiz>`
  - `deleteQuiz(id: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/actions/quiz-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    quiz: { update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/authz", () => ({
  requireQuizAccess: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));
// Importing quiz-actions.ts pulls in @/lib/auth (NextAuth inits on import) via
// its top-level `auth` import and the transitive progress-actions import.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { updateQuiz, deleteQuiz } from "@/lib/actions/quiz-actions";
import { db } from "@/lib/db";
import { requireQuizAccess, AuthzError } from "@/lib/authz";

const mockedRequire = vi.mocked(requireQuizAccess);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateQuiz", () => {
  it("authorizes as coach, then updates the name", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.update).mockResolvedValue({ id: "q1", name: "New" } as never);

    await updateQuiz("q1", { name: "New" });

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { name: "New" },
    });
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(updateQuiz("q1", { name: "New" })).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.update).not.toHaveBeenCalled();
  });
});

describe("deleteQuiz", () => {
  it("authorizes as coach, then deletes", async () => {
    mockedRequire.mockResolvedValue({ quiz: { id: "q1" }, membership: {} } as never);
    vi.mocked(db.quiz.delete).mockResolvedValue({ id: "q1" } as never);

    await deleteQuiz("q1");

    expect(mockedRequire).toHaveBeenCalledWith("q1", { coach: true });
    expect(db.quiz.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
  });

  it("propagates AuthzError and never touches the db when access is denied", async () => {
    mockedRequire.mockRejectedValue(new AuthzError("denied"));

    await expect(deleteQuiz("q1")).rejects.toBeInstanceOf(AuthzError);
    expect(db.quiz.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/actions/quiz-actions.test.ts`
Expected: FAIL — `updateQuiz`/`deleteQuiz` are not exported from `quiz-actions.ts`.

- [ ] **Step 3: Implement the actions**

In `src/lib/actions/quiz-actions.ts`, add the authz import near the top (after the existing imports):

```ts
import { requireQuizAccess } from "@/lib/authz";
```

Then append these two exported functions at the end of the file:

```ts
export async function updateQuiz(id: string, data: { name: string }) {
  await requireQuizAccess(id, { coach: true });
  return db.quiz.update({
    where: { id },
    data: { name: data.name },
  });
}

export async function deleteQuiz(id: string) {
  await requireQuizAccess(id, { coach: true });
  await db.quiz.delete({ where: { id } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/actions/quiz-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/quiz-actions.ts tests/lib/actions/quiz-actions.test.ts
git commit -m "feat(quiz): add coach-scoped updateQuiz and deleteQuiz actions"
```

---

### Task 2: Quiz detail route (list + rename + delete)

**Files:**
- Create: `src/app/(coach)/quizzes/[id]/page.tsx`
- Create: `src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx`
- Modify: `src/app/(coach)/quizzes/page.tsx`

**Interfaces:**
- Consumes: `requireQuizAccess(id, { coach: true })` + `AuthzError` (authorization only); `getQuiz(id)` from `@/lib/actions/quiz-actions` (returns the quiz with `questions` including `play: { name, formation }`, ordered by `sortOrder`); `updateQuiz`, `deleteQuiz` from Task 1; `useToast()` from `@/components/ui/toast`; `ConfirmDialog` from `@/components/ui/confirm-dialog` (Plan 1d) for the delete confirmation.
- Produces: a coach route `/quizzes/[id]`.

Full question editing is OUT of scope (spec: deferred). This ships list + rename + delete only.

- [ ] **Step 1: Create the client component**

Create `src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateQuiz, deleteQuiz } from "@/lib/actions/quiz-actions";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

export function QuizDetailClient({
  quizId,
  initialName,
}: {
  quizId: string;
  initialName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [deleting, startDelete] = useTransition();

  function handleSaveName() {
    const next = draftName.trim();
    if (!next || next === name) {
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

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteQuiz(quizId);
        toast.success("Quiz deleted");
        router.push("/quizzes"); // navigation tears down the dialog
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete quiz");
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-1 items-center justify-between gap-3">
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") {
                setDraftName(name);
                setEditing(false);
              }
            }}
            className="max-w-sm"
            autoFocus
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            aria-label="Save name"
            className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {savingName ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => {
              setDraftName(name);
              setEditing(false);
            }}
            aria-label="Cancel rename"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-white">{name}</h1>
          <button
            onClick={() => {
              setDraftName(name);
              setEditing(true);
            }}
            aria-label="Rename quiz"
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete quiz?"
        description={`This permanently deletes "${name}" and all of its questions and attempts. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the detail page**

Create `src/app/(coach)/quizzes/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuiz } from "@/lib/actions/quiz-actions";
import { requireQuizAccess, AuthzError } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { QuizDetailClient } from "./quiz-detail-client";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requireQuizAccess(id, { coach: true });
  } catch (err) {
    if (err instanceof AuthzError) notFound();
    throw err;
  }

  const quiz = await getQuiz(id);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/quizzes"
          className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <QuizDetailClient quizId={quiz.id} initialName={quiz.name} />
      </div>

      {quiz.questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <p className="text-sm text-zinc-500">No questions yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            This quiz has no questions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quiz.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {q.questionText}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <Badge variant="outline" className="text-[10px]">
                        {q.questionType.replace(/_/g, " ")}
                      </Badge>
                      {q.play && <span>{q.play.name}</span>}
                    </div>
                  </div>
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

- [ ] **Step 3: Link quiz cards to the detail route**

In `src/app/(coach)/quizzes/page.tsx`, wrap each quiz `Card` in a `Link` (mirroring `game-plans/page.tsx`). The `map` currently returns `<Card key={quiz.id} ...>`. Change the returned JSX so the `Link` carries the `key` and the `Card` no longer does:

Replace this block:

```tsx
            return (
              <Card key={quiz.id} className="transition-colors hover:border-zinc-700">
                <CardContent className="p-5">
```

with:

```tsx
            return (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`}>
                <Card className="transition-colors hover:border-zinc-700">
                  <CardContent className="p-5">
```

and close the added `Link` — replace the matching `</Card>` that ends the map body:

```tsx
                </CardContent>
              </Card>
            );
```

with:

```tsx
                  </CardContent>
                </Card>
              </Link>
            );
```

`Link` is already imported in `quizzes/page.tsx` (line 8). Adjust the indentation of the inner `CardContent` children if your editor flags it, but indentation is cosmetic — the structure above is what matters.

- [ ] **Step 4: Verify build + typecheck**

Run: `npm run build`
Expected: PASS — compiles with the new route and no type errors. (Build also runs `next lint`/type-check.)

- [ ] **Step 5: Manual verification**

With a dev DB running (`npm run dev`), from `/quizzes` click a quiz card → lands on `/quizzes/<id>` showing the question list. Rename via the pencil (toast "Quiz renamed"). Click Delete → confirm dialog → Delete → routed back to `/quizzes` with the quiz gone. Visiting a quiz id from another org shows the 404 page.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/quizzes/[id]/page.tsx" "src/app/(coach)/quizzes/[id]/quiz-detail-client.tsx" "src/app/(coach)/quizzes/page.tsx"
git commit -m "feat(quiz): add coach quiz detail route with rename and delete"
```

---

### Task 3: New Playbook dialog

**Files:**
- Create: `src/app/(coach)/playbooks/new-playbook-dialog.tsx`
- Modify: `src/app/(coach)/playbooks/page.tsx`

**Interfaces:**
- Consumes: `createPlaybook(formData: FormData)` from `@/lib/actions/playbook-actions` — reads `orgId`, `name`, `description?`, `side` (`"offense" | "defense"`, defaults `"offense"`), `visibility` (defaults `"private"`) from the FormData; returns the created `Playbook`. Do NOT change this signature — submit a `FormData` matching its contract. Also `useToast()`, `Button`, `Input`, `cn`.
- Produces: `<NewPlaybookDialog orgId={string} />`.

- [ ] **Step 1: Create the dialog component**

Create `src/app/(coach)/playbooks/new-playbook-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createPlaybook } from "@/lib/actions/playbook-actions";
import { Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewPlaybookDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setSide("offense");
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return; // don't close mid-submit
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("orgId", orgId);
        formData.set("name", trimmed);
        formData.set("side", side);
        const playbook = await createPlaybook(formData);
        toast.success("Playbook created");
        setOpen(false);
        reset();
        router.push(`/playbooks/${playbook.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create playbook",
        );
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Playbook
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              New Playbook
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Base Offense"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Side
              </label>
              <div className="flex rounded-lg bg-zinc-800/80 p-0.5">
                {(["offense", "defense"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={cn(
                      "flex-1 rounded-md px-4 py-2 text-xs font-medium capitalize transition-colors",
                      side === s
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={pending || !name.trim()}>
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Wire it into the playbooks page**

In `src/app/(coach)/playbooks/page.tsx`:

Add the import near the other imports:

```tsx
import { NewPlaybookDialog } from "./new-playbook-dialog";
```

Replace the dead TODO button block (currently):

```tsx
        {/* TODO: Wire up create playbook modal */}
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Playbook
        </Button>
```

with:

```tsx
        <NewPlaybookDialog orgId={membership.orgId} />
```

`Button` and `Plus` may now be unused in this file — if the build's lint step flags them, remove them from the imports on lines 8-9 (keep `BookOpen`, `Share2`; `Plus` is no longer used anywhere else in the file, and `Button` is not either).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS — no unused-import lint errors, no type errors.

- [ ] **Step 4: Manual verification**

`npm run dev` → `/playbooks` → click "New Playbook" → dialog opens → type a name, pick Offense/Defense → Create → toast "Playbook created" and routed to `/playbooks/<newId>`. Cancel/close resets the form. Submitting empty is blocked (button disabled).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/playbooks/new-playbook-dialog.tsx" "src/app/(coach)/playbooks/page.tsx"
git commit -m "feat(playbooks): wire New Playbook dialog to createPlaybook action"
```

---

### Task 4: Game Plans create dialog

**Files:**
- Create: `src/app/(coach)/game-plans/create-game-plan-dialog.tsx`
- Modify: `src/app/(coach)/game-plans/page.tsx`

**Interfaces:**
- Consumes: `createGamePlan(data: { orgId: string; name: string; week?: number; opponent?: string }): Promise<GamePlan>` from `@/lib/actions/game-plan-actions`. Do NOT change the signature. Also `useToast()`, `Button`, `Input`.
- Produces: `<CreateGamePlanDialog orgId={string} />`.

- [ ] **Step 1: Create the dialog component**

Create `src/app/(coach)/game-plans/create-game-plan-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createGamePlan } from "@/lib/actions/game-plan-actions";
import { Plus, Loader2, X } from "lucide-react";

export function CreateGamePlanDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [week, setWeek] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setOpponent("");
    setWeek("");
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedWeek = week.trim() ? Number(week) : NaN;
    startTransition(async () => {
      try {
        const gamePlan = await createGamePlan({
          orgId,
          name: trimmed,
          opponent: opponent.trim() || undefined,
          week: Number.isFinite(parsedWeek) ? parsedWeek : undefined,
        });
        toast.success("Game plan created");
        setOpen(false);
        reset();
        router.push(`/game-plans/${gamePlan.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create game plan",
        );
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Game Plan
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              New Game Plan
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Week 5 vs. Eagles"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Opponent
                </label>
                <Input
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Week
                </label>
                <Input
                  type="number"
                  min={1}
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={pending || !name.trim()}>
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Wire it into the game-plans page**

In `src/app/(coach)/game-plans/page.tsx`:

Add the import near the top:

```tsx
import { CreateGamePlanDialog } from "./create-game-plan-dialog";
```

The header currently has only a title inside a `flex items-center justify-between`. Add the dialog button as the second child of that header `div`. Replace:

```tsx
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Plans</h1>
          <p className="text-sm text-zinc-500">
            Weekly game plans and play selections.
          </p>
        </div>
      </div>
```

with:

```tsx
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Plans</h1>
          <p className="text-sm text-zinc-500">
            Weekly game plans and play selections.
          </p>
        </div>
        <CreateGamePlanDialog orgId={membership.orgId} />
      </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verification**

`/game-plans` → "New Game Plan" → name (required) + optional opponent/week → Create → toast + routed to `/game-plans/<newId>`. Empty name blocks submit.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(coach)/game-plans/create-game-plan-dialog.tsx" "src/app/(coach)/game-plans/page.tsx"
git commit -m "feat(game-plans): add Create Game Plan dialog wired to createGamePlan"
```

---

### Task 5: `TeamFile` Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `TeamFile` model with fields `id`, `orgId`, `title`, `url`, `category`, `createdById`, `createdAt`, `updatedAt`, plus relations `org` (→ `Organization`) and `createdBy` (→ `User`). Makes `db.teamFile` available on the typed Prisma client (relied on by Task 6).

> **Prisma back-relations are mandatory:** a relation field requires the opposite field on BOTH related models or `prisma validate`/`generate` errors. This task adds the model AND the two back-relations.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append this model at the end of the file (after `model PlaybookShare { ... }`):

```prisma
model TeamFile {
  id          String   @id @default(cuid())
  orgId       String
  title       String
  url         String
  category    String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy User         @relation("TeamFileCreator", fields: [createdById], references: [id])
}
```

- [ ] **Step 2: Add the back-relation on `Organization`**

In `model Organization`, in the relations block (which currently ends with `sharedPlaybooks PlaybookShare[] @relation("SharedPlaybooks")`), add:

```prisma
  teamFiles      TeamFile[]
```

- [ ] **Step 3: Add the back-relation on `User`**

In `model User`, in the relations block (which currently ends with `sharedPlaybooks PlaybookShare[] @relation("PlaybookSharer")`), add:

```prisma
  createdTeamFiles TeamFile[] @relation("TeamFileCreator")
```

- [ ] **Step 4: Generate the typed client (no DB required)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" — this makes `db.teamFile` exist for typecheck and the mocked-db tests in Task 6. This step does NOT need a database.

- [ ] **Step 5: Validate the schema**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid." (If it complains about a missing opposite relation field, a back-relation from Step 2/3 is missing.)

- [ ] **Step 6: Create the migration (REQUIRES a database)**

> **Prerequisite / risk:** `prisma migrate dev` needs a live Postgres reachable via `DATABASE_URL`. Per spec §7 no `.env`/Postgres exists on this machine by default — stand up the dev DB first (the docker-compose `db` service exists for production; a dev equivalent + `.env` with `DATABASE_URL` is needed). There is also an already-pending migration folder (`prisma/migrations/20260616000000_add_user_password/`); `migrate dev` will apply it too. If no DB is available at execution time, Steps 4–5 still unblock all typecheck/tests; defer this step and note the migration as outstanding.

Run: `npx prisma migrate dev --name add_team_files`
Expected: a new folder `prisma/migrations/<timestamp>_add_team_files/` with `CREATE TABLE "TeamFile"`, applied cleanly; Prisma Client re-generated.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add TeamFile model and migration"
```

---

### Task 6: Team File server actions

**Files:**
- Create: `src/lib/actions/team-file-actions.ts`
- Test: `tests/lib/actions/team-file-actions.test.ts`

**Interfaces:**
- Consumes: `requireMembership({ coach: true })` from `@/lib/authz` (returns `Membership` with `userId` + `orgId`); `db.teamFile.*` from `@/lib/db` (available after Task 5 Step 4).
- Produces (relied on by Task 7):
  - `getTeamFiles(): Promise<TeamFile[]>` — org-scoped, newest first.
  - `createTeamFile(data: { title: string; url: string; category: string }): Promise<TeamFile>`
  - `updateTeamFile(id: string, data: { title: string; url: string }): Promise<void>`
  - `deleteTeamFile(id: string): Promise<void>`

Org is always derived from the session membership — never from a client argument. Mutations are org-scoped with `updateMany`/`deleteMany` filtered by `{ id, orgId }` so a wrong-org id affects zero rows.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/actions/team-file-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    teamFile: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/authz", () => ({
  requireMembership: vi.fn(),
  AuthzError: class AuthzError extends Error {},
}));

import {
  getTeamFiles,
  createTeamFile,
  updateTeamFile,
  deleteTeamFile,
} from "@/lib/actions/team-file-actions";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/authz";

const mockedMembership = vi.mocked(requireMembership);
const membership = { id: "m1", userId: "u1", orgId: "org1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockedMembership.mockResolvedValue(membership as never);
});

describe("getTeamFiles", () => {
  it("requires a coach and scopes the query to the caller's org", async () => {
    vi.mocked(db.teamFile.findMany).mockResolvedValue([] as never);
    await getTeamFiles();
    expect(mockedMembership).toHaveBeenCalledWith({ coach: true });
    expect(db.teamFile.findMany).toHaveBeenCalledWith({
      where: { orgId: "org1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("createTeamFile", () => {
  it("derives orgId and createdById from the membership, not the client", async () => {
    vi.mocked(db.teamFile.create).mockResolvedValue({ id: "tf1" } as never);
    await createTeamFile({ title: "Rules", url: "https://x", category: "rules" });
    expect(db.teamFile.create).toHaveBeenCalledWith({
      data: {
        orgId: "org1",
        title: "Rules",
        url: "https://x",
        category: "rules",
        createdById: "u1",
      },
    });
  });
});

describe("updateTeamFile", () => {
  it("scopes the update by org and throws when no row matches", async () => {
    vi.mocked(db.teamFile.updateMany).mockResolvedValue({ count: 0 } as never);
    await expect(
      updateTeamFile("tf1", { title: "T", url: "https://y" }),
    ).rejects.toThrow("Team file not found");
    expect(db.teamFile.updateMany).toHaveBeenCalledWith({
      where: { id: "tf1", orgId: "org1" },
      data: { title: "T", url: "https://y" },
    });
  });

  it("resolves when a row matches", async () => {
    vi.mocked(db.teamFile.updateMany).mockResolvedValue({ count: 1 } as never);
    await expect(
      updateTeamFile("tf1", { title: "T", url: "https://y" }),
    ).resolves.toBeUndefined();
  });
});

describe("deleteTeamFile", () => {
  it("scopes the delete by org and throws when no row matches", async () => {
    vi.mocked(db.teamFile.deleteMany).mockResolvedValue({ count: 0 } as never);
    await expect(deleteTeamFile("tf1")).rejects.toThrow("Team file not found");
    expect(db.teamFile.deleteMany).toHaveBeenCalledWith({
      where: { id: "tf1", orgId: "org1" },
    });
  });

  it("resolves when a row matches", async () => {
    vi.mocked(db.teamFile.deleteMany).mockResolvedValue({ count: 1 } as never);
    await expect(deleteTeamFile("tf1")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/actions/team-file-actions.test.ts`
Expected: FAIL — `@/lib/actions/team-file-actions` does not exist.

- [ ] **Step 3: Implement the actions**

Create `src/lib/actions/team-file-actions.ts`:

```ts
"use server";

import { db } from "@/lib/db";
import { requireMembership } from "@/lib/authz";

export async function getTeamFiles() {
  const membership = await requireMembership({ coach: true });
  return db.teamFile.findMany({
    where: { orgId: membership.orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeamFile(data: {
  title: string;
  url: string;
  category: string;
}) {
  const membership = await requireMembership({ coach: true });
  return db.teamFile.create({
    data: {
      orgId: membership.orgId,
      title: data.title,
      url: data.url,
      category: data.category,
      createdById: membership.userId,
    },
  });
}

export async function updateTeamFile(
  id: string,
  data: { title: string; url: string },
) {
  const membership = await requireMembership({ coach: true });
  const result = await db.teamFile.updateMany({
    where: { id, orgId: membership.orgId },
    data: { title: data.title, url: data.url },
  });
  if (result.count === 0) {
    throw new Error("Team file not found");
  }
}

export async function deleteTeamFile(id: string) {
  const membership = await requireMembership({ coach: true });
  const result = await db.teamFile.deleteMany({
    where: { id, orgId: membership.orgId },
  });
  if (result.count === 0) {
    throw new Error("Team file not found");
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/actions/team-file-actions.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/team-file-actions.ts tests/lib/actions/team-file-actions.test.ts
git commit -m "feat(team-files): add org-scoped Team File CRUD server actions"
```

---

### Task 7: Team Files page — swap localStorage for the database

**Files:**
- Modify (rewrite): `src/app/(coach)/settings/files/page.tsx`

**Interfaces:**
- Consumes: `getTeamFiles`, `createTeamFile`, `updateTeamFile`, `deleteTeamFile` from Task 6; `useToast()`; `ConfirmDialog` from `@/components/ui/confirm-dialog` (Plan 1d) for the delete confirmation.

> **Field rename:** the current localStorage model uses `label`; the DB model uses `title`. Use `title` end-to-end in the rewrite. `category` stays a client-side union (`FileCategory`) stored as the DB `String` column — cast on read.
>
> **Delete confirmation:** this task OWNS wiring the team-file delete confirmation (spec §4's "team file delete") because it rewrites this page — it uses `ConfirmDialog` from Plan 1d rather than a hand-rolled dialog or a bare `confirm()`. Plan 1d must land its `confirm-dialog.tsx` before this task executes.

- [ ] **Step 1: Rewrite the page to use the server actions**

Replace the entire contents of `src/app/(coach)/settings/files/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getTeamFiles,
  createTeamFile,
  updateTeamFile,
  deleteTeamFile,
} from "@/lib/actions/team-file-actions";
import {
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  FileText,
  Calendar,
  Target,
  Video,
  Link2,
  ArrowLeft,
  Check,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────

interface TeamFile {
  id: string;
  title: string;
  url: string;
  category: FileCategory;
}

type FileCategory = "rules" | "schedule" | "goals" | "video" | "other";

const FILE_CATEGORIES: {
  value: FileCategory;
  label: string;
  icon: typeof FileText;
}[] = [
  { value: "rules", label: "Team Rules", icon: FileText },
  { value: "schedule", label: "Schedule", icon: Calendar },
  { value: "goals", label: "Goals / Mission", icon: Target },
  { value: "video", label: "Video", icon: Video },
  { value: "other", label: "Other", icon: Link2 },
];

function normalizeCategory(value: string): FileCategory {
  return (
    FILE_CATEGORIES.find((c) => c.value === value)?.value ?? "other"
  );
}

// ── Component ──────────────────────────────────────────────────────

export default function TeamFilesPage() {
  const toast = useToast();
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<FileCategory>("rules");
  const [adding, startAdd] = useTransition();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingEdit, startSaveEdit] = useTransition();

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await getTeamFiles();
      setFiles(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          category: normalizeCategory(r.category),
        })),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    startAdd(async () => {
      try {
        const created = await createTeamFile({
          title: newTitle.trim(),
          url: newUrl.trim(),
          category: newCategory,
        });
        setFiles((prev) => [
          {
            id: created.id,
            title: created.title,
            url: created.url,
            category: normalizeCategory(created.category),
          },
          ...prev,
        ]);
        setNewTitle("");
        setNewUrl("");
        setNewCategory("rules");
        setShowAdd(false);
        toast.success("Link added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add link");
      }
    });
  }, [newTitle, newUrl, newCategory, toast]);

  const confirmDelete = useCallback(() => {
    const id = confirmDeleteId;
    if (!id) return;
    const previous = files;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setConfirmDeleteId(null);
    startSaveEdit(async () => {
      try {
        await deleteTeamFile(id);
        toast.success("Link deleted");
      } catch (err) {
        setFiles(previous); // revert
        toast.error(
          err instanceof Error ? err.message : "Failed to delete link",
        );
      }
    });
  }, [confirmDeleteId, files, toast]);

  const fileToDelete = files.find((f) => f.id === confirmDeleteId) ?? null;

  const startEdit = useCallback((file: TeamFile) => {
    setEditingId(file.id);
    setEditTitle(file.title);
    setEditUrl(file.url);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editTitle.trim() || !editUrl.trim()) return;
    const id = editingId;
    const title = editTitle.trim();
    const url = editUrl.trim();
    startSaveEdit(async () => {
      try {
        await updateTeamFile(id, { title, url });
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, title, url } : f)),
        );
        setEditingId(null);
        toast.success("Link updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update link",
        );
      }
    });
  }, [editingId, editTitle, editUrl, toast]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Group by category
  const grouped = FILE_CATEGORIES.map((cat) => ({
    ...cat,
    files: files.filter((f) => f.category === cat.value),
  })).filter((g) => g.files.length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/settings"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Team Files</h1>
          <p className="text-sm text-zinc-500">
            Manage links to team documents, schedules, and videos.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={loading}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 py-16">
          <p className="text-sm text-red-400">Couldn&apos;t load team files.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {/* Add form */}
      {!loading && !loadError && showAdd && (
        <Card className="mb-6 border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Team Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 sm:pt-0">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FILE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setNewCategory(cat.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      newCategory === cat.value
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Label
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Team Handbook 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                URL
              </label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !newTitle.trim() || !newUrl.trim()}
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Add Link"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !loadError && files.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <Link2 className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No team files yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add links to team rules, schedules, goals, and videos.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Your First Link
          </Button>
        </div>
      )}

      {/* File list grouped by category */}
      {!loading && !loadError && (
        <div className="space-y-6">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {group.label}
                  </h3>
                </div>
                <div className="space-y-2">
                  {group.files.map((file) => (
                    <Card key={file.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        {editingId === file.id ? (
                          <>
                            <div className="flex min-w-0 flex-1 gap-2">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <Input
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <button
                              onClick={saveEdit}
                              disabled={savingEdit}
                              className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                              aria-label="Save"
                            >
                              {savingEdit ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-200">
                                {file.title}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {file.url}
                              </p>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                              title="Open link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => startEdit(file)}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(file.id)}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete link?"
        description={
          fileToDelete
            ? `This removes "${fileToDelete.title}" from your team files.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — no references to `localStorage`, `STORAGE_KEY`, `label`, or `generateId` remain.

- [ ] **Step 3: Manual verification**

With a dev DB + a coach session: `/settings/files` shows the spinner then the (empty) list. Add a link → appears immediately, persists across a full page reload (proves DB, not localStorage). Edit → saves. Delete → `ConfirmDialog` opens → confirm → removed (and stays removed after reload); Cancel leaves it. Force a load error (stop the DB) → error card with Retry.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(coach)/settings/files/page.tsx"
git commit -m "feat(team-files): persist Team Files to the database via server actions"
```

---

### Task 8: Print fix — capture the real diagram PNG

**Files:**
- Modify: `src/engine/export.ts`
- Modify: `src/app/(coach)/designer/page.tsx`
- Test: `tests/engine/export.test.ts`

**Interfaces:**
- Produces: `getStageDataURL(stageRef: React.RefObject<Konva.Stage | null>): string | null` in `@/engine/export` — returns the stage's PNG data-URL at `pixelRatio: 2`, or `null` if the stage is not mounted.
- Consumes in designer: `canvasRef.current.getStageRef()` (existing `PlayCanvasHandle.getStageRef()`), `printPlays`, `printPanelOpen`.

Context: `PrintLayout` renders `<img src={play.canvasData}>` and expects a PNG data-URL, but `printPlays` is built with `canvasData: ""` (`designer/page.tsx:534-547`), so the printout diagram is always blank. Only the current play is printed (single-element array from live canvas state).

- [ ] **Step 1: Write the failing test**

Create `tests/engine/export.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import type Konva from "konva";
import { getStageDataURL } from "@/engine/export";

describe("getStageDataURL", () => {
  it("returns null when the stage ref is empty", () => {
    expect(getStageDataURL({ current: null })).toBeNull();
  });

  it("returns the stage's data URL at 2x pixel ratio", () => {
    const toDataURL = vi.fn(() => "data:image/png;base64,AAAA");
    const stageRef = {
      current: { toDataURL },
    } as unknown as React.RefObject<Konva.Stage | null>;

    const result = getStageDataURL(stageRef);

    expect(result).toBe("data:image/png;base64,AAAA");
    expect(toDataURL).toHaveBeenCalledWith({ pixelRatio: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/engine/export.test.ts`
Expected: FAIL — `getStageDataURL` is not exported.

- [ ] **Step 3: Extract the helper and reuse it in `exportPlayAsImage`**

Replace the entire contents of `src/engine/export.ts` with:

```ts
import type Konva from "konva";

/**
 * Returns the current Konva stage as a PNG data-URL at high resolution,
 * or null if the stage is not mounted.
 */
export function getStageDataURL(
  stageRef: React.RefObject<Konva.Stage | null>,
): string | null {
  const stage = stageRef.current;
  if (!stage) return null;
  return stage.toDataURL({ pixelRatio: 2 });
}

/**
 * Exports the current Konva stage as a PNG image download.
 */
export async function exportPlayAsImage(
  stageRef: React.RefObject<Konva.Stage | null>,
  playName: string,
): Promise<void> {
  const dataURL = getStageDataURL(stageRef);
  if (!dataURL) return;

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.download = `${playName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/engine/export.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Capture the PNG when the print dialog opens (designer)**

In `src/app/(coach)/designer/page.tsx`:

(a) Add `getStageDataURL` to the existing export import (line 25 is `import { exportPlayAsImage } from "@/engine/export";`):

```tsx
import { exportPlayAsImage, getStageDataURL } from "@/engine/export";
```

(b) Add print-image state next to the other print state (after line 73, `const [printMode, setPrintMode] = useState<"playbook" | "wristband">("playbook");`):

```tsx
  const [printImageUrl, setPrintImageUrl] = useState<string | null>(null);
```

(c) Add an open handler next to `handlePrint` (after the `handlePrint` definition at lines 399-401):

```tsx
  // ── Open print dialog: snapshot the live canvas as a PNG for the layout ──
  const handleOpenPrint = useCallback(() => {
    const handle = canvasRef.current;
    setPrintImageUrl(handle ? getStageDataURL(handle.getStageRef()) : null);
    setPrintPanelOpen(true);
  }, []);
```

(d) Use the captured URL in `printPlays` — change `canvasData: "",` (line 538) to:

```tsx
      canvasData: printImageUrl ?? "",
```

(e) Open the dialog through the new handler — change `onOpenPrint={() => setPrintPanelOpen(true)}` (line 590) to:

```tsx
            onOpenPrint={handleOpenPrint}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Manual verification**

Open the designer with a play that has players/routes, click the print/printer control → the print dialog opens. Trigger Print (the dialog's Print button → `window.print()`); the print preview's diagram now shows the actual field/players (not "No diagram available"). Empty-canvas play still prints the "No diagram" placeholder gracefully.

- [ ] **Step 8: Commit**

```bash
git add src/engine/export.ts "src/app/(coach)/designer/page.tsx" tests/engine/export.test.ts
git commit -m "fix(print): capture live canvas PNG so printed diagrams render"
```

---

### Task 9: Designer small kills — Mirror button + routeType casing

**Files:**
- Modify: `src/components/play/assignment-panel.tsx`
- Modify: `src/app/(coach)/designer/page.tsx`
- Test: `tests/components/play/assignment-panel.test.tsx`

**Interfaces:**
- `AssignmentPanel` gains an optional `onMirror?: () => void` prop; designer passes its existing `handleMirror` (which calls `mirrorPlay(canvasData)` — the whole-play mirror is the only API `src/engine/mirror.ts` exposes).
- Route type names are Capitalized everywhere (`detectRouteType` returns "Slant"/"Post"/…, `routes-library.ts` names are Capitalized, `play-canvas.tsx` writes `detectedType`). The panel currently compares/writes lowercase (`assignment-panel.tsx:207,211`), so no route pill ever shows active. Fix: compare/write the Capitalized `rt` directly.

- [ ] **Step 1: Write the failing component tests**

Create `tests/components/play/assignment-panel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import type { CanvasPlayer, Route } from "@/engine/types";

const player: CanvasPlayer = {
  id: "p1",
  label: "X",
  x: 100,
  y: 100,
  side: "offense",
};

const route: Route = {
  playerId: "p1",
  waypoints: [{ x: 0, y: 0 }],
  type: "solid",
  routeType: "Slant",
};

describe("AssignmentPanel", () => {
  it("marks the Capitalized routeType pill as active", () => {
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
      />,
    );
    const slant = screen.getByRole("button", { name: "Slant" });
    expect(slant.className).toContain("bg-indigo-600");
  });

  it("writes the Capitalized routeType when a pill is clicked", () => {
    const onUpdateRouteTypeName = vi.fn();
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
        onUpdateRouteTypeName={onUpdateRouteTypeName}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(onUpdateRouteTypeName).toHaveBeenCalledWith("p1", "Post");
  });

  it("fires onMirror when the Mirror button is clicked", () => {
    const onMirror = vi.fn();
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
        onMirror={onMirror}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /mirror/i }));
    expect(onMirror).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/play/assignment-panel.test.tsx`
Expected: FAIL — the active pill assertion fails (compares to `"slant"`), the click writes `"post"` not `"Post"`, and the Mirror button has no handler/prop.

- [ ] **Step 3: Fix the routeType casing and add the `onMirror` prop**

In `src/components/play/assignment-panel.tsx`:

(a) Add `onMirror` to the props interface (currently lines 8-15):

```tsx
interface AssignmentPanelProps {
  player: CanvasPlayer | null;
  route: Route | undefined;
  onClose: () => void;
  onDeleteRoute: () => void;
  onUpdateRouteType: (type: Route["type"]) => void;
  onUpdateRouteTypeName?: (playerId: string, routeType: string) => void;
  onMirror?: () => void;
}
```

(b) Destructure it in the component signature (currently lines 104-111):

```tsx
export function AssignmentPanel({
  player,
  route,
  onClose,
  onDeleteRoute,
  onUpdateRouteType,
  onUpdateRouteTypeName,
  onMirror,
}: AssignmentPanelProps) {
```

(c) Fix the active-state comparison — change line 207 from:

```tsx
                          const isActive =
                            route.routeType === rt.toLowerCase();
```

to:

```tsx
                          const isActive = route.routeType === rt;
```

(d) Fix the write — change line 211 from:

```tsx
                              onClick={() => onUpdateRouteTypeName?.(player.id, rt.toLowerCase())}
```

to:

```tsx
                              onClick={() => onUpdateRouteTypeName?.(player.id, rt)}
```

(e) Wire the Mirror button `onClick` — change the button (currently lines 244-250) from:

```tsx
                <button
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
                  title="Mirror to opposite side"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Mirror
                </button>
```

to:

```tsx
                <button
                  onClick={onMirror}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
                  title="Mirror to opposite side"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Mirror
                </button>
```

- [ ] **Step 4: Pass `handleMirror` from the designer**

In `src/app/(coach)/designer/page.tsx`, add the `onMirror` prop to the `AssignmentPanel` usage (currently lines 803-810). Change:

```tsx
            <AssignmentPanel
              player={selectedPlayer}
              route={selectedRoute}
              onClose={() => setSelectedPlayerId(null)}
              onDeleteRoute={handleDeleteRoute}
              onUpdateRouteType={handleUpdateRouteType}
              onUpdateRouteTypeName={handleUpdateRouteTypeName}
            />
```

to:

```tsx
            <AssignmentPanel
              player={selectedPlayer}
              route={selectedRoute}
              onClose={() => setSelectedPlayerId(null)}
              onDeleteRoute={handleDeleteRoute}
              onUpdateRouteType={handleUpdateRouteType}
              onUpdateRouteTypeName={handleUpdateRouteTypeName}
              onMirror={handleMirror}
            />
```

(`handleMirror` already exists at `designer/page.tsx:196-201`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/components/play/assignment-panel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Manual verification**

In the designer, select a player with a route → the currently-assigned route pill is highlighted (was never highlighted before). Click a different route pill → it becomes the active one. Click "Mirror" in the panel → the play flips across the field center-line (same effect as the toolbar/keyboard mirror).

- [ ] **Step 8: Commit**

```bash
git add src/components/play/assignment-panel.tsx "src/app/(coach)/designer/page.tsx" tests/components/play/assignment-panel.test.tsx
git commit -m "fix(designer): wire Mirror button and fix routeType casing in assignment panel"
```

---

## Final verification (after all tasks)

- [ ] Run the full unit suite: `npm run test:run` → all green (includes the pre-existing engine/lib tests plus the four new test files).
- [ ] Run `npm run build` → green.
- [ ] Confirm no `localStorage` usage remains in `src/app/(coach)/settings/files/page.tsx`.
- [ ] Confirm the `TeamFile` migration exists under `prisma/migrations/` (or is documented as outstanding if no dev DB was available at execution time).

## Self-Review notes (spec §2 coverage)

- New Playbook dialog → Task 3.
- Quiz management (detail route, `updateQuiz`, `deleteQuiz`, card links) → Tasks 1–2.
- Game Plans create → Task 4.
- Team Files → database (model, migration, actions, page swap) → Tasks 5–7.
- Print fix (`getStageDataURL` + capture-on-open) → Task 8.
- Designer small kills (Mirror button, routeType casing) → Task 9.

**Risks / notes carried from the spec:**
- `createPlaybook` takes `FormData` — Task 3 submits a matching `FormData`, does not change the action signature.
- Quiz full-question editing is deferred; Task 2 ships list + rename + delete only.
- `prisma migrate dev` needs a live dev DB (`DATABASE_URL`); `generate` alone unblocks typecheck/tests (Task 5).
- Org scoping for the new mutating actions is derived from the session (`requireQuizAccess` / `requireMembership`), never from client input; `updateTeamFile`/`deleteTeamFile` additionally filter by `orgId` so a wrong-org id matches zero rows.
- Tasks 2 and 7 import `ConfirmDialog` from Plan 1d (`@/components/ui/confirm-dialog`); Plan 1d must land that component before those tasks execute. This plan owns wiring the team-file delete confirmation so Plan 1d does not re-edit the rewritten Team Files page.
