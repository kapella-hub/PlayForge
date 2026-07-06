# PlayForge Phase 2a — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the two opening hazard fixes and the Phase 2 CSS token foundation (Tailwind v4 `@theme inline`, `@custom-variant dark`, new tokens, surface utilities, tokenized body, pre-hydration theme script) without touching any component file, keeping dark mode visually near-identical.

**Architecture:** Six independently-reviewable tasks. Tasks 1–3 clear the pre-foundation hazards (a render-time ref mutation and an unauthenticated/unthrottled AI endpoint). Tasks 4–6 build the design-system substrate that Phase 2b/2c components will consume: register the existing CSS custom properties as Tailwind utilities via `@theme inline`, add the new tokens and surface utilities, tokenize the body background, and ship a no-flash pre-hydration theme script. The custom-property palette in `:root`/`.light` stays the single source of truth; `@theme inline` makes utilities resolve `var()` at use-time so they follow the active theme class. No component file is modified — components still hardcode colors until 2b/2c, so defining (but not yet consuming) the new utilities leaves dark mode pixel-identical.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript (strict), Vitest 4 (jsdom), Prisma 7, NextAuth v5.

## Global Constraints

- **No new npm dependencies.** Everything needed is already installed.
- **Touch only these paths.** `src/lib/use-keyboard-shortcuts.ts`, `src/app/api/ai/generate-play/route.ts`, `src/lib/rate-limit.ts` (new), `src/lib/theme-script.ts` (new), `src/app/globals.css`, `src/app/layout.tsx`, and test files under `tests/`. **Do NOT modify any component file** — component token migration is plans 2b/2c.
- **Verification gate for EVERY task (all four must pass):**
  - `npm run test:run` — 115 baseline tests green; must stay green and only grow.
  - `npx tsc --noEmit` — clean.
  - `npm run lint` — **no new errors.** Baseline is **8 errors / 18 warnings** (all in `src/engine/play-canvas.tsx` and `src/lib/use-keyboard-shortcuts.ts`). Task 1 reduces errors to **7**; no later task may reintroduce one.
  - `npm run build` — succeeds.
- **Dark-mode output must remain near-identical** (pixel-identical wherever values are copied verbatim). Light mode is NOT visually validated in this phase (components still hardcode dark colors until 2b/2c), so light token values only need to be reasonable and compile.
- **Tailwind v4 token registration MUST use `@theme inline`** (not plain `@theme`) so utilities inline `var(--token)` and resolve at use-time, following the `.light` class override. `@theme inline` does not emit the theme keys back into `:root`, which also avoids a self-reference for the font vars.
- **`@custom-variant dark (&:where(.dark, .dark *))`** binds `dark:` utilities to the app's class toggle, not `prefers-color-scheme`.
- **Node >= 20.9.0.**
- **Commit after each task** (frequent commits). Run the full gate before committing.

---

## Task 1: Fix render-time ref mutation in `useKeyboardShortcuts`

**Files:**
- Modify: `src/lib/use-keyboard-shortcuts.ts:30-31`

**Interfaces:**
- Consumes: nothing new.
- Produces: `useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void` — signature unchanged; every existing call site is unaffected.

**Context:** Line 31 assigns `shortcutsRef.current = shortcuts` **during render**, which ESLint flags as `react-hooks/refs` ("Cannot access refs during render") — this is 1 of the 8 baseline lint errors. Moving the assignment into a bare `useEffect` (runs after commit) preserves behavior exactly: `handleKeyDown` reads `shortcutsRef.current` only at event time, which is always after effects have settled. `useEffect` is already imported on line 3, so no import change is needed.

There is **no existing test** for this hook (nothing under `tests/` references it), so per the design the red/green oracle for this task is ESLint, and the existing 115-test suite must stay green.

- [ ] **Step 1: Confirm the failing lint (RED)**

Run: `npx eslint src/lib/use-keyboard-shortcuts.ts`

Expected: exactly 1 error —
```
31:3  error  Error: Cannot access refs during render ...  react-hooks/refs
✖ 1 problem (1 error, 0 warnings)
```

- [ ] **Step 2: Apply the fix**

In `src/lib/use-keyboard-shortcuts.ts`, replace the render-time assignment (lines 30–31) with a bare effect. Change:

```ts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
```

to:

