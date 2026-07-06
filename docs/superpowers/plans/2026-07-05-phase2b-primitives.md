# PlayForge Phase 2b — Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the shared UI primitives to design tokens, introduce three token-styled primitives (`Dialog`, `SegmentedControl`, `Select`), and migrate every existing bespoke call site onto them.

**Architecture:** This is Phase 2 §3 (primitives) only. Plan 2a (token foundation) lands first and is treated as existing — its Tailwind token utilities and `.surface-*` classes are consumed here. This plan defines the three new/rewritten primitives that plans 2c and 2d consume verbatim, then migrates the 6 direct-Radix dialogs, 3 bespoke segmented toggles, and 6 raw `<select>`s. The mechanical neutral/accent sweep of surrounding page markup (§4) is a *separate* plan; tasks here change only the primitive and its direct call sites, never unrelated `zinc-*` in a file they happen to touch.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (`@theme inline` tokens), class-variance-authority (CVA), Radix UI (`@radix-ui/react-dialog` already a dependency), lucide-react, Vitest + Testing Library (jsdom).

## Global Constraints

- **No new npm dependencies.** Everything needed (`@radix-ui/react-dialog`, `class-variance-authority`, `lucide-react`, `clsx`, `tailwind-merge`) is already installed.
- **CVA stays the variant mechanism; `cn()` from `@/lib/utils` is unchanged.**
- **Consumed token utilities (from plan 2a, treat as existing):** `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`, `text-primary-foreground`, `text-primary-emphasis`, `bg-secondary`, `text-secondary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `text-destructive`, `border-border`, `ring-ring`, `text-success`, `text-warning`, `bg-offense`, `bg-defense` — plus every standard color-utility form of each registered token (`text-`/`bg-`/`border-`/`ring-`/`ring-offset-`) and opacity modifiers (e.g. `text-foreground/85`, `bg-primary/15`, `border-destructive/30`). CSS classes `.surface-1` and `.surface-2`. The `dark:` variant follows the `.dark` class.
- **Verification contract — every task must pass before its commit:**
  - `npm run test:run` — green (115 test baseline; this plan adds tests, never removes).
  - `npx tsc --noEmit` — clean.
  - `npm run lint` — **no new errors** over the baseline (baseline: 8 errors, all in `src/engine/play-canvas.tsx` and `src/lib/use-keyboard-shortcuts.ts`, both untouched here). Removing a bespoke close-X orphans its `X` lucide import — deleting that import is part of the task, or lint fails.
  - `npm run build` — succeeds.
  - **Visual:** dark-mode appearance near-identical (intentional subtle warm-neutral shift is expected). Manual step: run the dev server, screenshot the affected surface before/after, eyeball it. Not automatable — call it out in the commit, do not block on pixel-diffing.
- **Dialog import gate (enforced in the final task):** after all migrations, `@radix-ui/react-dialog` is imported by `src/components/ui/dialog.tsx` **only**.

---

### Task 1: Re-skin `button.tsx` to tokens

**Files:**
- Modify: `src/components/ui/button.tsx`
- Test: `tests/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: 2a token utilities (`bg-primary`, `text-primary-foreground`, `text-primary-emphasis`, `bg-secondary`, `text-secondary-foreground`, `text-muted-foreground`, `text-foreground`, `border-border`, `bg-destructive`, `ring-ring`, `ring-offset-background`).
- Produces: `Button` and `buttonVariants` — **public API unchanged** (same `variant`/`size` names, same props). Consumed everywhere.

- [ ] **Step 1: Add failing tests for the tokenized variants**

Append to `tests/components/ui/button.test.tsx` inside the existing `describe("Button", …)`:

```tsx
  it("uses the primary token for the default variant", () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole("button", { name: "Primary" });
    expect(btn.className).toContain("bg-primary");
  });

  it("uses primary-emphasis text for the link variant", () => {
    render(<Button variant="link">Link</Button>);
    const btn = screen.getByRole("button", { name: "Link" });
    expect(btn.className).toContain("text-primary-emphasis");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- tests/components/ui/button.test.tsx`
Expected: the two new tests FAIL (current classes are `bg-emerald-600` / `text-emerald-300`). The four existing tests still PASS.

- [ ] **Step 3: Re-skin the variants**

Replace the `cva(...)` call in `src/components/ui/button.tsx` (lines 5-29) with:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(5,150,105,0.28)] hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-border bg-secondary/40 text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        link: "text-primary-emphasis underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

