# PlayForge Phase 3d — Offline Player PWA (Design Spec)

**Date:** 2026-07-07
**Status:** Approved scope ("Offline player PWA", user-selected)
**Phase:** 3d of Phase 3 — the FINAL phase of the improvement program (3a ✅ → 3b ✅ → 3c ✅ → 3d)
**Branch:** `phase-3d-mobile`, stacked on `phase-3c-designer`

## Context

The PWA base exists (standalone manifest, icons, theme color, safe-area bottom nav, `viewportFit: cover`) but there is no service worker — an athlete opening PlayForge without signal gets a browser error page. The 3b grading redesign draws a hard boundary: quizzes CANNOT work offline (the answer key never reaches the device, by design), so 3d's offline story is *reviewing*: recently viewed plays, the playbook, and progress keep working; quizzes degrade gracefully.

## 1. Service worker (hand-rolled — no new dependencies)

- **`public/sw.js`**, plain JS, no build-step integration (Turbopack-safe; Serwist/next-pwa rejected for build-pipeline friction and dependency cost).
- **Strategy module first:** the routing/strategy decisions live in a pure, unit-testable module `src/lib/sw/strategies.ts` (classify a request → strategy name; compute cache keys; version parsing). `sw.js` imports nothing — it inlines the same logic in plain JS with the pure module serving as the tested reference (a comment in each file points at the other; the close-out gate greps that both encode the same version constant).
- **Strategies:**
  - Navigations (`request.mode === "navigate"`): network-first → cache fallback → `/offline` fallback page. Successful navigations are cached (so recently visited pages work offline).
  - `/_next/static/**` (immutable, content-hashed): cache-first.
  - Images/fonts (same-origin): stale-while-revalidate, capped LRU-ish by a max-entries sweep.
  - NEVER cached: `/api/**`, server actions (POST), auth routes — network-only, no interception beyond pass-through.
- **Versioned caches** (`playforge-v<N>-{pages,assets}`): activate deletes caches from other versions. Bumping N is the manual invalidation lever.
- **Update flow:** new SW calls `skipWaiting()` on install and claims clients; the registration component listens for `controllerchange` and shows the existing toast ("PlayForge updated — reload for the latest version") with a reload action. No silent mid-session swaps of live pages.
- **Registration:** small client component (`src/components/pwa/sw-register.tsx`) mounted in the root layout — registers `/sw.js` in production only (`process.env.NODE_ENV === "production"`; dev stays SW-free so HMR/QA aren't poisoned by caches). Registration failures are silently tolerated (console.warn only).

## 2. Offline page + connectivity states

- **New `/offline` route:** a static, precached page (token-styled, works with zero JS) saying what still works ("Recently viewed plays are available") with a Retry button.
- **`useOnline()` hook** (`src/lib/use-online.ts`): `navigator.onLine` via `useSyncExternalStore` (online/offline events as the subscription — the established lint-safe idiom).
- **Quiz gating:** the player quiz list and quiz flow show an offline banner ("Quizzes need a connection — your plays are still available") and disable starting/submitting attempts while offline. `submitQuizAttempt` failures keep the existing error banner (already handles rejection).
- **Chrome indicator:** a small offline pill in the player header/tabs area while offline (token-styled, `role="status"`).

## 3. Install experience

- **`useInstallPrompt()` hook + install affordance:** capture `beforeinstallprompt` (Chromium), expose an "Install PlayForge" button in the player settings/home area; after `prompt()`, respect the user's choice. Dismissal is remembered (`playforge-install-dismissed:<userId>` — user-scoped per the drafts/bell precedent).
- **iOS**: no `beforeinstallprompt` — when Safari-not-standalone is detected, the same affordance shows a one-line "Share → Add to Home Screen" hint instead. Detection: `navigator.standalone === false` + iOS UA heuristic, kept in one small helper.
- **Meta fix:** add `mobile-web-app-capable: yes` alongside the deprecated `apple-mobile-web-app-capable` (clears the QA-observed console deprecation).

## 4. Touch snapping toggle (3c backlog item)

- Designer toolbar gains a **snap toggle** (magnet icon, pressed state, tooltip "Snap to align (Alt to bypass)") controlling a `snapEnabled` designer preference persisted to `localStorage` (`playforge-snap:<userId>`, default ON). Threaded into PlayCanvas alongside the existing plumbing; when OFF, `dragBoundFunc` passes positions through untouched (same path as Alt). Alt still momentarily bypasses while snapping is ON. This gives touch users (no Alt key) full control.

## Out of scope (final-phase discipline)

Offline quiz queueing/background sync (conflicts with server-grading integrity — permanent design boundary, not a deferral); push notifications; IndexedDB data mirror / offline designer editing; precaching the whole playbook proactively (only visited pages cache); Web Share API; app shortcuts.

## Verification

- Per task: quartet — `npm run test:run` (248 baseline, grows), `npx tsc --noEmit`, `npm run lint` (**stays 0 errors**), `npm run build`.
- Unit tests: strategy classification (every route class), version-constant agreement gate (parse both files, assert equal), useOnline hook (event-driven store), install-prompt dismissal scoping, snap-toggle persistence helpers.
- Close-out QA (Playwright, `context.setOffline(true)` makes offline genuinely testable): visit plays online → go offline → revisit (served from cache) → visit an unvisited route (offline page) → quiz gating banner → back online recovery; SW update flow (bump version, reload prompt appears); install affordance states; snap toggle on touch-style drag; the standard regression sweep. NOTE: SW registration is production-only — the QA walk runs against `npm run build && npm run start`, not the dev server.
- Gates: the Phase 3c set + `sw.js` exempted from DOM-token rules (it renders nothing) but included in the version-agreement gate.

## Risks / notes

- A stale SW can poison QA/dev — production-only registration plus versioned caches plus the update toast are the three mitigations; the QA checklist includes explicitly unregistering between scenarios.
- `/offline` must never itself 404 from the cache — it's precached on install and re-fetched on activate.
- Server actions are POSTs — the SW must not touch non-GET requests at all (guard at the top of the fetch handler).
- iOS Safari caps SW storage aggressively — the offline story is best-effort there; the offline page itself is small enough to survive.