```ts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);

  // Keep the ref current without touching it during render (react-hooks/refs).
  // The handler reads shortcutsRef.current at event time, always after commit.
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
```

(The effect intentionally has no dependency array: it runs after every render, exactly matching the previous "always latest" semantics.)

- [ ] **Step 3: Confirm the lint clears (GREEN)**

Run: `npx eslint src/lib/use-keyboard-shortcuts.ts`

Expected: no output — 0 problems.

- [ ] **Step 4: Full verification gate**

Run:
```bash
npm run test:run     # 115 passed
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (down from 8; play-canvas.tsx errors remain, parked)
npm run build        # success
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-keyboard-shortcuts.ts
git commit -m "fix: move keyboard-shortcuts ref update out of render (react-hooks/refs)"
```

---

## Task 2: Pure sliding-window rate limiter

**Files:**
- Create: `src/lib/rate-limit.ts`
- Test: `tests/lib/rate-limit.test.ts`

**Interfaces:**
- Produces (consumed verbatim by Task 3):
  - `interface RateLimitResult { allowed: boolean; hits: number[]; retryAfter: number; }` — `hits` is the timestamp array to persist for the key; `retryAfter` is **whole seconds** until retry (0 when allowed).
  - `function slidingWindow(hits: number[], now: number, limit: number, windowMs: number): RateLimitResult` — pure; no clock, no I/O; the caller passes `now`.
  - `function checkRateLimit(key: string, limit: number, windowMs?: number, now?: number): RateLimitResult` — stateful wrapper over a module-level `Map<string, number[]>`; `windowMs` defaults to `60_000`, `now` defaults to `Date.now()`; persists the pruned hits back to the map.

**Context:** The generate-play endpoint (Task 3) needs a per-user throttle. Keeping the decision logic in a pure `slidingWindow` function makes it fully testable with no mocks and no fake timers — tests inject `now`. `checkRateLimit` is the thin stateful shell the route calls. In-memory single-node state is acceptable for the current deploy (documented in the route).

- [ ] **Step 1: Write the failing tests (RED)**

Create `tests/lib/rate-limit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slidingWindow, checkRateLimit } from "@/lib/rate-limit";

describe("slidingWindow", () => {
  it("allows the first request and records the timestamp", () => {
    const r = slidingWindow([], 1_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([1_000]);
    expect(r.retryAfter).toBe(0);
  });

  it("allows requests up to the limit within the window", () => {
    const r = slidingWindow([1_000, 2_000], 3_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([1_000, 2_000, 3_000]);
  });

  it("blocks when the limit is already reached inside the window", () => {
    const r = slidingWindow([1_000, 2_000, 3_000], 4_000, 3, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.hits).toEqual([1_000, 2_000, 3_000]); // unchanged: request not recorded
  });

  it("reports retryAfter as whole seconds until the oldest hit exits the window", () => {
    // oldest hit at 1_000, window 60_000 -> frees at 61_000; now 4_000 -> 57s
    const r = slidingWindow([1_000, 2_000, 3_000], 4_000, 3, 60_000);
    expect(r.retryAfter).toBe(57);
  });

  it("prunes hits older than the window before deciding", () => {
    // now 61_000, cutoff = 1_000; the 500 hit is dropped, leaving room
    const r = slidingWindow([500, 2_000, 3_000], 61_000, 3, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.hits).toEqual([2_000, 3_000, 61_000]);
  });

  it("never reports retryAfter below 1 second when blocked", () => {
    const r = slidingWindow([1_000, 2_000, 3_000], 60_999, 3, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBe(1);
  });
});

describe("checkRateLimit", () => {
  it("tracks state per key across calls", () => {
    const key = "user-A";
    expect(checkRateLimit(key, 2, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, 2_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, 3_000).allowed).toBe(false);
  });

  it("isolates buckets by key", () => {
    expect(checkRateLimit("user-B", 1, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit("user-C", 1, 60_000, 1_000).allowed).toBe(true);
  });

  it("recovers after the window slides past prior hits", () => {
    const key = "user-D";
    expect(checkRateLimit(key, 1, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, 2_000).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 60_000, 62_000).allowed).toBe(true); // 1_000 hit expired
  });
});
```

Each `checkRateLimit` test uses a distinct key so the module-level Map cannot bleed across tests.

- [ ] **Step 2: Run the tests to verify they fail (RED)**

