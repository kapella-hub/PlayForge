# Phase 3d — Offline Player PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the PlayForge player app a hand-rolled service worker so reviewing (recently visited plays, playbook, progress) keeps working offline while quizzes degrade gracefully, plus an install experience and the 3c touch-snap toggle.

**Architecture:** A pure, unit-tested strategy module (`src/lib/sw/strategies.ts`) is the reference for request routing; `public/sw.js` inlines the same logic in plain JS (no imports) and shares a single `SW_VERSION` constant enforced by a version-agreement test. A production-only client component registers the worker and surfaces the update toast. Connectivity state comes from a `useOnline()` `useSyncExternalStore` hook that gates quiz surfaces and drives an offline pill. Install and snap preferences use the established userId-scoped `localStorage` idiom.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind v4 semantic tokens, Vitest + @testing-library/react (jsdom), Playwright (close-out QA). No new runtime dependencies.

## Task Overview

1. SW strategy module (`src/lib/sw/strategies.ts`) — pure request classification + cache names + `SW_VERSION`.
2. `useOnline()` hook (`src/lib/use-online.ts`) — `useSyncExternalStore` over online/offline events.
3. Snap-preference helpers (`src/lib/snap-preference.ts`) — userId-scoped, default ON.
4. Install-prompt helpers + hook (`src/lib/use-install-prompt.ts`) — dismissal scoping + iOS detection.
5. `/offline` static page + `public/sw.js` + version-agreement gate + eslint worker override.
6. Toast action extension + `SwRegister` component + root-layout mount + `mobile-web-app-capable` meta.
7. Offline pill (player header) + quiz gating (banner + disabled start/submit).
8. Install affordance UI on the player home + iOS hint.
9. Snap toggle — magnet button in the designer toolbar threaded through to `PlayCanvas`.
10. Close-out — gate sweep + production-build Playwright QA checklist.

---

## Global Constraints

- **No new dependencies.** The service worker is hand-rolled; Serwist/next-pwa are rejected (build-pipeline friction, Turbopack safety).
- **Per-task verification quartet — all four must pass before the task's commit:**
  - `npm run test:run` — 248 tests baseline; the count only grows, every test passes.
  - `npx tsc --noEmit` — zero type errors.
  - `npm run lint` — **stays 0 errors.** No `eslint-disable` in new code; fix lint at the config level or by using an established idiom.
  - `npm run build` — production build succeeds (Turbopack).