(The colored drop-shadow on `default` is decorative and stays — it reads as a soft glow and keeping it preserves the near-identical look.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- tests/components/ui/button.test.tsx`
Expected: all six tests PASS.

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit` (clean), `npm run lint` (no new errors), `npm run build` (succeeds). Visual: buttons across coach dashboard look near-identical in dark mode.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx tests/components/ui/button.test.tsx
git commit -m "refactor(ui): re-skin Button to design tokens"
```

---

### Task 2: Re-skin `badge.tsx`, add `offense`/`defense` variants, migrate consumers

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/app/(coach)/playbooks/page.tsx` (two Badge instances)
- Modify: `src/app/(coach)/playbooks/[id]/page.tsx` (one Badge instance)
- Test: `tests/components/ui/badge.test.tsx` (NEW)

**Interfaces:**
- Consumes: 2a tokens (`bg-primary/15`, `text-primary-emphasis`, `bg-success`, `text-success`, `bg-warning`, `text-warning`, `bg-destructive`, `text-destructive`, `border-border`, `text-muted-foreground`, `bg-offense/15`, `text-offense`, `bg-defense/15`, `text-defense`).
- Produces: `Badge` with variant union `"default" | "success" | "warning" | "destructive" | "outline" | "offense" | "defense"`. Plans 2c/2d rely on `offense`/`defense` existing.

- [ ] **Step 1: Write the failing test** (NEW file `tests/components/ui/badge.test.tsx`)

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders the offense variant with offense tokens", () => {
    render(<Badge variant="offense">Offense</Badge>);
    expect(screen.getByText("Offense").className).toContain("text-offense");
  });

  it("renders the defense variant with defense tokens", () => {
    render(<Badge variant="defense">Defense</Badge>);
    expect(screen.getByText("Defense").className).toContain("text-defense");
  });

  it("defaults to the primary variant", () => {
    render(<Badge>Base</Badge>);
    expect(screen.getByText("Base").className).toContain("bg-primary/15");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/components/ui/badge.test.tsx`
Expected: FAIL — `offense`/`defense` are not valid variants yet (TypeScript will also flag them; the test run reports the failure).

- [ ] **Step 3: Re-skin variants and add `offense`/`defense`**

Replace the `cva(...)` block in `src/components/ui/badge.tsx` (lines 5-21) with:

```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary-emphasis",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        destructive: "bg-destructive/15 text-destructive",
        outline: "border border-border text-muted-foreground",
        offense: "bg-offense/15 text-offense",
        defense: "bg-defense/15 text-defense",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
```

- [ ] **Step 4: Migrate the playbook Badge consumers**

In `src/app/(coach)/playbooks/page.tsx`, both instances currently read `variant={<side> === "offense" ? "default" : "destructive"}`. Change each to the new semantic variants:

- Line ~55: `variant={pb.side === "offense" ? "offense" : "defense"}`
- Line ~98-102: `variant={share.playbook.side === "offense" ? "offense" : "defense"}`

In `src/app/(coach)/playbooks/[id]/page.tsx`, line ~63:

- `variant={playbook.side === "offense" ? "offense" : "defense"}`

(Leave the neighboring `variant="outline"` badge and all other markup untouched.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- tests/components/ui/badge.test.tsx`
Expected: all three tests PASS.

- [ ] **Step 6: Full verification**

Run: `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: playbook list/detail offense (blue) and defense (red) badges are distinct and legible in dark mode.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/badge.tsx tests/components/ui/badge.test.tsx "src/app/(coach)/playbooks/page.tsx" "src/app/(coach)/playbooks/[id]/page.tsx"
git commit -m "refactor(ui): re-skin Badge to tokens, add offense/defense variants"
```

---

### Task 3: Re-skin `input.tsx` to tokens

**Files:**
- Modify: `src/components/ui/input.tsx`

**Interfaces:**
- Consumes: 2a tokens (`border-border`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `ring-ring`, `ring-offset-background`).
- Produces: `Input` — public API unchanged.

- [ ] **Step 1: Re-skin the className**

Replace the `cn(...)` class string in `src/components/ui/input.tsx` (lines 9-12) with:

```tsx
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-secondary px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
```

- [ ] **Step 2: Verification**

Run: `npm run test:run` (green), `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: login/signup and dialog inputs look near-identical; focus ring is teal.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "refactor(ui): re-skin Input to design tokens"
```

---

### Task 4: Re-skin surfaces — `card.tsx`, `page-skeleton.tsx`, `skeleton.tsx` (delete dead exports)

**Files:**
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/page-skeleton.tsx`
- Modify: `src/components/ui/skeleton.tsx`

**Interfaces:**
- Consumes: 2a `.surface-1` class, tokens (`border-border`, `text-card-foreground`, `border-primary/20`, `bg-muted`).
- Produces: `Card`/`CardHeader`/`CardTitle`/`CardContent` (unchanged API); `Skeleton` (unchanged API); `PageSkeleton` (unchanged API). `SkeletonCard`, `SkeletonText`, `SkeletonImage` are **removed** — grep-verified unused (only defined in `skeleton.tsx`; `page-skeleton.tsx` has its own local `SkeletonCard`).

- [ ] **Step 1: Re-skin `Card`**

In `src/components/ui/card.tsx`, replace the `Card` className (lines 8-11) with:

```tsx
      className={cn(
        "rounded-[22px] border border-border surface-1 text-card-foreground shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:border-primary/20 hover:shadow-[0_22px_60px_rgba(6,78,59,0.18)]",
        className
      )}
```

(The gradient background moves to the `.surface-1` class; the per-page `hover:border-emerald-400/20` override becomes the token `hover:border-primary/20`.)

- [ ] **Step 2: Re-skin the local `SkeletonCard` in `page-skeleton.tsx`**

In `src/components/ui/page-skeleton.tsx`, replace the wrapper `div` className (line 5) with:

```tsx
    <div className="rounded-[22px] border border-border surface-1 p-5 backdrop-blur-md sm:p-6">
```

- [ ] **Step 3: Re-skin `Skeleton` and delete the dead exports**

Replace the entire contents of `src/components/ui/skeleton.tsx` with:

```tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}
```

(Deletes `SkeletonCard`, `SkeletonText`, `SkeletonImage`.)

- [ ] **Step 4: Verification**

Run: `npm run test:run`, `npx tsc --noEmit` (confirms no stale imports of the deleted exports), `npm run lint`, `npm run build`. Visual: cards on the dashboard and the loading skeletons look near-identical.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/page-skeleton.tsx src/components/ui/skeleton.tsx
git commit -m "refactor(ui): re-skin Card/Skeleton surfaces to tokens, drop dead skeleton exports"
```

---

### Task 5: Re-skin feedback primitives — `toast.tsx`, `spinner.tsx`, `error-state.tsx`

**Files:**
- Modify: `src/components/ui/toast.tsx`
- Modify: `src/components/ui/spinner.tsx`
- Modify: `src/components/ui/error-state.tsx`

**Interfaces:**
- Consumes: 2a tokens (`border-success`, `bg-success`, `text-success`, `border-destructive`, `bg-destructive`, `text-destructive`, `border-primary`, `bg-primary`, `text-primary-emphasis`, `border-border`, `border-t-primary`, `.surface-1`, `text-foreground`, `text-muted-foreground`).
- Produces: `ToastProvider`/`useToast` (unchanged API); `Spinner` (unchanged API); `ErrorState` (unchanged API).

- [ ] **Step 1: Re-skin toast variant styles (info → primary, not indigo)**

In `src/components/ui/toast.tsx`, replace the `variantStyles` map (lines 31-35) with:

```tsx
const variantStyles: Record<ToastVariant, string> = {
  success: "border-success/30 bg-success/10 text-success",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-primary/30 bg-primary/10 text-primary-emphasis",
};
```

- [ ] **Step 2: Re-skin the spinner**

In `src/components/ui/spinner.tsx`, replace the base className (line 18) with:

```tsx
        "animate-spin rounded-full border-border border-t-primary",
```

- [ ] **Step 3: Re-skin the error state**

In `src/components/ui/error-state.tsx`, replace the outer container, icon bubble, and text classes:

- Line 13 container: `"flex flex-col items-center justify-center gap-4 rounded-[22px] border border-border surface-1 py-20 text-center backdrop-blur-md"`
- Line 14 icon bubble: `"flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"`
- Line 15 icon: `<XCircle className="h-6 w-6 text-destructive" />`
- Line 18 heading: `<p className="text-sm font-medium text-foreground">Something went wrong</p>`
- Line 19 sub-text: `<p className="mt-1 text-xs text-muted-foreground">`

(The `Button variant="outline"` retry button is already a token primitive from Task 1 — leave it.)

- [ ] **Step 4: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: trigger a toast of each kind (info now teal), a spinner, and an error state — all near-identical.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/toast.tsx src/components/ui/spinner.tsx src/components/ui/error-state.tsx
git commit -m "refactor(ui): re-skin toast/spinner/error-state to tokens (info -> primary)"
```

---

### Task 6: Re-skin menu/popover primitives — `dropdown-menu.tsx`, `notification-bell.tsx`

**Files:**
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/notification-bell.tsx`

**Interfaces:**
- Consumes: 2a tokens (`bg-card`, `border-border`, `text-foreground`, `text-secondary-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-border`, `text-destructive`, `bg-destructive`, `bg-primary`, `bg-warning`).
- Produces: `DropdownMenu`/`DropdownItem`/`DropdownSeparator`/`DropdownLabel` (unchanged API); `NotificationBell` (unchanged API + behavior — token colors only).

- [ ] **Step 1: Re-skin `dropdown-menu.tsx`**

Apply these token swaps (behavior untouched):

- `Radix.Content` className (lines 21-28): `"z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl backdrop-blur-xl"` followed by the same three animation lines and `"duration-100"`.
- `DropdownItem` base (line 54): `"flex w-full cursor-default select-none items-center gap-2 px-3 py-1.5 text-sm outline-none transition-colors"`.
- `DropdownItem` variant branch (lines 55-57):
  ```tsx
        variant === "destructive"
          ? "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          : "text-secondary-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-foreground",
  ```
- `DropdownSeparator` (line 67): `<Radix.Separator className="my-1 h-px bg-border" />`
- `DropdownLabel` (line 73): `"px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"`

- [ ] **Step 2: Re-skin `notification-bell.tsx`**

Token swaps only (all merge/read/mark logic untouched):

- `TYPE_COLOR` map (lines 26-30):
  ```tsx
  const TYPE_COLOR: Record<string, string> = {
    player_inactive: "bg-warning",
    quiz_due: "bg-destructive",
    game_plan: "bg-primary",
  };
  ```
- Trigger button (line 105): `"relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"`
- Unread count badge (line 110): `"absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white"`
- `Popover.Content` (line 123): `"z-50 w-80 rounded-xl border border-border bg-card shadow-2xl backdrop-blur-xl"` (keep the animation lines below it).
- Header border + title (line 132/133): `border-border` and `text-foreground`; "Clear all" button (line 137): `"text-[11px] text-muted-foreground transition-colors hover:text-foreground"`.
- Empty state (line 147): `text-muted-foreground`.
- Notification `<a>` (line 157): `"block border-b border-border/50 px-4 py-3 transition-colors hover:bg-secondary"` and the unread flag `!n.read && "bg-primary/10"` (line 159).
- Unread dot fallback (line 165): `!n.read ? (TYPE_COLOR[n.type] ?? "bg-primary") : "bg-muted"`.
- Title/message text (lines 169-173): read state `text-muted-foreground`, unread `text-foreground`; message `text-muted-foreground`.
- `Popover.Arrow` (line 182): `className="fill-border"`.

- [ ] **Step 3: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: open the roster player-actions dropdown and the notification bell popover — both near-identical.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/notification-bell.tsx
git commit -m "refactor(ui): re-skin dropdown-menu and notification-bell to tokens"
```

---

### Task 7: Create the `Dialog` primitive

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Test: `tests/components/ui/dialog.test.tsx` (NEW)

**Interfaces:**
- Consumes: `@radix-ui/react-dialog`, lucide `X`, 2a tokens (`border-border`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `ring-ring`).
- Produces (plans 2c/2d + Tasks 8-9 consume verbatim):
  - `Dialog` (Radix Root — accepts `open`, `onOpenChange`, `defaultOpen`)
  - `DialogTrigger` (Radix Trigger)
  - `DialogClose` (Radix Close)
  - `DialogContent` — renders Portal + Overlay + Content shell with a built-in top-right close-X (`aria-label="Close"`); accepts `className` (merged) for per-site width overrides
  - `DialogHeader`, `DialogFooter` — layout `div`s
  - `DialogTitle` (default `text-sm font-semibold text-foreground`), `DialogDescription` (default `text-sm text-muted-foreground`)

- [ ] **Step 1: Write the failing test** (NEW file `tests/components/ui/dialog.test.tsx`)

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("renders title, description, and a labelled close button when open", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test title</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/components/ui/dialog.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/dialog`.

- [ ] **Step 3: Create the primitive** (`src/components/ui/dialog.tsx`)

```tsx
"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Close"
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)} {...props} />;
}

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

(The `pr-8` on `DialogHeader` reserves room so the title never sits under the absolute close-X. The default width `w-full max-w-md` is overridable per site via `className`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/components/ui/dialog.test.tsx`
Expected: PASS (all three assertions). No Radix a11y console warning, because a `DialogTitle` and `DialogDescription` are present.

- [ ] **Step 5: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/dialog.tsx tests/components/ui/dialog.test.tsx
git commit -m "feat(ui): add token-styled Dialog primitive (Radix wrapper)"
```

---

### Task 8: Migrate `ConfirmDialog` onto the `Dialog` primitive

**Files:**
- Modify: `src/components/ui/confirm-dialog.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` from Task 7; `Button` from Task 1.
- Produces: `ConfirmDialog` with **public props unchanged**: `{ open, onOpenChange, title, description, confirmLabel, destructive?, onConfirm }`. Phase 1 call sites depend on this exact signature — do not change it.

- [ ] **Step 1: Rewrite the component body** (`src/components/ui/confirm-dialog.tsx`)

Replace the entire file with:

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify no direct Radix import remains here**

Search `src/components/ui/confirm-dialog.tsx` for `@radix-ui/react-dialog` (Grep tool, `rg`, or editor search).
Expected: no matches.

- [ ] **Step 3: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: trigger a destructive confirm (e.g. delete a play) and a non-destructive one — the shell, Cancel/confirm buttons, and the new top-right X behave correctly; appearance near-identical.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/confirm-dialog.tsx
git commit -m "refactor(ui): migrate ConfirmDialog onto Dialog primitive (props unchanged)"
```

---

### Task 9: Migrate the remaining 5 direct-Radix dialog call sites

**Files:**
- Modify: `src/components/roster/player-card.tsx`
- Modify: `src/components/account/change-password-dialog.tsx`
- Modify: `src/app/(coach)/game-plans/create-game-plan-dialog.tsx`
- Modify: `src/app/(coach)/playbooks/new-playbook-dialog.tsx`
- Modify: `src/app/(coach)/designer/page.tsx` (print panel only)

**Interfaces:**
- Consumes: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` from Task 7.
- Produces: no exported-API change; these are leaf call sites.

**Scope rule for this task:** change **only** the dialog shell — swap `Dialog.Root/Portal/Overlay/Content/Title/Description/Close` for the wrapper components, delete each hand-rolled top-right close-X (the wrapper owns it), remove the now-unused `X` lucide import where applicable, and add a `DialogDescription` where one is missing. Leave all inner markup (form fields, labels, error divs, side toggles, existing `Button`s) exactly as-is; the neutral/accent sweep of that markup is a separate plan.

- [ ] **Step 1: Migrate `player-card.tsx`**

- Replace the import `import * as Dialog from "@radix-ui/react-dialog";` (line 4) with:
  ```tsx
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  ```
- Change the lucide import (line 5) from `{ MoreVertical, KeyRound, Copy, X }` to `{ MoreVertical, KeyRound, Copy }` (`X` is now unused).
- Replace the dialog block (lines 109-178) with:

```tsx
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Reset player password</DialogTitle>
            <DialogDescription>
              {tempPassword
                ? "Share this one-time password with the player. It won't be shown again."
                : `Generate a new temporary password for ${name || "this player"}. Their current password will stop working.`}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
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
                <Button type="button" onClick={() => handleOpenChange(false)}>
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
                  onClick={() => handleOpenChange(false)}
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
        </DialogContent>
      </Dialog>
```

(The `<Card>` wrapper and `CardContent` above the dialog are unchanged.)

- [ ] **Step 2: Migrate `change-password-dialog.tsx`**

- Replace `import * as Dialog from "@radix-ui/react-dialog";` (line 4) with:
  ```tsx
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
  ```
- Delete the lucide line `import { X } from "lucide-react";` (line 5) entirely — it was the only lucide import and `X` is no longer used.
- Replace the return JSX from `<Dialog.Root …>` through its close (lines 56-138) with:

```tsx
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
```

(Labels keep their `text-zinc-300` and the error div keeps its red styling — intentionally out of scope here.)

- [ ] **Step 3: Migrate `create-game-plan-dialog.tsx`** (adds a new visible description — a11y gap fix)

- Replace `import * as Dialog from "@radix-ui/react-dialog";` (line 5) with:
  ```tsx
  import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  } from "@/components/ui/dialog";
  ```
- Change the lucide import (line 10) from `{ Plus, Loader2, X }` to `{ Plus, Loader2 }`.
- Replace the JSX from `<Dialog.Root …>` to its close (lines 59-134) with:

```tsx
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Game Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Game Plan</DialogTitle>
          <DialogDescription>
            Set up a game plan for an upcoming opponent.
          </DialogDescription>
        </DialogHeader>

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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
```

- [ ] **Step 4: Migrate `new-playbook-dialog.tsx`** (adds a new visible description; keep the bespoke side toggle)

- Replace `import * as Dialog from "@radix-ui/react-dialog";` (line 5) with the same 8-name import used in Step 3 (`Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose`).
- Change the lucide import (line 10) from `{ Plus, Loader2, X }` to `{ Plus, Loader2 }`.
- Leave `import { cn } from "@/lib/utils";` — the side toggle still uses `cn`.
- Replace the JSX from `<Dialog.Root …>` to its close (lines 56-129) with:

```tsx
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Playbook</DialogTitle>
          <DialogDescription>
            Create a playbook to organize your plays by side of the ball.
          </DialogDescription>
        </DialogHeader>

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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
```

(The side toggle keeps its `bg-indigo-600` — it is **not** one of the three enumerated SegmentedControl migrations and is intentionally left for the accent sweep plan.)

- [ ] **Step 5: Migrate the designer print panel** (`src/app/(coach)/designer/page.tsx`, print panel only; adds an `sr-only` description)

- Replace the top-of-file import `import * as Dialog from "@radix-ui/react-dialog";` (line 5) with:
  ```tsx
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  ```
- **Keep** the lucide `X` import (line 40) — `X` is still used by the film-clip panel.
- Replace the Print Panel Modal block (lines 994-1057) with:

```tsx
      {/* ── Print Panel Modal ── */}
      <Dialog open={printPanelOpen} onOpenChange={setPrintPanelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Play</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a print layout and print the current play.
            </DialogDescription>
          </DialogHeader>

          {/* Mode selector */}
          <div className="mb-4 flex rounded-lg bg-zinc-800/80 p-0.5">
            <button
              onClick={() => setPrintMode("playbook")}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                printMode === "playbook"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Playbook
            </button>
            <button
              onClick={() => setPrintMode("wristband")}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                printMode === "wristband"
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Wristband
            </button>
          </div>

          {/* Preview info */}
          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-400">
              {printMode === "playbook" ? (
                <>Full-page layout with play name, diagram, and route assignments. One play per page.</>
              ) : (
                <>Compact 4x4 grid for wristband cards. Play name and mini diagram per cell.</>
              )}
            </p>
            <div className="mt-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-300">{playName}</span>
              {formationName && <> &middot; {formationName}</>}
              {" "}&middot; {canvasData.routes.length} route(s)
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-500"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </DialogContent>
      </Dialog>
```

(The mode selector stays a bespoke toggle here — Task 11 converts it to `SegmentedControl`. Leave it as-is in this task so the two changes stay reviewable independently.)

- [ ] **Step 6: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint` (confirms no orphaned `X` imports), `npm run build`. Visual: open each of the five dialogs — reset-password (roster), change-password (settings/account), new game plan, new playbook, and the designer print panel — confirm each opens, the top-right X closes it, and the layout is near-identical.

- [ ] **Step 7: Commit**

```bash
git add src/components/roster/player-card.tsx src/components/account/change-password-dialog.tsx "src/app/(coach)/game-plans/create-game-plan-dialog.tsx" "src/app/(coach)/playbooks/new-playbook-dialog.tsx" "src/app/(coach)/designer/page.tsx"
git commit -m "refactor(ui): migrate remaining 5 dialogs onto Dialog primitive"
```

---

### Task 10: Create the `SegmentedControl` primitive

**Files:**
- Create: `src/components/ui/segmented-control.tsx`
- Test: `tests/components/ui/segmented-control.test.tsx` (NEW)

**Interfaces:**
- Consumes: lucide `LucideIcon` type, 2a tokens (`bg-secondary`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `text-foreground`).
- Produces (Task 11 + plans 2c/2d consume verbatim):
  - `SegmentedControl<T extends string>({ options, value, onChange, size?, ariaLabel, className? })`
  - `options: { value: T; label: string; icon?: LucideIcon }[]`
  - `value: T`, `onChange: (value: T) => void`, `size?: "sm" | "md"` (default `"md"`), `ariaLabel: string`, `className?: string`
  - Renders `role="radiogroup"` with `role="radio"` buttons, roving `tabIndex`, arrow-key navigation; active option gets `aria-checked="true"`.

- [ ] **Step 1: Write the failing test** (NEW file `tests/components/ui/segmented-control.test.tsx`)

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "@/components/ui/segmented-control";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("SegmentedControl", () => {
  it("marks the active option with aria-checked", () => {
    render(
      <SegmentedControl options={options} value="a" onChange={() => {}} ariaLabel="Test" />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the option value on click", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl options={options} value="a" onChange={onChange} ariaLabel="Test" />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("moves selection to the next option with ArrowRight", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl options={options} value="a" onChange={onChange} ariaLabel="Test" />,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Alpha" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/components/ui/segmented-control.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/segmented-control`.

- [ ] **Step 3: Create the primitive** (`src/components/ui/segmented-control.tsx`)

```tsx
"use client";

import { useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
}

const sizeClasses: Record<"sm" | "md", string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-xs",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + options.length) % options.length;
    } else {
      return;
    }
    e.preventDefault();
    onChange(options[next].value);
    const buttons =
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-lg bg-secondary p-0.5", className)}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
              sizeClasses[size],
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

(Buttons are `flex-1`; the root defaults to `inline-flex` [content width, matching the speed control]. Full-width instances pass `className="w-full"`, which stretches the container so `flex-1` distributes evenly.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/components/ui/segmented-control.test.tsx`
Expected: all three tests PASS.

- [ ] **Step 5: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/segmented-control.tsx tests/components/ui/segmented-control.test.tsx
git commit -m "feat(ui): add accessible token-styled SegmentedControl primitive"
```

---

### Task 11: Migrate the 3 bespoke segmented toggles

**Files:**
- Modify: `src/app/(coach)/designer/page.tsx` (formation side toggle + print-mode toggle)
- Modify: `src/components/play/animation-controls.tsx` (playback speed control)

**Interfaces:**
- Consumes: `SegmentedControl` from Task 10.
- Produces: no exported-API change.

- [ ] **Step 1: Import `SegmentedControl` in `designer/page.tsx`**

Add after the existing `@/components/ui/...` imports:

```tsx
import { SegmentedControl } from "@/components/ui/segmented-control";
```

- [ ] **Step 2: Replace the formation side toggle** (`designer/page.tsx`, lines 820-842)

Replace the `{/* Side toggle */}` block with:

```tsx
              {/* Side toggle */}
              <SegmentedControl
                size="sm"
                ariaLabel="Formation side"
                className="mb-3 w-full"
                value={side}
                onChange={setSide}
                options={[
                  { value: "offense", label: "Offense" },
                  { value: "defense", label: "Defense" },
                ]}
              />
```

(`side` is typed `"offense" | "defense"` and `setSide` accepts that union, so `SegmentedControl<"offense" | "defense">` infers correctly.)

- [ ] **Step 3: Replace the print-mode toggle** (`designer/page.tsx`, the `{/* Mode selector */}` block inside the print `DialogContent` from Task 9)

Replace that `<div className="mb-4 flex rounded-lg bg-zinc-800/80 p-0.5">…</div>` block with:

```tsx
          {/* Mode selector */}
          <SegmentedControl
            size="md"
            ariaLabel="Print mode"
            className="mb-4 w-full"
            value={printMode}
            onChange={setPrintMode}
            options={[
              { value: "playbook", label: "Playbook" },
              { value: "wristband", label: "Wristband" },
            ]}
          />
```

(`printMode` is typed `"playbook" | "wristband"`.)

- [ ] **Step 4: Replace the speed control in `animation-controls.tsx`** (lines 294-309)

The current control maps numeric speeds `[0.5, 1, 2]`. `SegmentedControl` is string-keyed, so use string option values and convert on change (behavior preserved — `handleSpeedChange` still receives a number).

Add the import at the top of `animation-controls.tsx`:

```tsx
import { SegmentedControl } from "@/components/ui/segmented-control";
```

Replace the `{/* Speed controls */}` block with:

```tsx
      {/* Speed controls */}
      <SegmentedControl
        size="sm"
        ariaLabel="Playback speed"
        value={String(speed)}
        onChange={(v) => handleSpeedChange(Number(v))}
        options={[
          { value: "0.5", label: "0.5x" },
          { value: "1", label: "1x" },
          { value: "2", label: "2x" },
        ]}
      />
```

- [ ] **Step 5: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: in the designer, toggle Offense/Defense in the formation panel and Playbook/Wristband in the print dialog; in preview mode, change playback speed. Each active pill is teal; arrow keys move selection. Near-identical.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(coach)/designer/page.tsx" src/components/play/animation-controls.tsx
git commit -m "refactor(ui): migrate side/print-mode/speed toggles onto SegmentedControl"
```

---

### Task 12: Rewrite `select.tsx` and migrate the 6 raw `<select>`s

**Files:**
- Modify: `src/components/ui/select.tsx` (rewrite — currently dead, grep-verified no importers)
- Modify: `src/components/play/playbook-filters.tsx` (2 selects)
- Modify: `src/components/play/play-toolbar.tsx` (2 selects — the awkward ones)
- Modify: `src/components/play/ai-generator.tsx` (1 select)
- Modify: `src/app/(coach)/quizzes/create/quiz-create-client.tsx` (1 select)

**Interfaces:**
- Consumes: 2a tokens (`border-border`, `bg-secondary`, `text-foreground`, `ring-ring`, `ring-offset-background`).
- Produces (plans 2c/2d consume verbatim): `Select` — a `forwardRef` native `<select>` wrapper, props `React.SelectHTMLAttributes<HTMLSelectElement>` (which already includes `className`), default styling `h-10 w-full`.

- [ ] **Step 1: Rewrite `select.tsx`**

Replace the entire contents of `src/components/ui/select.tsx` with:

```tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
```

- [ ] **Step 2: Migrate `quiz-create-client.tsx`** (routine — maps to the default)

Add the import near the other `@/components/ui` imports:

```tsx
import { Select } from "@/components/ui/select";
```

Replace the `<select>…</select>` block (lines 379-390) with:

```tsx
              <Select
                value={selectedPlayId}
                onChange={(e) => setSelectedPlayId(e.target.value)}
              >
                <option value="">Choose a play...</option>
                {PLAY_LIBRARY.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.formation})
                  </option>
                ))}
              </Select>
```

- [ ] **Step 3: Migrate `ai-generator.tsx`** (routine — maps to the default)

Add the import:

```tsx
import { Select } from "@/components/ui/select";
```

Replace the `<select>…</select>` block (lines 133-144) with:

```tsx
              <Select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
              >
                <option value="">Auto-select</option>
                {offenseFormations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
```

(Only the select migrates. The violet `Sparkles`, header, and Generate button stay — the accent sweep is a separate plan.)

- [ ] **Step 4: Migrate `playbook-filters.tsx`** (2 selects; keep them auto-width in the flex row)

Add the import:

```tsx
import { Select } from "@/components/ui/select";
```

Replace the formation-filter `<select>` (lines 112-123) with (`w-auto` overrides the default `w-full` so it stays sized to its row slot):

```tsx
            <Select
              value={formationFilter}
              onChange={(e) => setFormationFilter(e.target.value)}
              className="w-auto"
            >
              <option value="all">All Formations</option>
              {formations.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
```

Replace the sort `<select>` (lines 129-137) with:

```tsx
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-auto px-2"
            >
              <option value="createdAt">Newest</option>
              <option value="name">Name</option>
              <option value="formation">Formation</option>
            </Select>
```

(The play-type button row, tag chips, and search input in this file are **not** part of the select migration — leave them.)

- [ ] **Step 5: Migrate `play-toolbar.tsx`** (2 selects — small sizing overrides; keep the Shield sibling)

Add the import near the top (`cn` is already imported):

```tsx
import { Select } from "@/components/ui/select";
```

Replace the format `<select>` (lines 261-269) with (overrides bring it down to the compact `text-xs` size the toolbar uses):

```tsx
                <Select
                  value={gameFormat}
                  onChange={(e) => onGameFormatChange(e.target.value as GameFormat)}
                  className="h-auto rounded-lg px-2 py-1.5 text-xs font-medium"
                >
                  {formatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
```

Replace the coverage `<select>` (lines 280-289) — keep it inside the existing `relative` wrapper with the absolutely-positioned `Shield` as a sibling after it:

```tsx
                  <Select
                    value={coverageOverlay}
                    onChange={(e) => onCoverageChange(e.target.value)}
                    className="h-auto rounded-lg py-1.5 pl-6 pr-2 text-xs font-medium"
                  >
                    <option value="">None</option>
                    {COVERAGE_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                  <Shield className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
```

(Do not touch the toolbar's bespoke play-type and mode toggles — they are out of scope for this plan.)

- [ ] **Step 6: Verification**

Run: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Visual: exercise every migrated select — quiz "Add Question from Play" play picker, AI generator formation, playbook page formation + sort, and the designer toolbar overflow Format + Coverage selects (the Shield icon still sits inside the coverage select). All near-identical; focus ring is teal.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/select.tsx src/components/play/playbook-filters.tsx src/components/play/play-toolbar.tsx src/components/play/ai-generator.tsx "src/app/(coach)/quizzes/create/quiz-create-client.tsx"
git commit -m "refactor(ui): adopt token-styled Select, migrate 6 raw selects"
```

---

### Task 13: Phase-2b integration gate

**Files:** none modified unless a straggler is found.

**Interfaces:**
- Consumes: everything from Tasks 1-12.
- Produces: a verified, gate-passing 2b branch state.

- [ ] **Step 1: Assert only the primitive imports Radix Dialog**

Search `src` for `@radix-ui/react-dialog` (Grep tool, `rg -rn "@radix-ui/react-dialog" src`, or the editor's project search).
Expected: exactly one match — `src/components/ui/dialog.tsx`. If any other file matches, it is a missed migration from Task 8 or 9 — go back and migrate it, then re-run.

- [ ] **Step 2: Confirm the dead exports and dead file are gone**

Search `src` for `SkeletonCard|SkeletonText|SkeletonImage` (Grep tool or `rg`).
Expected: matches only inside `src/components/ui/page-skeleton.tsx` (its own local `SkeletonCard`). No references to the deleted `skeleton.tsx` exports remain.

- [ ] **Step 3: Full suite**

Run all four gates and confirm each:

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```

Expected: tests green (baseline 115 + the button additions + new badge/dialog/segmented-control suites); `tsc` clean; lint shows no new errors over the 8-error baseline in `play-canvas.tsx`/`use-keyboard-shortcuts.ts`; build succeeds.

- [ ] **Step 4: Manual dark-mode visual QA**

With the dev server running (seeded accounts per `docker-compose.dev.yml`, PLAY01), walk the surfaces this plan touched: coach dashboard (cards, badges, buttons), roster (player-card dialog + dropdown), settings/account (change-password dialog), playbooks list + detail (offense/defense badges), game-plans (create dialog), designer (toolbar selects, formation side toggle, print dialog + print-mode toggle, animation speed), quiz create (play select), and trigger toasts/spinner/error-state/notification-bell. Confirm each reads as near-identical (subtle warm-neutral shift expected, no broken colors).

- [ ] **Step 5: Commit (only if a straggler fix was needed)**

```bash
git add -A
git commit -m "chore(ui): phase-2b primitives integration gate"
```

(If Steps 1-4 pass with no code change, there is nothing to commit — the plan is complete.)

---

## Spec coverage check (§3)

| Spec §3 item | Task(s) |
|---|---|
| New `dialog.tsx` styled Radix wrapper (Overlay/Content/Header/Title/Description/Close+X) | 7 |
| 6 direct-Radix dialogs migrate; `ConfirmDialog` public props unchanged | 8 (confirm), 9 (other 5) |
| Every dialog gets a `DialogDescription` (a11y gap fix) | 8, 9 (3 sites gain new copy) |
| New `segmented-control.tsx`; replaces 3 bespoke toggles | 10 (primitive), 11 (migrations) |
| `select.tsx` rewritten to token styling; 6 raw selects migrate | 12 |
| Re-skin button | 1 |
| Re-skin badge + `offense`/`defense` variants (+ consumer migration) | 2 |
| Re-skin input | 3 |
| Re-skin card | 4 |
| Re-skin skeleton/page-skeleton; delete dead `SkeletonCard`/`Text`/`Image` | 4 |
| Re-skin toast (info → primary), spinner (`border-t-primary`), error-state | 5 |
| Re-skin dropdown-menu, notification-bell (token colors, no behavior change) | 6 |
| CVA stays; `cn()` unchanged | Global constraints |
| Grep gate: only `ui/dialog.tsx` imports `@radix-ui/react-dialog` | 13 |
| Component tests: extend button; add badge offense/defense; (plus dialog + segmented-control) | 1, 2, 7, 10 |