Run: `npx vitest run tests/lib/rate-limit.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/rate-limit"` (file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/rate-limit.ts`:

```ts
export interface RateLimitResult {
  /** Whether this request is permitted. */
  allowed: boolean;
  /** Timestamps to persist for this key: pruned to the window, with `now` appended iff allowed. */
  hits: number[];
  /** Whole seconds until the caller may retry; 0 when allowed. */
  retryAfter: number;
}

/**
 * Pure sliding-window decision. No I/O, no clock — the caller passes `now`.
 *
 * @param hits     prior request timestamps (ms epoch) for one key, oldest-first
 * @param now      current time (ms epoch)
 * @param limit    max requests permitted within the window
 * @param windowMs sliding window length in ms
 */
export function slidingWindow(
  hits: number[],
  now: number,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = hits.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = Math.min(...recent);
    const retryAfter = Math.max(Math.ceil((oldest + windowMs - now) / 1000), 1);
    return { allowed: false, hits: recent, retryAfter };
  }

  return { allowed: true, hits: [...recent, now], retryAfter: 0 };
}

const buckets = new Map<string, number[]>();

/**
 * Stateful per-key wrapper over {@link slidingWindow}, backed by a module-level
 * Map. Single-instance, in-memory — acceptable for the current single-node
 * deploy (see the AI_GENERATE_RPM note in the generate-play route).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
  now: number = Date.now(),
): RateLimitResult {
  const prior = buckets.get(key) ?? [];
  const result = slidingWindow(prior, now, limit, windowMs);
  buckets.set(key, result.hits);
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass (GREEN)**

Run: `npx vitest run tests/lib/rate-limit.test.ts`

Expected: PASS — 9 tests.

- [ ] **Step 5: Full verification gate**

Run:
```bash
npm run test:run     # 124 passed (115 + 9)
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (unchanged from Task 1)
npm run build        # success
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts tests/lib/rate-limit.test.ts
git commit -m "feat: add pure sliding-window rate limiter"
```

---

## Task 3: Gate and throttle the AI generate-play endpoint

**Files:**
- Modify: `src/app/api/ai/generate-play/route.ts` (full rewrite of the file, shown below)
- Test: `tests/api/ai/generate-play.test.ts` (new)

**Interfaces:**
- Consumes: `requireMembership({ coach: true })` and `AuthzError` from `@/lib/authz` (existing — `requireMembership` resolves the caller's primary `Membership` or throws `AuthzError`); `checkRateLimit` from `@/lib/rate-limit` (Task 2); `generatePlayFromDescription` from `@/lib/ai/play-generator` (existing).
- Produces: `POST(req: Request): Promise<Response>` — behavior: `403` for non-coach/unauthenticated (`AuthzError`), `429` (+ `Retry-After` header) when the per-user limit is exceeded, `400` for empty description, `503`/`500` for generator errors (unchanged), `200 { canvasData }` on success.

**Context:** Today the route is session-gated only (`auth()` + `session.user.id`), so **any signed-in player can spend Anthropic credits**, and there is no throttle. The fix requires coach membership and applies a per-user in-memory rate limit (default **10 req/min**, env-tunable via `AI_GENERATE_RPM`). `AuthzError` is thrown by `requireMembership`; catching it first in the handler maps it to `403`. The rate key is `membership.userId`. The repo's established route/module test pattern is `vi.mock` (see `tests/lib/actions/*`, `tests/lib/authz.test.ts`); `NextResponse.json` is confirmed to expose `.status`, `.headers`, and `.json()` under the vitest jsdom environment, so the handler is tested directly with the **real** rate limiter and mocked authz + generator.

- [ ] **Step 1: Write the failing route test (RED)**

Create `tests/api/ai/generate-play.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireMembership: vi.fn(),
  AuthzError: class AuthzError extends Error {
    constructor(message = "Not authorized") {
      super(message);
      this.name = "AuthzError";
    }
  },
}));
vi.mock("@/lib/ai/play-generator", () => ({
  generatePlayFromDescription: vi.fn(),
}));

import { POST } from "@/app/api/ai/generate-play/route";
import { requireMembership, AuthzError } from "@/lib/authz";
import { generatePlayFromDescription } from "@/lib/ai/play-generator";

const mockRequireMembership = vi.mocked(requireMembership);
const mockGenerate = vi.mocked(generatePlayFromDescription);

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/ai/generate-play", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function coach(userId: string) {
  return { id: "m-" + userId, userId, orgId: "o1", role: "coach" } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerate.mockResolvedValue({ players: [], routes: [] } as never);
});

afterEach(() => {
  delete process.env.AI_GENERATE_RPM;
});

describe("POST /api/ai/generate-play", () => {
  it("returns 403 when the caller is not a coach", async () => {
    mockRequireMembership.mockRejectedValue(new AuthzError());
    const res = await post({ description: "slant right" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Only coaches can generate plays." });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 400 when the description is missing", async () => {
    mockRequireMembership.mockResolvedValue(coach("u-empty"));
    const res = await post({ description: "   " });
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("returns 200 with canvasData for a coach", async () => {
    mockRequireMembership.mockResolvedValue(coach("u-ok"));
    mockGenerate.mockResolvedValue({ players: ["QB"], routes: [] } as never);
    const res = await post({ description: "slant right", side: "offense" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ canvasData: { players: ["QB"], routes: [] } });
    expect(mockGenerate).toHaveBeenCalledWith("slant right", {
      side: "offense",
      formation: undefined,
      gameFormat: undefined,
    });
  });

  it("returns 429 with Retry-After once the per-user limit is exceeded", async () => {
    process.env.AI_GENERATE_RPM = "2";
    mockRequireMembership.mockResolvedValue(coach("u-rate"));
    expect((await post({ description: "a" })).status).toBe(200);
    expect((await post({ description: "b" })).status).toBe(200);
    const res = await post({ description: "c" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect((await res.json()).error).toMatch(/too quickly/i);
  });
});
```

Each test uses a distinct `userId`, so the real rate limiter's module Map does not bleed between tests. The three calls in the 429 test happen within milliseconds (well inside the 60s window), so with `AI_GENERATE_RPM=2` the third is deterministically blocked.

- [ ] **Step 2: Run the test to verify it fails (RED)**

Run: `npx vitest run tests/api/ai/generate-play.test.ts`

Expected: FAIL — the current route returns `401`/`500` (no `requireMembership`, no rate limit), so the `403`, `400`-order, and `429` expectations fail. (If run before Task 2 landed it would also fail on the missing `@/lib/rate-limit` import — Task 2 is a prerequisite.)

- [ ] **Step 3: Rewrite the route**

Replace the entire contents of `src/app/api/ai/generate-play/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { requireMembership, AuthzError } from "@/lib/authz";
import { generatePlayFromDescription } from "@/lib/ai/play-generator";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Requests/minute per user for AI play generation; env-tunable, default 10. */
function resolveRpm(): number {
  const parsed = Number(process.env.AI_GENERATE_RPM);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export async function POST(req: Request) {
  try {
    const membership = await requireMembership({ coach: true });

    const gate = checkRateLimit(membership.userId, resolveRpm());
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error:
            "You're generating plays too quickly. Please wait a moment and try again.",
        },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
      );
    }

    const body = await req.json();
    const { description, side, formation, gameFormat } = body as {
      description?: string;
      side?: string;
      formation?: string;
      gameFormat?: string;
    };

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    const canvasData = await generatePlayFromDescription(description, {
      side: side as "offense" | "defense" | undefined,
      formation,
      gameFormat,
    });

    return NextResponse.json({ canvasData });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: "Only coaches can generate plays." },
        { status: 403 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate play";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

Notes: the old `auth()`/`401` guard is replaced by `requireMembership({ coach: true })`; both the unauthenticated and non-coach cases now surface as `AuthzError` → `403`. Rate limiting runs before body parsing so malformed/oversized requests still count against the throttle (protecting the expensive generator call). `AuthzError` is checked first in the catch so it is not swallowed by the generic `500` path.

- [ ] **Step 4: Run the test to verify it passes (GREEN)**

Run: `npx vitest run tests/api/ai/generate-play.test.ts`

Expected: PASS — 4 tests.

- [ ] **Step 5: Full verification gate**

Run:
```bash
npm run test:run     # 128 passed (124 + 4)
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (unchanged)
npm run build        # success
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai/generate-play/route.ts tests/api/ai/generate-play.test.ts
git commit -m "fix: require coach membership and rate-limit the AI generate-play endpoint"
```

> The `AI_GENERATE_RPM` env var is intentionally **not** added to `.env.example`: its default (10) and tunability are documented in `resolveRpm()`, and `.env*` edits are outside this plan's allowed-path set (and blocked by the repo's policy engine by default). If the team wants it discoverable, add it to `.env.example` as a separate, explicitly-approved change.