- **Tokens only in DOM UI.** Use Tailwind semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-destructive`, `role="status"`, etc.) — never raw hex/`bg-white`. `public/sw.js` is exempt from token rules (it renders nothing) but is included in the version-agreement gate.
- **Established idioms only:**
  - External browser stores use `useSyncExternalStore` (precedent: `src/components/theme-provider.tsx`).
  - Per-user `localStorage` keys are `"<prefix>:<userId>"` and every read/write is wrapped in `try/catch` returning a safe default (precedent: `src/components/ui/notification-bell.tsx`, `src/lib/draft-storage.ts`).
- **SW registration is production-only** (`process.env.NODE_ENV === "production"`). Dev stays service-worker-free so HMR/QA are never poisoned by caches. Registration failures are tolerated (`console.warn` only).
- **Single version constant.** `SW_VERSION` is declared once in `src/lib/sw/strategies.ts` and mirrored literally in `public/sw.js`; caches are named `playforge-v<N>-{pages,assets}`. Bumping N is the manual invalidation lever.
- **`public/sw.js` scope:** plain JS, no `import`/`importScripts`. It is out of `tsc` scope (tsconfig `include` is `**/*.ts(x)`/`**/*.mts` only, and `sw.js` is imported nowhere). It IS reachable by `npm run lint`, so Task 5 adds a service-worker-globals override block to `eslint.config.mjs` (config-level, not an inline disable). A header comment in each of `sw.js` and `strategies.ts` cross-references the other.
- **Test layout:** `tests/` mirrors `src/`. Environment is jsdom, `globals: true`, `@` aliases `src/`. Hook tests use `renderHook` from `@testing-library/react`; component tests use `render`/`screen`/`fireEvent`.
- **Commit per task** (frequent commits). Do not squash tasks together.

---

### Task 1: SW strategy module (pure)

**Files:**
- Create: `src/lib/sw/strategies.ts`
- Test: `tests/lib/sw/strategies.test.ts`

**Interfaces:**
- Produces:
  - `const SW_VERSION = 1` (number).
  - `type Strategy = "navigation-network-first" | "static-cache-first" | "swr-assets" | "bypass"`.
  - `interface RequestLike { url: string; mode: string; method: string; destination: string }`.
  - `function classifyRequest(req: RequestLike, origin: string): Strategy`.
  - `function pagesCacheName(version?: number): string` → `playforge-v<version>-pages`.
  - `function assetsCacheName(version?: number): string` → `playforge-v<version>-assets`.
  - `function isPlayforgeCacheName(name: string): boolean` → matches `/^playforge-v\d+-(pages|assets)$/`.
- Consumes: nothing.

**Design notes (encode exactly):**
- Classification order is total and every branch is reachable: (1) non-GET → `bypass`; (2) cross-origin → `bypass`; (3) path starts `/api/` → `bypass`; (4) `mode === "navigate"` → `navigation-network-first`; (5) path starts `/_next/static/` → `static-cache-first`; (6) `destination` is `"image"` or `"font"` → `swr-assets`; (7) else → `bypass`.
- The `/_next/static/` check is **before** the image/font check so a hashed-immutable font under `/_next/static/media/*` is cache-first, not SWR.
- "Auth routes" from the spec = the NextAuth endpoints under `/api/auth/*`, which are already subsumed by the `/api/` prefix rule and the non-GET guard (credential POSTs). `/login` / `/signup` / `/join` navigations are ordinary GET navigations and are intentionally cacheable — do NOT special-case them.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/sw/strategies.test.ts
import { describe, it, expect } from "vitest";
import {
  SW_VERSION,
  classifyRequest,
  pagesCacheName,
  assetsCacheName,
  isPlayforgeCacheName,
  type RequestLike,
} from "@/lib/sw/strategies";

const ORIGIN = "https://app.playforge.test";
function req(partial: Partial<RequestLike> & { url: string }): RequestLike {
  return { mode: "no-cors", method: "GET", destination: "", ...partial };
}

describe("classifyRequest", () => {
  it("bypasses every non-GET request, even navigations (server actions are POST)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/home`, mode: "navigate", method: "POST" }), ORIGIN)).toBe("bypass");
    expect(classifyRequest(req({ url: `${ORIGIN}/api/x`, method: "DELETE" }), ORIGIN)).toBe("bypass");
  });

  it("bypasses cross-origin GETs", () => {
    expect(classifyRequest(req({ url: "https://cdn.other.test/a.png", destination: "image" }), ORIGIN)).toBe("bypass");
  });

  it("bypasses /api/** (covers NextAuth /api/auth/*)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/api/plays` }), ORIGIN)).toBe("bypass");
    expect(classifyRequest(req({ url: `${ORIGIN}/api/auth/session` }), ORIGIN)).toBe("bypass");
  });

  it("routes GET navigations network-first", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/home`, mode: "navigate" }), ORIGIN)).toBe("navigation-network-first");
    expect(classifyRequest(req({ url: `${ORIGIN}/login`, mode: "navigate" }), ORIGIN)).toBe("navigation-network-first");
  });

  it("routes /_next/static/** cache-first, winning over destination", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/_next/static/chunks/a.js`, destination: "script" }), ORIGIN)).toBe("static-cache-first");
    expect(classifyRequest(req({ url: `${ORIGIN}/_next/static/media/f.woff2`, destination: "font" }), ORIGIN)).toBe("static-cache-first");
  });

  it("routes same-origin images/fonts stale-while-revalidate", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/icons/icon-192.png`, destination: "image" }), ORIGIN)).toBe("swr-assets");
    expect(classifyRequest(req({ url: `${ORIGIN}/fonts/x.woff2`, destination: "font" }), ORIGIN)).toBe("swr-assets");
  });

  it("bypasses anything else (e.g. a same-origin script outside /_next/static)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/custom.js`, destination: "script" }), ORIGIN)).toBe("bypass");
  });
});

describe("cache names", () => {
  it("builds versioned names from SW_VERSION", () => {
    expect(pagesCacheName()).toBe(`playforge-v${SW_VERSION}-pages`);
    expect(assetsCacheName()).toBe(`playforge-v${SW_VERSION}-assets`);
    expect(pagesCacheName(2)).toBe("playforge-v2-pages");
  });

  it("recognises only playforge versioned cache names", () => {
    expect(isPlayforgeCacheName("playforge-v1-pages")).toBe(true);
    expect(isPlayforgeCacheName("playforge-v9-assets")).toBe(true);
    expect(isPlayforgeCacheName("playforge-pages")).toBe(false);
    expect(isPlayforgeCacheName("other-v1-pages")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/sw/strategies.test.ts`
Expected: FAIL — `Cannot find module '@/lib/sw/strategies'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sw/strategies.ts
// Pure, unit-tested routing reference for the service worker.
// public/sw.js inlines this same logic in plain JS and shares SW_VERSION
// (kept in sync manually; enforced by tests/lib/sw/version-agreement.test.ts).

export const SW_VERSION = 1;

export type Strategy =
  | "navigation-network-first"
  | "static-cache-first"
  | "swr-assets"
  | "bypass";

export interface RequestLike {
  url: string;
  mode: string;
  method: string;
  destination: string;
}

export function classifyRequest(req: RequestLike, origin: string): Strategy {
  if (req.method !== "GET") return "bypass";

  let url: URL;
  try {
    url = new URL(req.url, origin);
  } catch {
    return "bypass";
  }
  if (url.origin !== origin) return "bypass";
  if (url.pathname.startsWith("/api/")) return "bypass";

  if (req.mode === "navigate") return "navigation-network-first";
  if (url.pathname.startsWith("/_next/static/")) return "static-cache-first";
  if (req.destination === "image" || req.destination === "font") return "swr-assets";

  return "bypass";
}

export function pagesCacheName(version: number = SW_VERSION): string {
  return `playforge-v${version}-pages`;
}

export function assetsCacheName(version: number = SW_VERSION): string {
  return `playforge-v${version}-assets`;
}

export function isPlayforgeCacheName(name: string): boolean {
  return /^playforge-v\d+-(pages|assets)$/.test(name);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/sw/strategies.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Run the full quartet**

Run: `npm run test:run` (all pass, count grew) · `npx tsc --noEmit` (clean) · `npm run lint` (0 errors) · `npm run build` (succeeds).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sw/strategies.ts tests/lib/sw/strategies.test.ts
git commit -m "feat(pwa): pure SW request-strategy module with unit tests"
```

---

### Task 2: `useOnline()` connectivity hook

**Files:**
- Create: `src/lib/use-online.ts`
- Test: `tests/lib/use-online.test.ts`

**Interfaces:**
- Produces: `function useOnline(): boolean` — `true` when `navigator.onLine`, re-rendering on `online`/`offline` events.
- Consumes: nothing. Consumed later by the offline pill (Task 7) and quiz gating (Task 7).

**Design notes:**
- Use `useSyncExternalStore` exactly like `src/components/theme-provider.tsx`: a module-level `subscribe` that adds/removes the two window listeners, `getSnapshot` returning `navigator.onLine`, and a server snapshot of `true` (SSR renders as online, then hydration corrects). This is the lint-safe idiom — no `useEffect`, no exhaustive-deps disable.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/use-online.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOnline } from "@/lib/use-online";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

afterEach(() => setOnLine(true));

describe("useOnline", () => {
  it("reflects the initial navigator.onLine value", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it("updates when offline and online events fire", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/use-online.test.ts`
Expected: FAIL — `Cannot find module '@/lib/use-online'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/use-online.ts
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/use-online.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/use-online.ts tests/lib/use-online.test.ts
git commit -m "feat(pwa): useOnline hook via useSyncExternalStore"
```

---

### Task 3: Snap-preference persistence helpers (pure)

**Files:**
- Create: `src/lib/snap-preference.ts`
- Test: `tests/lib/snap-preference.test.ts`

**Interfaces:**
- Produces:
  - `function snapPreferenceKey(userId: string): string` → `playforge-snap:<userId>`.
  - `function loadSnapPreference(userId: string): boolean` — default `true` (ON) when unset or on any error.
  - `function saveSnapPreference(userId: string, enabled: boolean): void`.
- Consumes: nothing. Consumed by the designer wiring in Task 9.

**Design notes:**
- Mirror `src/lib/draft-storage.ts` / `notification-bell.tsx`: `typeof window === "undefined"` guard, `try/catch` around every `localStorage` access, safe default on failure.
- Persist the boolean as the string `"true"` / `"false"`; treat a missing key as ON.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/snap-preference.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  snapPreferenceKey,
  loadSnapPreference,
  saveSnapPreference,
} from "@/lib/snap-preference";

beforeEach(() => localStorage.clear());

describe("snap-preference", () => {
  it("builds a userId-scoped key", () => {
    expect(snapPreferenceKey("u1")).toBe("playforge-snap:u1");
  });

  it("defaults to ON when unset", () => {
    expect(loadSnapPreference("u1")).toBe(true);
  });

  it("round-trips a saved preference", () => {
    saveSnapPreference("u1", false);
    expect(loadSnapPreference("u1")).toBe(false);
    saveSnapPreference("u1", true);
    expect(loadSnapPreference("u1")).toBe(true);
  });

  it("scopes per user", () => {
    saveSnapPreference("u1", false);
    expect(loadSnapPreference("u2")).toBe(true);
  });

  it("treats a garbage stored value as OFF-only-when-exactly-false (default ON otherwise)", () => {
    localStorage.setItem(snapPreferenceKey("u1"), "garbage");
    expect(loadSnapPreference("u1")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/snap-preference.test.ts`
Expected: FAIL — `Cannot find module '@/lib/snap-preference'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/snap-preference.ts
const PREFIX = "playforge-snap:";

export function snapPreferenceKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function loadSnapPreference(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(snapPreferenceKey(userId));
    if (raw === null) return true; // default ON
    return raw === "true"; // only an explicit "false" turns snapping off
  } catch {
    return true;
  }
}

export function saveSnapPreference(userId: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapPreferenceKey(userId), String(enabled));
  } catch {
    // best-effort: persistence failure must never break the designer
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/snap-preference.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/snap-preference.ts tests/lib/snap-preference.test.ts
git commit -m "feat(designer): userId-scoped snap-preference helpers"
```

---

### Task 4: Install-prompt helpers + hook

**Files:**
- Create: `src/lib/use-install-prompt.ts`
- Test: `tests/lib/use-install-prompt.test.ts`

**Interfaces:**
- Produces:
  - `function installDismissedKey(userId: string): string` → `playforge-install-dismissed:<userId>`.
  - `function isInstallDismissed(userId: string): boolean`.
  - `function dismissInstall(userId: string): void`.
  - `function isIosSafariNonStandalone(ua: string, standalone: boolean | undefined): boolean`.
  - `interface InstallPromptState { canInstall: boolean; showIosHint: boolean; promptInstall: () => Promise<void>; dismiss: () => void }`.
  - `function useInstallPrompt(userId: string): InstallPromptState`.
- Consumes: nothing. Consumed by the install affordance UI in Task 8.

**Design notes (encode exactly):**
- `beforeinstallprompt` is not in TS's DOM lib; declare a local minimal type instead of `any`:
  `interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }`.
- Dismissal key/read/write mirror the userId-scoped `localStorage` idiom (guard + `try/catch`, default not-dismissed).
- iOS detection is the spec's one-liner: iOS UA heuristic AND `standalone === false`. `navigator.standalone` is non-standard (iOS Safari only) — read it via a typed cast, never assume it exists elsewhere.
- The hook is thin and delegates to the pure helpers (which carry the unit tests); the hook itself is exercised by the close-out Playwright QA.
  - On mount: compute `showIosHint = isIosSafariNonStandalone(navigator.userAgent, (navigator as ...).standalone) && !isInstallDismissed(userId)`.
  - Subscribe to `window` `beforeinstallprompt`: `preventDefault()`, stash the event, set `canInstall = !isInstallDismissed(userId)`.
  - `promptInstall()`: if a stashed event exists, call `.prompt()`, await `.userChoice`; clear the stashed event and set `canInstall=false`; if outcome is `"dismissed"`, also `dismissInstall(userId)` so we do not nag again.
  - `dismiss()`: `dismissInstall(userId)`, set `canInstall=false`, `showIosHint=false`.

- [ ] **Step 1: Write the failing test (pure helpers only)**

```ts
// tests/lib/use-install-prompt.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  installDismissedKey,
  isInstallDismissed,
  dismissInstall,
  isIosSafariNonStandalone,
} from "@/lib/use-install-prompt";

beforeEach(() => localStorage.clear());

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120";

describe("install dismissal (userId-scoped)", () => {
  it("builds a scoped key", () => {
    expect(installDismissedKey("u1")).toBe("playforge-install-dismissed:u1");
  });

  it("defaults to not dismissed and remembers dismissal per user", () => {
    expect(isInstallDismissed("u1")).toBe(false);
    dismissInstall("u1");
    expect(isInstallDismissed("u1")).toBe(true);
    expect(isInstallDismissed("u2")).toBe(false);
  });
});

describe("isIosSafariNonStandalone", () => {
  it("is true only for an iOS UA that is not standalone", () => {
    expect(isIosSafariNonStandalone(IOS_UA, false)).toBe(true);
  });

  it("is false when standalone (already installed) or undefined", () => {
    expect(isIosSafariNonStandalone(IOS_UA, true)).toBe(false);
    expect(isIosSafariNonStandalone(IOS_UA, undefined)).toBe(false);
  });

  it("is false on non-iOS platforms", () => {
    expect(isIosSafariNonStandalone(ANDROID_UA, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/use-install-prompt.test.ts`
Expected: FAIL — `Cannot find module '@/lib/use-install-prompt'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/use-install-prompt.ts
"use client";

import { useEffect, useState } from "react";

const DISMISS_PREFIX = "playforge-install-dismissed:";

export function installDismissedKey(userId: string): string {
  return `${DISMISS_PREFIX}${userId}`;
}

export function isInstallDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(installDismissedKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function dismissInstall(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(installDismissedKey(userId), "true");
  } catch {
    // best-effort
  }
}

export function isIosSafariNonStandalone(
  ua: string,
  standalone: boolean | undefined,
): boolean {
  const isIos = /iphone|ipad|ipod/i.test(ua);
  return isIos && standalone === false;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  canInstall: boolean;
  showIosHint: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
}

export function useInstallPrompt(userId: string): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setShowIosHint(
      isIosSafariNonStandalone(nav.userAgent, nav.standalone) &&
        !isInstallDismissed(userId),
    );

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setCanInstall(!isInstallDismissed(userId));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [userId]);

  async function promptInstall(): Promise<void> {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setCanInstall(false);
    if (outcome === "dismissed") dismissInstall(userId);
  }

  function dismiss(): void {
    dismissInstall(userId);
    setCanInstall(false);
    setShowIosHint(false);
  }

  return { canInstall, showIosHint, promptInstall, dismiss };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/use-install-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/use-install-prompt.ts tests/lib/use-install-prompt.test.ts
git commit -m "feat(pwa): install-prompt helpers + useInstallPrompt hook"
```

---

### Task 5: `/offline` static page + `public/sw.js` + version-agreement gate

**Files:**
- Create: `src/app/offline/page.tsx` (static route — top-level, NOT under `(player)`)
- Create: `public/sw.js` (plain JS worker)
- Create: `tests/app/offline-page.test.tsx`
- Create: `tests/lib/sw/version-agreement.test.ts`
- Modify: `eslint.config.mjs` (add a service-worker-globals override for `public/sw.js`)

**Interfaces:**
- Consumes: `SW_VERSION` from `src/lib/sw/strategies.ts` (the version-agreement test imports it).
- Produces: a precacheable `/offline` HTML document; a registered-at-`/sw.js` worker whose behaviour the registration component (Task 6) drives.

**Why `/offline` is static:** it lives at `src/app/offline/page.tsx` (top level), so it renders through the root layout only — no `auth()`, no `cookies()`/`headers()`, no `searchParams`, no `export const dynamic`. Next 16 prerenders it to static HTML at build time (the root layout's client providers hydrate on the client but do not opt the page out of static generation). The SW precaches this prerendered HTML on install so `caches.match("/offline")` always resolves. It works with zero JS: it is a server component, dark theme is applied by the existing `themeInitScript` before hydration, and Retry is a plain `<a href="/">`.

**SW correctness requirements (encode exactly — these are the failure modes to avoid):**
- **Guard non-GET first.** The `fetch` handler classifies via the inlined `classify()`; `bypass` means *return without calling `event.respondWith`* so the browser does its own default fetch (server-action POSTs are never intercepted).
- **Never `respondWith(undefined)`.** Every intercepted branch must resolve to a real `Response`. The SWR path in particular: when the asset is uncached AND the network fetch rejects, fall back to `new Response(null, { status: 504 })` — do not let `cached || network` resolve to `undefined`.
- **Only cache successful responses.** In the navigation and cache-first paths, gate `cache.put(...)` on `response.ok` so a 500/404 is never cached and re-served offline.
- **Navigation fallback chain:** network → (on failure) cached page → `/offline` → a plain 503 `Response` as a last resort.
- **`install`:** open the pages cache, `cache.add("/offline")`, then `self.skipWaiting()`.
- **`activate`:** delete every `playforge-v*` cache that is not the current pages/assets cache, then **re-add `/offline` into the current pages cache** (guarded so an offline activate cannot reject `waitUntil`), then `self.clients.claim()`. (The spec Risks note requires `/offline` be "precached on install and re-fetched on activate"; the guarded re-add satisfies it and self-heals a version bump.)
- Reference the worker-specific globals through `self.` (`self.skipWaiting()`, `self.clients`, `self.location`) so only browser globals (`self`, `caches`, `fetch`, `Response`, `URL`) appear bare.

- [ ] **Step 1: Write the `/offline` page render test (failing)**

```tsx
// tests/app/offline-page.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflinePage from "@/app/offline/page";

describe("/offline page", () => {
  it("explains what still works and offers a retry link", () => {
    render(<OfflinePage />);
    expect(screen.getByText(/recently viewed plays are available/i)).toBeInTheDocument();
    const retry = screen.getByRole("link", { name: /retry/i });
    expect(retry).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/app/offline-page.test.tsx`
Expected: FAIL — `Cannot find module '@/app/offline/page'`.

- [ ] **Step 3: Write the `/offline` page**

```tsx
// src/app/offline/page.tsx
import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline — PlayForge",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <WifiOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Recently viewed plays are available. Quizzes need a connection — reconnect
        to pick up where you left off.
      </p>
      <a
        href="/"
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Retry
      </a>
    </main>
  );
}
```

- [ ] **Step 4: Run the page test to verify it passes**

Run: `npm run test:run -- tests/app/offline-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write `public/sw.js`**

```js
// public/sw.js
// Hand-rolled service worker. Routing logic MIRRORS src/lib/sw/strategies.ts
// (kept in sync by hand; the SW_VERSION literal below MUST equal the one there —
// enforced by tests/lib/sw/version-agreement.test.ts). Plain JS, no imports.

const SW_VERSION = 1;
const PAGES_CACHE = `playforge-v${SW_VERSION}-pages`;
const ASSETS_CACHE = `playforge-v${SW_VERSION}-assets`;
const OFFLINE_URL = "/offline";
const MAX_ASSET_ENTRIES = 60;

function classify(request) {
  if (request.method !== "GET") return "bypass";
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }
  if (url.origin !== self.location.origin) return "bypass";
  if (url.pathname.startsWith("/api/")) return "bypass";
  if (request.mode === "navigate") return "navigation-network-first";
  if (url.pathname.startsWith("/_next/static/")) return "static-cache-first";
  if (request.destination === "image" || request.destination === "font") return "swr-assets";
  return "bypass";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (n) =>
                /^playforge-v\d+-(pages|assets)$/.test(n) &&
                n !== PAGES_CACHE &&
                n !== ASSETS_CACHE,
            )
            .map((n) => caches.delete(n)),
        ),
      )
      // Re-add /offline into the current pages cache; never let this reject activate.
      .then(() => caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL)))
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = classify(event.request);
  if (strategy === "bypass") return; // default browser fetch
  if (strategy === "navigation-network-first") {
    event.respondWith(handleNavigation(event.request));
  } else if (strategy === "static-cache-first") {
    event.respondWith(cacheFirst(event.request, ASSETS_CACHE));
  } else if (strategy === "swr-assets") {
    event.respondWith(staleWhileRevalidate(event.request, ASSETS_CACHE));
  }
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).then(() => trimCache(cache, MAX_ASSET_ENTRIES));
      }
      return response;
    })
    .catch(() => cached);
  return cached || (await network) || new Response(null, { status: 504 });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}
```

- [ ] **Step 6: Add the eslint worker-globals override**

In `eslint.config.mjs`, insert a config object into the array (after `...nextTs`, before `globalIgnores(...)`) so `no-undef` does not fire on the worker's globals:

```js
// eslint.config.mjs — add inside the defineConfig array
{
  files: ["public/sw.js"],
  languageOptions: {
    globals: {
      self: "readonly",
      caches: "readonly",
      fetch: "readonly",
      Response: "readonly",
      URL: "readonly",
    },
  },
},
```

- [ ] **Step 7: Write the version-agreement gate test (failing until Step 5 exists; confirms drift protection)**

```ts
// tests/lib/sw/version-agreement.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { SW_VERSION } from "@/lib/sw/strategies";

function parseSwVersion(source: string): number {
  const match = source.match(/SW_VERSION\s*=\s*(\d+)/);
  if (!match) throw new Error("SW_VERSION literal not found in public/sw.js");
  return Number(match[1]);
}

describe("service worker version agreement", () => {
  it("public/sw.js encodes the same SW_VERSION as strategies.ts", () => {
    const swSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(parseSwVersion(swSource)).toBe(SW_VERSION);
  });
});
```

- [ ] **Step 8: Run both new SW/page tests to verify they pass**

Run: `npm run test:run -- tests/lib/sw/version-agreement.test.ts tests/app/offline-page.test.tsx`
Expected: PASS (version literal `1` matches `SW_VERSION`; page renders).

- [ ] **Step 9: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` (0 errors — the worker override keeps `sw.js` clean) · `npm run build`. In the build output, confirm `/offline` is listed as a static route (`○`).

- [ ] **Step 10: Commit**

```bash
git add src/app/offline/page.tsx public/sw.js eslint.config.mjs tests/app/offline-page.test.tsx tests/lib/sw/version-agreement.test.ts
git commit -m "feat(pwa): hand-rolled service worker, /offline page, version-agreement gate"
```

---

### Task 6: Toast action extension + SW registration + update prompt

> **DEVIATION NOTE (read before starting):** The spec says the update flow reuses "the existing toast." The existing `useToast()` API (`src/components/ui/toast.tsx`) is **message-only** (`info(message: string)`) with a fixed 3000ms auto-dismiss and no action affordance. Honoring "toast with a reload action" therefore requires a minimal, backward-compatible extension: an optional `action?: { label, onClick }` argument. Every existing call site (`toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`) is unchanged because the argument is optional. When an action is present the toast does NOT auto-dismiss (the user needs time to click Reload). This is a deliberate, minimal extension of the existing component — not a new toast system.

**Files:**
- Modify: `src/components/ui/toast.tsx` (add optional action; suppress auto-dismiss when present; render action button)
- Create: `src/components/pwa/sw-register.tsx`
- Modify: `src/app/layout.tsx` (mount `<SwRegister />` inside `ToastProvider`; add `mobile-web-app-capable` meta)
- Test: `tests/components/ui/toast-action.test.tsx`

**Interfaces:**
- Consumes: nothing new (registration reads `navigator.serviceWorker`).
- Produces:
  - Extended `ToastAPI`: `success/error/info: (message: string, action?: ToastAction) => void` where `interface ToastAction { label: string; onClick: () => void }`.
  - `function SwRegister(): null` — a client component that registers `/sw.js` in production and shows the reload toast on a real update.

**Design notes (encode exactly):**
- Registration is production-only (`process.env.NODE_ENV === "production"`) and feature-detected (`"serviceWorker" in navigator`). Failures → `console.warn` only.
- **First-install guard:** capture `hadController = !!navigator.serviceWorker.controller` when the effect runs. A `controllerchange` with `hadController === false` is the first SW claiming clients (a fresh install, not an update) — skip the toast. Only when `hadController === true` (a new version claimed over an existing one) show the reload toast.
- The reload toast uses the extended API: `toast.info("PlayForge updated — reload for the latest version", { label: "Reload", onClick: () => window.location.reload() })`, guarded so a double-click reloads once.
- `SwRegister` must live inside `ToastProvider` (it calls `useToast()`); mount it as a sibling of `{children}` inside the provider.

- [ ] **Step 1: Write the failing toast-action test**

```tsx
// tests/components/ui/toast-action.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger({ onAction }: { onAction: () => void }) {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.info("Updated", { label: "Reload", onClick: onAction })}>
        action-toast
      </button>
      <button onClick={() => toast.info("Plain")}>plain-toast</button>
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("toast with action", () => {
  it("renders the action button and fires its onClick", () => {
    const onAction = vi.fn();
    render(<ToastProvider><Trigger onAction={onAction} /></ToastProvider>);
    act(() => { fireEvent.click(screen.getByText("action-toast")); });

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not auto-dismiss an action toast after 3s, but a plain toast does", () => {
    render(<ToastProvider><Trigger onAction={() => {}} /></ToastProvider>);
    act(() => { fireEvent.click(screen.getByText("action-toast")); });
    act(() => { fireEvent.click(screen.getByText("plain-toast")); });

    act(() => { vi.advanceTimersByTime(3100); });

    expect(screen.getByText("Updated")).toBeInTheDocument();     // action toast survives
    expect(screen.queryByText("Plain")).not.toBeInTheDocument(); // plain toast gone
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/components/ui/toast-action.test.tsx`
Expected: FAIL (no Reload button; action toast auto-dismisses).

- [ ] **Step 3: Extend `src/components/ui/toast.tsx`**

Apply these edits:

1. Add the action type and put it on `Toast`:
```ts
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}
```
2. Widen the API signatures:
```ts
interface ToastAPI {
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
  dismiss: (id: string) => void;
}
```
3. Thread the action through `addToast` and suppress auto-dismiss when present:
```ts
const addToast = useCallback(
  (message: string, variant: ToastVariant, action?: ToastAction) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    if (!action) setTimeout(() => dismiss(id), 3000);
  },
  [dismiss],
);

const api: ToastAPI = {
  success: (msg, action) => addToast(msg, "success", action),
  error: (msg, action) => addToast(msg, "error", action),
  info: (msg, action) => addToast(msg, "info", action),
  dismiss,
};
```
4. Render the action button before the dismiss `X` (inside the `motion.div`, after the message `<span>`):
```tsx
{toast.action && (
  <button
    onClick={() => { toast.action?.onClick(); dismiss(toast.id); }}
    className="ml-1 shrink-0 rounded-md border border-current px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80"
  >
    {toast.action.label}
  </button>
)}
```

- [ ] **Step 4: Run the toast test to verify it passes**

Run: `npm run test:run -- tests/components/ui/toast-action.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create `src/components/pwa/sw-register.tsx`**

```tsx
// src/components/pwa/sw-register.tsx
"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export function SwRegister() {
  const toast = useToast();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });

    const onControllerChange = () => {
      if (!hadController) return; // first install claiming clients — not an update
      toast.info("PlayForge updated — reload for the latest version", {
        label: "Reload",
        onClick: () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        },
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, [toast]);

  return null;
}
```

- [ ] **Step 6: Mount it + add the meta fix in `src/app/layout.tsx`**

1. Import at the top: `import { SwRegister } from "@/components/pwa/sw-register";`
2. Add the meta key alongside the existing apple one:
```ts
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
```
3. Mount inside `ToastProvider`:
```tsx
<ThemeProvider>
  <ToastProvider>
    <SwRegister />
    {children}
  </ToastProvider>
</ThemeProvider>
```

- [ ] **Step 7: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/toast.tsx src/components/pwa/sw-register.tsx src/app/layout.tsx tests/components/ui/toast-action.test.tsx
git commit -m "feat(pwa): toast action affordance + production SW registration with update prompt"
```

---

### Task 7: Offline pill + quiz gating

**Files:**
- Create: `src/components/pwa/offline-pill.tsx`
- Create: `src/components/quiz/quiz-offline-banner.tsx`
- Create: `src/components/quiz/offline-quiz-gate.tsx`
- Modify: `src/app/(player)/layout.tsx` (mount the pill in the header)
- Modify: `src/app/(player)/quiz/page.tsx` (wrap the card grid in the gate)
- Modify: `src/components/quiz/quiz-flow.tsx` (banner + disable answering/submit when offline)
- Modify: `src/components/quiz/multiple-choice.tsx` (accept `disabled`)
- Test: `tests/components/quiz/offline-gating.test.tsx`

**Interfaces:**
- Consumes: `useOnline` (Task 2).
- Produces:
  - `function OfflinePill(): JSX.Element | null` — `role="status"` pill, renders only while offline.
  - `function QuizOfflineBanner(): JSX.Element` — presentational banner ("Quizzes need a connection — your plays are still available").
  - `function OfflineQuizGate({ children }): JSX.Element` — shows the banner and disables interaction with `children` while offline.
  - `MultipleChoice` gains optional prop `disabled?: boolean`.

**Design notes:**
- The pill lives in the sticky player header (`(player)/layout.tsx`), a server component; `OfflinePill` is a client island placed in the right-hand controls group, before `<NotificationBell />`.
- `OfflineQuizGate` is a client wrapper receiving the server-rendered `QuizCard` grid as `children`; when offline it renders the banner and wraps children in `pointer-events-none opacity-60` so the card links cannot be started. The banner markup is shared with `QuizFlow` via `QuizOfflineBanner`.
- In `QuizFlow`, offline disables answering (pass `disabled` to `MultipleChoice`) and disables the Next/Finish button; `submitQuizAttempt` rejection still surfaces via the existing `submitError` banner (unchanged).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/quiz/offline-gating.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineQuizGate } from "@/components/quiz/offline-quiz-gate";
import { MultipleChoice } from "@/components/quiz/multiple-choice";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}
afterEach(() => setOnLine(true));

describe("OfflineQuizGate", () => {
  it("shows the offline banner while offline", () => {
    setOnLine(false);
    render(<OfflineQuizGate><a href="/quiz/1">Quiz 1</a></OfflineQuizGate>);
    expect(screen.getByText(/quizzes need a connection/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quiz 1" })).toBeInTheDocument();
  });

  it("hides the banner while online", () => {
    setOnLine(true);
    render(<OfflineQuizGate><a href="/quiz/1">Quiz 1</a></OfflineQuizGate>);
    expect(screen.queryByText(/quizzes need a connection/i)).not.toBeInTheDocument();
  });
});

describe("MultipleChoice disabled", () => {
  it("disables every option button when disabled", () => {
    render(
      <MultipleChoice
        questionId="q1"
        questionText="Pick one"
        options={[{ text: "A" }, { text: "B" }]}
        onAnswer={() => {}}
        disabled
      />,
    );
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toBeDisabled();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/components/quiz/offline-gating.test.tsx`
Expected: FAIL — modules not found / `disabled` not accepted.

- [ ] **Step 3: Create the pill**

```tsx
// src/components/pwa/offline-pill.tsx
"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/use-online";

export function OfflinePill() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
    >
      <WifiOff className="h-3 w-3" />
      Offline
    </span>
  );
}
```

- [ ] **Step 4: Create the banner + gate**

```tsx
// src/components/quiz/quiz-offline-banner.tsx
export function QuizOfflineBanner() {
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      Quizzes need a connection — your plays are still available.
    </div>
  );
}
```

```tsx
// src/components/quiz/offline-quiz-gate.tsx
"use client";

import type { ReactNode } from "react";
import { useOnline } from "@/lib/use-online";
import { QuizOfflineBanner } from "./quiz-offline-banner";

export function OfflineQuizGate({ children }: { children: ReactNode }) {
  const online = useOnline();
  return (
    <>
      {!online && <QuizOfflineBanner />}
      <div
        className={online ? undefined : "pointer-events-none opacity-60"}
        aria-disabled={online ? undefined : true}
      >
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 5: Add `disabled` to `MultipleChoice`**

Edit `src/components/quiz/multiple-choice.tsx`:
1. Extend the props:
```ts
interface MultipleChoiceProps {
  questionId: string;
  questionText: string;
  options: { text: string }[];
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}
```
2. Destructure `disabled` and fold it into `locked`, and early-return in the handler:
```ts
export function MultipleChoice({
  questionId,
  questionText,
  options,
  onAnswer,
  disabled = false,
}: MultipleChoiceProps) {
  // ...existing state...
  async function handleSelect(index: number) {
    if (disabled || checking || result !== null) return;
    // ...unchanged body...
  }

  const locked = disabled || checking || result !== null;
  // ...unchanged render; buttons already use disabled={locked}...
}
```

- [ ] **Step 6: Gate `QuizFlow`**

Edit `src/components/quiz/quiz-flow.tsx`:
1. Add imports:
```ts
import { useOnline } from "@/lib/use-online";
import { QuizOfflineBanner } from "./quiz-offline-banner";
```
2. Inside the component, read connectivity: `const online = useOnline();`
3. Render the banner at the top of the main return (just inside the outer `<div className="space-y-6">`):
```tsx
{!online && <QuizOfflineBanner />}
```
4. Disable answering: pass `disabled={!online}` to `<MultipleChoice ... />`.
5. Disable the Next/Finish button while offline:
```tsx
<Button onClick={handleNext} disabled={submitting || !online}>
```

- [ ] **Step 7: Mount the pill in the player header**

Edit `src/app/(player)/layout.tsx`:
1. Import: `import { OfflinePill } from "@/components/pwa/offline-pill";`
2. In the header's right-hand controls group, add `<OfflinePill />` as the first child before `<NotificationBell ... />`:
```tsx
<div className="flex items-center gap-2">
  <OfflinePill />
  <NotificationBell userId={session.user.id} incoming={notifications} />
  <ThemeToggle />
  <UserMenu user={session.user} />
</div>
```

- [ ] **Step 8: Wrap the quiz list grid in the gate**

Edit `src/app/(player)/quiz/page.tsx`:
1. Import: `import { OfflineQuizGate } from "@/components/quiz/offline-quiz-gate";`
2. Wrap the `quizzes.length === 0 ? ... : (<div className="grid ...">...)` card grid so the populated branch is inside the gate:
```tsx
<OfflineQuizGate>
  <div className="grid grid-cols-1 gap-3">
    {quizzes.map((quiz) => (
      <QuizCard key={quiz.id} id={quiz.id} name={quiz.name}
        questionCount={quiz._count.questions} dueDate={quiz.dueDate}
        gamePlanName={quiz.gamePlan?.name} href={`/quiz/${quiz.id}`} />
    ))}
  </div>
</OfflineQuizGate>
```
(Leave the empty-state branch outside the gate.)

- [ ] **Step 9: Run the gating test to verify it passes**

Run: `npm run test:run -- tests/components/quiz/offline-gating.test.tsx`
Expected: PASS.

- [ ] **Step 10: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 11: Commit**

```bash
git add src/components/pwa/offline-pill.tsx src/components/quiz/quiz-offline-banner.tsx src/components/quiz/offline-quiz-gate.tsx src/components/quiz/multiple-choice.tsx src/components/quiz/quiz-flow.tsx "src/app/(player)/layout.tsx" "src/app/(player)/quiz/page.tsx" tests/components/quiz/offline-gating.test.tsx
git commit -m "feat(pwa): offline pill + quiz gating (banner + disabled start/submit)"
```

---

### Task 8: Install affordance on the player home

**Files:**
- Create: `src/components/pwa/install-card.tsx`
- Modify: `src/app/(player)/home/page.tsx` (mount the card)
- Test: `tests/components/pwa/install-card.test.tsx`

**Interfaces:**
- Consumes: `useInstallPrompt(userId)` (Task 4).
- Produces: `function InstallCard({ userId }: { userId: string }): JSX.Element | null` — renders the install button (Chromium `canInstall`), the iOS hint (`showIosHint`), or nothing.

**Design notes:**
- `userId` reaches the card the same way the notification bell gets it: the server `home/page.tsx` passes `session.user.id` to the client component.
- The card returns `null` when there is nothing to offer, so it is safe to drop directly inside `PlayerStagger` without leaving an empty animated slot.
- Both branches expose a dismiss control (persists via `useInstallPrompt.dismiss()` → `playforge-install-dismissed:<userId>`).

- [ ] **Step 1: Write the failing test (iOS hint + null branches)**

```tsx
// tests/components/pwa/install-card.test.tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstallCard } from "@/components/pwa/install-card";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120";

function setUA(ua: string) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: ua });
}
function setStandalone(value: boolean | undefined) {
  Object.defineProperty(navigator, "standalone", { configurable: true, value });
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  setUA(DESKTOP_UA);
  setStandalone(undefined);
});

describe("InstallCard", () => {
  it("shows the iOS Add-to-Home-Screen hint on non-standalone iOS", () => {
    setUA(IOS_UA);
    setStandalone(false);
    render(<InstallCard userId="u1" />);
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });

  it("dismisses the iOS hint when Dismiss is clicked", () => {
    setUA(IOS_UA);
    setStandalone(false);
    render(<InstallCard userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument();
  });

  it("renders nothing on desktop with no install prompt available", () => {
    setUA(DESKTOP_UA);
    setStandalone(undefined);
    const { container } = render(<InstallCard userId="u1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/components/pwa/install-card.test.tsx`
Expected: FAIL — `Cannot find module '@/components/pwa/install-card'`.

- [ ] **Step 3: Create the card**

```tsx
// src/components/pwa/install-card.tsx
"use client";

import { Download, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallPrompt } from "@/lib/use-install-prompt";

export function InstallCard({ userId }: { userId: string }) {
  const { canInstall, showIosHint, promptInstall, dismiss } = useInstallPrompt(userId);
  if (!canInstall && !showIosHint) return null;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/30">
          {canInstall ? (
            <Download className="h-5 w-5 text-primary-emphasis" />
          ) : (
            <Share className="h-5 w-5 text-primary-emphasis" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install PlayForge</p>
          {canInstall ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add PlayForge to your home screen for quick, full-screen access.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={promptInstall}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Install PlayForge
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap Share, then &ldquo;Add to Home Screen&rdquo; to install.
              </p>
              <div className="mt-2">
                <button
                  onClick={dismiss}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tests/components/pwa/install-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount on the player home**

Edit `src/app/(player)/home/page.tsx`:
1. Import: `import { InstallCard } from "@/components/pwa/install-card";`
2. Inside `<PlayerStagger>`, immediately after the greeting `</PlayerCard>` (before the `{!hasContent ? ...}` block), add:
```tsx
<InstallCard userId={session.user.id} />
```

- [ ] **Step 6: Run the full quartet**

Run: `npm run test:run` · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/pwa/install-card.tsx "src/app/(player)/home/page.tsx" tests/components/pwa/install-card.test.tsx
git commit -m "feat(pwa): install affordance on player home (Chromium button + iOS hint)"
```

---

### Task 9: Touch snapping toggle (3c backlog)

**Files:**
- Modify: `src/components/play/play-toolbar.tsx` (add the magnet toggle + two props)
- Modify: `src/app/(coach)/designer/designer-client.tsx` (own `snapEnabled` state, persist, thread it)
- Modify: `src/engine/play-canvas.tsx` (accept `snapEnabled`, OR it into the Alt bypass)
- Test: `tests/components/play/play-toolbar-snap.test.tsx`

**Interfaces:**
- Consumes: `loadSnapPreference` / `saveSnapPreference` (Task 3); `computeSnap` (existing, unchanged).
- Produces:
  - `PlayToolbar` gains required props `snapEnabled: boolean` and `onToggleSnap: () => void`.
  - `PlayCanvas` gains optional prop `snapEnabled?: boolean` (default `true`).

**Design notes (encode exactly):**
- The magnet button is an independent toggle (not part of the Select/Draw/Motion/Preview radio group). It uses `aria-pressed={snapEnabled}`, the tooltip "Snap to align (Alt to bypass)", and the active styling convention (`bg-primary text-primary-foreground` when on).
- In `PlayCanvas.makeDragBoundFunc`, the existing call passes `altHeld: altHeldRef.current`. Change it to `altHeld: altHeldRef.current || !snapEnabled` — this reuses the exact Alt pass-through path (`computeSnap` already returns the proposed position untouched when `altHeld` is true), so OFF = no snapping and Alt still momentarily bypasses when ON. Add `snapEnabled` to that `useCallback`'s dependency array.
- Preference is loaded once on mount into local state (notification-bell load-on-mount idiom), defaulting ON; toggling writes through `saveSnapPreference(userId, next)`.

- [ ] **Step 1: Write the failing toolbar test**

```tsx
// tests/components/play/play-toolbar-snap.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayToolbar } from "@/components/play/play-toolbar";

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    name: "Play", onNameChange: () => {},
    formation: "", playType: "pass", onPlayTypeChange: () => {},
    drawingRoute: false, onToggleDrawing: () => {},
    motionMode: false, onToggleMotion: () => {},
    previewMode: false, onTogglePreview: () => {},
    hasFormation: true,
    onUndo: () => {}, onRedo: () => {}, canUndo: false, canRedo: false,
    onSave: () => {}, saving: false, dirty: false,
    coverageOverlay: "", onCoverageChange: () => {},
    onMirror: () => {}, onExport: () => {},
    snapEnabled: true, onToggleSnap: vi.fn(),
    ...overrides,
  };
}

describe("PlayToolbar snap toggle", () => {
  it("reflects the pressed state and fires onToggleSnap on click", () => {
    const onToggleSnap = vi.fn();
    const { rerender } = render(<PlayToolbar {...baseProps({ onToggleSnap })} />);

    const snap = screen.getByRole("button", { name: /snap/i });
    expect(snap).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(snap);
    expect(onToggleSnap).toHaveBeenCalledTimes(1);

    rerender(<PlayToolbar {...baseProps({ onToggleSnap, snapEnabled: false })} />);
    expect(screen.getByRole("button", { name: /snap/i })).toHaveAttribute("aria-pressed", "false");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:run -- tests/components/play/play-toolbar-snap.test.tsx`
Expected: FAIL — `snapEnabled`/`onToggleSnap` are not props; no snap button.

- [ ] **Step 3: Add the toggle to `PlayToolbar`**

Edit `src/components/play/play-toolbar.tsx`:
1. Add `Magnet` to the `lucide-react` import.
2. Add to `PlayToolbarProps` (in the mode-state group):
```ts
  snapEnabled: boolean;
  onToggleSnap: () => void;
```
3. Destructure `snapEnabled, onToggleSnap` in the component parameters.
4. Render the toggle after the Undo/Redo group (before the `flex-1` spacer):
```tsx
<div className="h-4 w-px shrink-0 bg-border" />
<button
  type="button"
  onClick={onToggleSnap}
  aria-pressed={snapEnabled}
  title="Snap to align (Alt to bypass)"
  className={cn(
    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
    snapEnabled
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  )}
>
  <Magnet className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Snap</span>
</button>
```

- [ ] **Step 4: Run the toolbar test to verify it passes**

Run: `npm run test:run -- tests/components/play/play-toolbar-snap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Thread `snapEnabled` through the designer**

Edit `src/app/(coach)/designer/designer-client.tsx`:
1. Import the helpers:
```ts
import { loadSnapPreference, saveSnapPreference } from "@/lib/snap-preference";
```
2. Add state near the other designer state (e.g. beside `coverageOverlay`):
```ts
const [snapEnabled, setSnapEnabled] = useState(true);
useEffect(() => {
  setSnapEnabled(loadSnapPreference(userId));
}, [userId]);
const toggleSnap = useCallback(() => {
  setSnapEnabled((prev) => {
    const next = !prev;
    saveSnapPreference(userId, next);
    return next;
  });
}, [userId]);
```
3. Pass to `<PlayToolbar ... />`: add `snapEnabled={snapEnabled}` and `onToggleSnap={toggleSnap}`.
4. Pass to `<PlayCanvas ... />`: add `snapEnabled={snapEnabled}`.

- [ ] **Step 6: Honor `snapEnabled` in `PlayCanvas`**

Edit `src/engine/play-canvas.tsx`:
1. Add `snapEnabled?: boolean;` to `PlayCanvasProps` (document: default ON).
2. Destructure it with a default in the component signature: `snapEnabled = true,`.
3. In `makeDragBoundFunc`, change the `computeSnap` options from `altHeld: altHeldRef.current` to:
```ts
altHeld: altHeldRef.current || !snapEnabled,
```
4. Add `snapEnabled` to that `useCallback`'s dependency array.

- [ ] **Step 7: Run the full quartet**

Run: `npm run test:run` (snap persistence tests from Task 3 + the toolbar test all green) · `npx tsc --noEmit` · `npm run lint` · `npm run build` — all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/play/play-toolbar.tsx "src/app/(coach)/designer/designer-client.tsx" src/engine/play-canvas.tsx tests/components/play/play-toolbar-snap.test.tsx
git commit -m "feat(designer): snap-to-align toggle (magnet) threaded through PlayCanvas"
```

---

### Task 10: Close-out — gate sweep + production-build QA

**Files:** none (verification only). This task ships no code; it gates the branch.

**Interfaces:** consumes everything above.

**Design notes:**
- The "Phase 3c gate set" is the standing verification quartet — there is no separate gate script in `package.json`; the gates ARE `test:run` + `tsc --noEmit` + `lint` + `build`, plus the SW version-agreement test added in Task 5. Run them clean on the full branch.
- SW registration is **production-only**, so the offline QA MUST run against a production server: `npm run build && npm run start` (not `npm run dev`, which is deliberately SW-free). Use Playwright with `context.setOffline(true)` to make offline genuinely testable, and **unregister the service worker between scenarios** so a stale worker never poisons the next check.

- [ ] **Step 1: Full gate sweep (whole branch)**

```bash
npm run test:run    # every test passes; total >= 248 + all tests added in Tasks 1–9
npx tsc --noEmit    # zero type errors
npm run lint        # 0 errors, no eslint-disable added anywhere
npm run build       # succeeds; confirm /offline is listed as a static route (○)
```
Confirm the version-agreement test (`tests/lib/sw/version-agreement.test.ts`) is green within the suite.

- [ ] **Step 2: Start the production server**

```bash
npm run build && npm run start
```
Open the player app in a Chromium context (Playwright). Confirm `/sw.js` registers (Application → Service Workers shows an activated worker) and no console warning about `apple-mobile-web-app-capable` deprecation (the `mobile-web-app-capable` meta from Task 6 clears it).

- [ ] **Step 3: Offline review walk (Playwright, `context.setOffline`)**

1. **Warm the cache online:** visit `/home`, open a play under `/plays/<id>`, view `/progress`.
2. `await context.setOffline(true)`.
3. **Revisit cached routes** (`/home`, the same `/plays/<id>`): they render from cache (network-first fell back to cache), NOT the browser error page.
4. **Visit an un-warmed route** while offline: the `/offline` page renders (navigation fallback → `/offline`), showing "Recently viewed plays are available" and a Retry link.
5. **Offline pill:** the header shows the `role="status"` Offline pill while offline.
6. **Quiz gating:** on `/quiz`, the banner "Quizzes need a connection — your plays are still available" appears and quiz cards are non-interactive (`pointer-events-none`); inside a `/quiz/<id>` flow (opened while online, then offline) the banner shows and answering/Finish are disabled.
7. `await context.setOffline(false)`: the pill disappears, the banner clears, quizzes are interactive again (online recovery).

- [ ] **Step 4: SW update flow**

1. With the app open (controller active), bump `SW_VERSION` from `1` to `2` in **both** `src/lib/sw/strategies.ts` and `public/sw.js`, rebuild, and reload once so the new worker installs.
2. On the next load the new worker `skipWaiting()`s and claims clients → the update toast "PlayForge updated — reload for the latest version" appears with a **Reload** action that does not auto-dismiss; clicking Reload reloads the page.
3. In Application → Cache Storage, confirm the old `playforge-v1-*` caches were deleted on activate and only `playforge-v2-*` remain.
4. **Revert `SW_VERSION` back to `1`** in both files (the bump was a QA probe, not a shipped change) and confirm `tests/lib/sw/version-agreement.test.ts` is green.

- [ ] **Step 5: Install affordance + snap toggle**

1. **Chromium install:** trigger `beforeinstallprompt` (DevTools ▸ Application ▸ Manifest ▸ install, or an installable context) → the home `InstallCard` shows "Install PlayForge"; "Not now" dismisses it and it stays dismissed on reload (`playforge-install-dismissed:<userId>`).
2. **iOS hint:** in an iOS Safari (or spoofed non-standalone iOS) context, the card shows the "Share → Add to Home Screen" hint.
3. **Snap toggle:** in the designer, the magnet toggle reflects `aria-pressed`; with snapping OFF, a touch-style drag (no Alt key) moves a player with no snap guides; with snapping ON, holding Alt during the drag momentarily bypasses; the choice persists across reload (`playforge-snap:<userId>`).

- [ ] **Step 6: Standard regression sweep + between-scenario hygiene**

Between offline scenarios, unregister the worker (`navigator.serviceWorker.getRegistrations()` → `unregister()`) and clear caches so no stale state carries over. Run the standard smoke of the coach designer (save/undo/redo/preview) and player review to confirm no regressions from the shared-component edits (toast, multiple-choice, quiz-flow, layout, play-canvas).

- [ ] **Step 7: Finish the branch**

With all gates green and the QA walk clean, the `phase-3d-mobile` branch (final phase of the 3-phase program) is ready to integrate. Use `superpowers:finishing-a-development-branch` to choose merge/PR.

## Self-Review (completed by plan author)

- **Spec coverage:** §1 service worker → Tasks 1 (strategies), 5 (sw.js + caches + update-enabling skipWaiting/claim), 6 (registration + update toast). §2 offline page + connectivity → Tasks 5 (/offline), 2 (useOnline), 7 (quiz gating + pill). §3 install → Tasks 4 (hook/helpers), 8 (UI), 6 (`mobile-web-app-capable` meta). §4 snap toggle → Tasks 3 (persistence), 9 (toggle + threading). Verification → Task 10 (gates + Playwright QA). The Risks note "precached on install AND re-fetched on activate" → Task 5 activate re-add. Every §1–§4 requirement maps to a task.
- **Placeholder scan:** no TBD/TODO/"handle edge cases"/"similar to Task N"; every code step carries complete code.
- **Type consistency:** `SW_VERSION` (number) and `classifyRequest`/cache-name helpers used identically in Tasks 1/5; `useOnline(): boolean` consumed in Task 7; `useInstallPrompt(userId): InstallPromptState` consumed in Task 8; `loadSnapPreference/saveSnapPreference` consumed in Task 9; `ToastAction` shape identical in Tasks 6’s API and `SwRegister`. No name drift found.