---

## Task 4: Register tokens as Tailwind utilities (`@theme inline` + `@custom-variant` + new color tokens)

**Files:**
- Modify: `src/app/globals.css` (top of file + `:root` and `.light` blocks)
- Temp (created and deleted within this task): `src/_token-smoke.tsx`

**Interfaces:**
- Produces (consumed verbatim by plans 2b/2c and by Task 5): the Tailwind color utilities `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`, `text-primary-foreground`, `text-primary-emphasis`, `bg-secondary`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `bg-destructive`, `border-border`, `ring-ring`, `bg-success`, `bg-warning`, `bg-offense`, `bg-defense` (and their `text-`/`border-`/`ring-` siblings), plus the `font-sans` and `font-display` utilities; and the custom properties `--primary-emphasis`, `--offense`, `--defense` in both `:root` (dark) and `.light`.

**Context:** The 19-token palette already exists in `:root`/`.light` but no `@theme` block registers it, so `bg-card` etc. are not real utilities. `@theme inline` inlines `var(--token)` directly into each generated utility (rather than emitting the theme keys back into `:root`), so utilities resolve at use-time and follow the active theme class — and the two font keys, which reference the next/font-provided `--font-sans`/`--font-display` on `<body>`, do not become self-referential. `@custom-variant dark` binds `dark:` to the `.dark` class; the only real `dark:` usage in the app (`theme-toggle.tsx`) has `dark:` classes identical to its base classes, so this is visually inert. **No component is touched and no new utility is consumed yet, so dark mode is unchanged.**

- [ ] **Step 1: Add the variant + theme block**

In `src/app/globals.css`, immediately after line 1 (`@import "tailwindcss";`) insert:

```css
@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-emphasis: var(--primary-emphasis);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-offense: var(--offense);
  --color-defense: var(--defense);
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
}
```

- [ ] **Step 2: Add the new tokens to `:root` (dark)**

In the `:root { ... }` block, after `--warning: #d97706;` (currently line 19) add:

```css
  --primary-emphasis: #5eead4;
  --offense: #3b82f6;
  --defense: #ef4444;
```

- [ ] **Step 3: Add the new tokens to `.light`**

In the `.light { ... }` block, after `--warning: #d97706;` (currently line 38) add:

```css
  --primary-emphasis: #0f766e;
  --offense: #2563eb;
  --defense: #dc2626;
```

- [ ] **Step 4: Create a temporary scan target so Tailwind emits the new utilities**

Tailwind v4 only emits utilities whose class names appear in a scanned source file; no component uses them yet, so create `src/_token-smoke.tsx` (deleted in Step 7):

```tsx
// TEMPORARY Tailwind scan target — deleted at the end of Task 4.
export const _tokenSmoke =
  "bg-background text-foreground bg-card text-card-foreground border-border ring-ring text-muted-foreground text-primary-emphasis bg-offense bg-defense font-display";
```

- [ ] **Step 5: Build and confirm the utilities compiled (smoke)**

Run:
```bash
npm run build
grep -Rho "\.bg-background{[^}]*}" .next/static/css | head -1
grep -Rho "\.text-primary-emphasis{[^}]*}" .next/static/css | head -1
grep -Rho "\.font-display{[^}]*}" .next/static/css | head -1
```

Expected (values may be minified/reordered but the `var()` reference must be present):
```
.bg-background{background-color:var(--background)}
.text-primary-emphasis{color:var(--primary-emphasis)}
.font-display{font-family:var(--font-display)}
```

This proves `@theme inline` registered the tokens and that the utilities resolve the custom properties (so they will follow `.light`).

- [ ] **Step 6: Confirm dark mode is unchanged**

The `:root`/`.light` values are untouched except for three additive tokens, and no component consumes the new utilities, so the rendered app is byte-for-byte the same in dark mode. No screenshot needed for this task (Task 5 covers the body-background change).

- [ ] **Step 7: Delete the temporary scan target**

```bash
rm src/_token-smoke.tsx
```

- [ ] **Step 8: Full verification gate (without the temp file)**

Run:
```bash
npm run test:run     # 128 passed
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (unchanged)
npm run build        # success
```

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: register CSS tokens as Tailwind utilities via @theme inline; add primary-emphasis/offense/defense"
```

Confirm `git status` shows no stray `src/_token-smoke.tsx` before committing.

---

## Task 5: Surface utilities + tokenized body background

**Files:**
- Modify: `src/app/globals.css` (`:root` and `.light` blocks; `body`, `body::before`, `::selection` rules; add `.surface-1`/`.surface-2`)

**Interfaces:**
- Produces (consumed verbatim by plans 2b/2c): CSS utility classes `.surface-1` (glass-card gradient) and `.surface-2` (panel gradient), each driven by theme-scoped `--surface-*-from/-to` custom properties that `.light` overrides; and a fully token-driven body background (`--body-gradient`, `--body-grid-color`, `--body-grid-mask`).

**Context:** `card.tsx` hardcodes `linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))` and `coach-sidebar.tsx`/`player-tabs.tsx` hardcode `linear-gradient(180deg,rgba(15,29,26,0.98),rgba(8,17,15,0.98))`. Those call sites are **not** migrated here (that is plans 2b/2c) — this task only *defines* `.surface-1`/`.surface-2` for them to adopt later, so it has **no visual effect** on its own. The body background is retokenized: the **dark** values are copied verbatim from the current file, so dark mode is **pixel-identical**; `.light` gets a soft paper-green counterpart (not visually validated this phase). `::selection` moves to `color-mix(in srgb, var(--ring) 28%, transparent)`, which equals the current `rgba(20,184,166,0.28)` in dark (`--ring` = `#14b8a6`).

- [ ] **Step 1: Add surface + body custom properties to `:root` (dark, verbatim values)**

In the `:root { ... }` block, after the three tokens added in Task 4 (`--defense: #ef4444;`) add:

```css
  --surface-1-from: rgba(255, 255, 255, 0.05);
  --surface-1-to: rgba(255, 255, 255, 0.02);
  --surface-2-from: rgba(15, 29, 26, 0.98);
  --surface-2-to: rgba(8, 17, 15, 0.98);
  --body-gradient:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 28%),
    radial-gradient(circle at 85% 15%, rgba(217, 119, 6, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 28%),
    linear-gradient(135deg, #071412 0%, #0b1b17 45%, #081311 100%);
  --body-grid-color: rgba(255, 255, 255, 0.025);
  --body-grid-mask: linear-gradient(180deg, rgba(0, 0, 0, 0.42), transparent 72%);
```

- [ ] **Step 2: Add the light counterparts to `.light`**

In the `.light { ... }` block, after the three tokens added in Task 4 (`--defense: #dc2626;`) add:

```css
  --surface-1-from: rgba(255, 255, 255, 0.92);
  --surface-1-to: rgba(255, 255, 255, 0.72);
  --surface-2-from: rgba(255, 255, 255, 0.96);
  --surface-2-to: rgba(240, 244, 236, 0.92);
  --body-gradient:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 30%),
    radial-gradient(circle at 85% 15%, rgba(180, 83, 9, 0.06), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent 30%),
    linear-gradient(135deg, #f4f5ef 0%, #eef2e9 45%, #f4f5ef 100%);
  --body-grid-color: rgba(16, 32, 29, 0.045);
  --body-grid-mask: linear-gradient(180deg, rgba(0, 0, 0, 0.06), transparent 72%);
```

- [ ] **Step 3: Point the body background at the tokens**

Replace the current `body { ... }` rule (currently lines 45–57) with:

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-image: var(--body-gradient);
  background-attachment: fixed;
}
```

- [ ] **Step 4: Point the grid overlay at the tokens**

Replace the current `body::before { ... }` rule (currently lines 59–69) with:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--body-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--body-grid-color) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: var(--body-grid-mask);
}
```

- [ ] **Step 5: Add the surface utility classes**

Immediately after the `body::before` rule, add:

```css
.surface-1 {
  background-image: linear-gradient(180deg, var(--surface-1-from), var(--surface-1-to));
}

.surface-2 {
  background-image: linear-gradient(180deg, var(--surface-2-from), var(--surface-2-to));
}
```

- [ ] **Step 6: Tokenize `::selection`**

Replace the current `::selection { ... }` rule (currently lines 131–134) with:

```css
::selection {
  background: color-mix(in srgb, var(--ring) 28%, transparent);
  color: var(--primary-foreground);
}
```

- [ ] **Step 7: Build and confirm the surfaces + body tokens compiled (smoke)**

`.surface-1`/`.surface-2` are authored classes (always emitted, regardless of usage). Run:
```bash
npm run build
grep -Rho "\.surface-1{[^}]*}" .next/static/css | head -1
grep -Rho "\.surface-2{[^}]*}" .next/static/css | head -1
```

Expected:
```
.surface-1{background-image:linear-gradient(180deg,var(--surface-1-from),var(--surface-1-to))}
.surface-2{background-image:linear-gradient(180deg,var(--surface-2-from),var(--surface-2-to))}
```

- [ ] **Step 8: Confirm dark mode is pixel-identical**

Every dark value in Steps 1/3/4/6 is copied verbatim from the pre-Task-5 file (`--body-gradient` = the old four-layer stack; `--body-grid-color` = `rgba(255,255,255,0.025)`; `--body-grid-mask` = the old mask; `::selection` `color-mix(... --ring 28% ...)` = the old `rgba(20,184,166,0.28)` since `--ring` is `#14b8a6`). Optional manual check: `npm run dev`, open any route in dark mode, confirm the background gradient, grid overlay, and text selection colour are unchanged from before this task.

- [ ] **Step 9: Full verification gate**

Run:
```bash
npm run test:run     # 128 passed
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (unchanged)
npm run build        # success
```

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add surface utilities and tokenize body background + selection"
```

---

## Task 6: Pre-hydration theme script (no-flash light mode enablement)

**Files:**
- Create: `src/lib/theme-script.ts`
- Test: `tests/lib/theme-script.test.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces:
  - `THEME_STORAGE_KEY: string` (= `"playforge-theme"`, matching `theme-provider.tsx`).
  - `resolveThemeClass(stored: string | null, prefersDark: boolean): "dark" | "light"` — pure resolver (default `dark`; `light` → `light`; `system` → `prefersDark ? dark : light`; unknown → `dark`).
  - `themeInitScript: string` — a self-invoking snippet, injected inline via `dangerouslySetInnerHTML`, that mirrors `resolveThemeClass` and sets the class on `<html>` before first paint.

**Context:** `layout.tsx` hardcodes `<html className="dark">`. To enable light mode without a flash, remove the hardcoded class and inject a blocking inline script (first child of `<body>`) that reads `localStorage["playforge-theme"]` (values `dark|light|system`, default `dark`; `system` resolves via `matchMedia`) and sets `.dark`/`.light` on `<html>` before body content paints. `suppressHydrationWarning` is already on `<html>` and stays. `ThemeProvider` (theme-provider.tsx) is unchanged — it re-applies the class on mount and owns runtime toggling. Because `:root` already holds the dark defaults, users with no stored preference render dark immediately even before the script runs; the script only matters for `.light`/`system` users. The resolution logic is unit-tested as the pure `resolveThemeClass`; the inline string mirrors it and a guard test asserts the string references the storage key and default so the two cannot silently drift.

- [ ] **Step 1: Write the failing tests (RED)**

Create `tests/lib/theme-script.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  resolveThemeClass,
  themeInitScript,
  THEME_STORAGE_KEY,
} from "@/lib/theme-script";

describe("resolveThemeClass", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(resolveThemeClass(null, true)).toBe("dark");
    expect(resolveThemeClass(null, false)).toBe("dark");
  });

  it("honours an explicit light preference", () => {
    expect(resolveThemeClass("light", true)).toBe("light");
  });

  it("honours an explicit dark preference", () => {
    expect(resolveThemeClass("dark", false)).toBe("dark");
  });

  it("resolves system via prefers-color-scheme", () => {
    expect(resolveThemeClass("system", true)).toBe("dark");
    expect(resolveThemeClass("system", false)).toBe("light");
  });

  it("falls back to dark for an unrecognised value", () => {
    expect(resolveThemeClass("chartreuse", false)).toBe("dark");
  });
});

describe("themeInitScript", () => {
  it("references the storage key and the dark fallback", () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
    expect(themeInitScript).toContain("prefers-color-scheme: dark");
    expect(themeInitScript).toContain("classList.add('dark')");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail (RED)**

Run: `npx vitest run tests/lib/theme-script.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/theme-script"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/theme-script.ts`:

```ts
export const THEME_STORAGE_KEY = "playforge-theme";

/**
 * Pure theme resolver — the single source of truth for the pre-hydration
 * decision. Mirrors theme-provider.tsx: stored `dark | light | system`
 * (default dark); `system` resolves via prefers-color-scheme; anything
 * unrecognised falls back to dark.
 */
export function resolveThemeClass(
  stored: string | null,
  prefersDark: boolean,
): "dark" | "light" {
  const theme = stored ?? "dark";
  if (theme === "light") return "light";
  if (theme === "system") return prefersDark ? "dark" : "light";
  return "dark";
}

/**
 * Self-invoking snippet injected inline (dangerouslySetInnerHTML) as the first
 * child of <body>. It runs before body content paints and sets the theme class
 * on <html>, preventing a flash. It mirrors resolveThemeClass exactly; the
 * theme-script guard test keeps the two in sync.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'dark';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='light'?'light':(t==='system'?(d?'dark':'light'):'dark');var c=document.documentElement.classList;c.remove('dark','light');c.add(r);}catch(e){document.documentElement.classList.add('dark');}})();`;
```

- [ ] **Step 4: Run the tests to verify they pass (GREEN)**

Run: `npx vitest run tests/lib/theme-script.test.ts`

Expected: PASS — 6 tests.

- [ ] **Step 5: Wire the script into the layout and drop the hardcoded class**

In `src/app/layout.tsx`, add the import after the existing `ThemeProvider` import:

```tsx
import { themeInitScript } from "@/lib/theme-script";
```

Then replace the returned JSX (currently lines 39–47):

```tsx
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
```

with (note: `className="dark"` removed from `<html>`, `suppressHydrationWarning` kept; script is the first child of `<body>`):

```tsx
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
```

- [ ] **Step 6: Manual no-flash smoke (dev server)**

Run `npm run dev`, then in the browser:
- Default (no stored key): page loads **dark**, no flash. Confirm `<html>` has `class="dark"`.
- `localStorage.setItem("playforge-theme","light"); location.reload();` → `<html>` has `class="light"` on the very first paint (no dark flash).
- `localStorage.setItem("playforge-theme","system"); location.reload();` → class matches the OS setting.
- Restore: `localStorage.removeItem("playforge-theme")`.

(Because components still hardcode dark colors until 2b/2c, `.light` will look unstyled — that is expected; this task only verifies the class is applied before paint.)

- [ ] **Step 7: Full verification gate**

Run:
```bash
npm run test:run     # 134 passed (128 + 6)
npx tsc --noEmit     # clean
npm run lint         # 7 errors / 18 warnings (unchanged)
npm run build        # success
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/theme-script.ts tests/lib/theme-script.test.ts src/app/layout.tsx
git commit -m "feat: pre-hydration theme script; drop hardcoded html dark class"
```

---

## Spec coverage (self-review)

| Design spec / contract item | Task |
|---|---|
| §7 hazard: `use-keyboard-shortcuts.ts` render-time ref write | Task 1 |
| §7 hazard: generate-play `requireMembership({coach:true})` + rate limit (env-tunable) | Tasks 2–3 |
| §1: `@theme inline` mapping all 19 tokens to utilities | Task 4 |
| §1: `@custom-variant dark (&:where(.dark, .dark *))` | Task 4 |
| §1: new tokens `--primary-emphasis`, `--offense`, `--defense` (dark + light) | Task 4 |
| §1: fonts registered in `@theme` (`--font-sans`, `--font-display`) | Task 4 |
| §1: `.surface-1` / `.surface-2` utilities from theme-scoped props | Task 5 |
| §1: body background tokenized with light counterpart; `::selection` uses `--ring` at alpha | Task 5 |
| §5: pre-hydration theme script replacing hardcoded `<html className="dark">` | Task 6 |

**Out of scope (later plans):** component token migration and `dark:`→token sweep (2b/2c), `ThemeToggle` re-mounting (§5), light-value contrast tuning (§5), Radix Dialog/segmented-control/select primitives (§3), engine `FIELD.COLORS` (§6), grep gates and full dark+light QA (phase close).

## Execution options

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task with two-stage review between tasks (REQUIRED SUB-SKILL: superpowers:subagent-driven-development).

**2. Inline Execution** — execute tasks in one session with checkpoints (REQUIRED SUB-SKILL: superpowers:executing-plans).
