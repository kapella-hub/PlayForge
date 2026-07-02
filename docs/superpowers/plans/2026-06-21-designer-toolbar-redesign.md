# Designer Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge PlayToolbar + ContextBar into one unified bar that never wraps, with a single mode-selector group (Select | Draw | Motion | Preview) and an overflow popover for less-used features.

**Architecture:** Replace the two stacked floating bars with a single `PlayToolbar` component that absorbs all `ContextBar` props. A `ModeSelector` segment group centralises tool switching. Rarely-used controls (Mirror, Coverage, Game Format, Export, Library, AI, Print, History) move into a `⋯` overflow popover rendered via a `useRef` click-outside pattern. `ContextBar` is deleted.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React, Framer Motion (already installed)

## Global Constraints

- No new npm dependencies — use only what is already installed.
- All keyboard shortcuts must remain working (V, D, M, P, H, Esc, Cmd+Z, Cmd+Shift+Z, Cmd+S, F, R, L, A, Backspace/Delete).
- Tailwind only — no inline styles except where Tailwind cannot express the value.
- The bar must remain a single row on all viewport widths ≥ 640 px; on < 640 px it may show two rows (name + controls).
- Keep existing prop interfaces on `designer/page.tsx` side — only add props to `PlayToolbar`, never remove.

---

### Task 1: Rewrite PlayToolbar as unified single-row bar

**Files:**
- Modify: `src/components/play/play-toolbar.tsx` (full rewrite)

**Interfaces:**
- Produces: `PlayToolbarProps` (superset of old props + ContextBar props — see step 3)
- Consumed by: `src/app/(coach)/designer/page.tsx`

- [ ] **Step 1: Read the current file to understand all imports and prop names**

```bash
# Already done in session — proceed.
```

- [ ] **Step 2: Replace the entire file with the unified toolbar**

Write `src/components/play/play-toolbar.tsx`:

```tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  MousePointer2,
  Pen,
  Undo2,
  Redo2,
  Save,
  Loader2,
  Check,
  Circle,
  BookOpen,
  Printer,
  Sparkles,
  MoveRight,
  Play,
  Square,
  FlipHorizontal,
  Download,
  Shield,
  History,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FORMATS, type GameFormat } from "@/engine/constants";
import { COVERAGE_SCHEMES } from "@/engine/coverage-zone";

interface PlayToolbarProps {
  // ── play metadata ──
  name: string;
  onNameChange: (name: string) => void;
  formation: string;
  playType: string;
  onPlayTypeChange: (type: string) => void;
  // ── mode state ──
  drawingRoute: boolean;
  onToggleDrawing: () => void;
  motionMode: boolean;
  onToggleMotion: () => void;
  previewMode: boolean;
  onTogglePreview: () => void;
  hasFormation: boolean;
  // ── history ──
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // ── save ──
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  // ── overflow actions ──
  coverageOverlay: string;
  onCoverageChange: (value: string) => void;
  onMirror: () => void;
  onExport: () => void;
  onOpenLibrary?: () => void;
  onOpenAI?: () => void;
  onOpenPrint?: () => void;
  gameFormat?: GameFormat;
  onGameFormatChange?: (format: GameFormat) => void;
  showHistory?: boolean;
  versionHistoryOpen?: boolean;
  onToggleHistory?: () => void;
}

const playTypes = [
  { value: "run", label: "Run" },
  { value: "pass", label: "Pass" },
  { value: "play_action", label: "PA" },
  { value: "screen", label: "Screen" },
] as const;

const formatOptions: { value: GameFormat; label: string }[] = (
  Object.keys(GAME_FORMATS) as GameFormat[]
).map((k) => ({ value: k, label: k }));

export function PlayToolbar({
  name,
  onNameChange,
  formation,
  playType,
  onPlayTypeChange,
  drawingRoute,
  onToggleDrawing,
  motionMode,
  onToggleMotion,
  previewMode,
  onTogglePreview,
  hasFormation,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  saving,
  dirty,
  coverageOverlay,
  onCoverageChange,
  onMirror,
  onExport,
  onOpenLibrary,
  onOpenAI,
  onOpenPrint,
  gameFormat,
  onGameFormatChange,
  showHistory,
  versionHistoryOpen,
  onToggleHistory,
}: PlayToolbarProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowOpen]);

  // Derived mode
  const selectActive = !drawingRoute && !motionMode && !previewMode;
  const drawActive = drawingRoute && !previewMode;
  const motionActive = motionMode && !previewMode;

  const handleModeSelect = useCallback(
    (mode: "select" | "draw" | "motion" | "preview") => {
      if (mode === "preview") { onTogglePreview(); return; }
      if (previewMode) onTogglePreview(); // exit preview first
      if (mode === "select") { if (drawingRoute) onToggleDrawing(); if (motionMode) onToggleMotion(); }
      if (mode === "draw")   { if (!drawingRoute) onToggleDrawing(); if (motionMode) onToggleMotion(); }
      if (mode === "motion") { if (drawingRoute) onToggleDrawing(); if (!motionMode) onToggleMotion(); }
    },
    [drawingRoute, motionMode, previewMode, onToggleDrawing, onToggleMotion, onTogglePreview],
  );

  return (
    <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.08] bg-zinc-950/80 px-3 py-2 shadow-2xl backdrop-blur-xl">

      {/* ── Play name ── */}
      <input
        ref={nameInputRef}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onFocus={() => setNameEditing(true)}
        onBlur={() => setNameEditing(false)}
        className={cn(
          "w-32 min-w-0 shrink bg-transparent text-sm font-semibold text-white outline-none transition-all sm:w-44",
          nameEditing
            ? "rounded-xl border border-emerald-500/50 px-2 py-1"
            : "border border-transparent px-2 py-1 hover:border-white/10",
        )}
        placeholder="Play name…"
      />

      {/* Formation badge */}
      {formation && (
        <span className="hidden shrink-0 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 sm:inline-block">
          {formation}
        </span>
      )}

      <div className="h-4 w-px shrink-0 bg-zinc-700/60" />

      {/* ── Play type ── */}
      <div className="flex shrink-0 rounded-xl bg-white/[0.05] p-0.5">
        {playTypes.map((pt) => (
          <button
            key={pt.value}
            onClick={() => onPlayTypeChange(pt.value)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              playType === pt.value
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {pt.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px shrink-0 bg-zinc-700/60" />

      {/* ── Mode selector ── */}
      <div className="flex shrink-0 items-center rounded-xl bg-white/[0.05] p-0.5">
        <ModeButton
          icon={<MousePointer2 className="h-3.5 w-3.5" />}
          label="Select"
          active={selectActive}
          color="indigo"
          tooltip="Select (V)"
          onClick={() => handleModeSelect("select")}
        />
        <ModeButton
          icon={<Pen className="h-3.5 w-3.5" />}
          label="Draw"
          active={drawActive}
          color="emerald"
          tooltip="Draw Route (D)"
          onClick={() => handleModeSelect("draw")}
        />
        <ModeButton
          icon={<MoveRight className="h-3.5 w-3.5" />}
          label="Motion"
          active={motionActive}
          color="cyan"
          tooltip="Motion Tool (M)"
          disabled={!hasFormation}
          onClick={() => handleModeSelect("motion")}
        />
        <ModeButton
          icon={previewMode ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          label={previewMode ? "Stop" : "Preview"}
          active={previewMode}
          color="amber"
          tooltip={previewMode ? "Exit Preview (P)" : "Preview Animation (P)"}
          disabled={!hasFormation}
          onClick={() => handleModeSelect("preview")}
        />
      </div>

      <div className="h-4 w-px shrink-0 bg-zinc-700/60" />

      {/* ── Undo / Redo ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton icon={<Undo2 className="h-4 w-4" />} onClick={onUndo} disabled={!canUndo} tooltip="Undo (⌘Z)" />
        <IconButton icon={<Redo2 className="h-4 w-4" />} onClick={onRedo} disabled={!canRedo} tooltip="Redo (⌘⇧Z)" />
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Overflow menu ── */}
      <div ref={overflowRef} className="relative shrink-0">
        <button
          onClick={() => setOverflowOpen((v) => !v)}
          title="More options"
          className={cn(
            "rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-200",
            overflowOpen && "bg-white/[0.08] text-zinc-200",
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {overflowOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-white/[0.08] bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl">
            {/* Game format */}
            {gameFormat && onGameFormatChange && (
              <div className="mb-1 px-2 py-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Format
                </label>
                <select
                  value={gameFormat}
                  onChange={(e) => onGameFormatChange(e.target.value as GameFormat)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-zinc-300 outline-none"
                >
                  {formatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Coverage */}
            {!previewMode && (
              <div className="mb-1 px-2 py-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Coverage
                </label>
                <div className="relative">
                  <select
                    value={coverageOverlay}
                    onChange={(e) => onCoverageChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-6 pr-2 text-xs font-medium text-zinc-300 outline-none"
                  >
                    <option value="">None</option>
                    {COVERAGE_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Shield className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                </div>
              </div>
            )}

            <div className="my-1.5 border-t border-white/[0.06]" />

            {/* Mirror */}
            {!previewMode && (
              <OverflowItem
                icon={<FlipHorizontal className="h-3.5 w-3.5" />}
                label="Mirror Play"
                kbd="H"
                onClick={() => { onMirror(); setOverflowOpen(false); }}
              />
            )}

            {/* Library */}
            {onOpenLibrary && (
              <OverflowItem
                icon={<BookOpen className="h-3.5 w-3.5" />}
                label="Play Library"
                kbd="L"
                onClick={() => { onOpenLibrary(); setOverflowOpen(false); }}
              />
            )}

            {/* AI */}
            {onOpenAI && (
              <OverflowItem
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="AI Generator"
                kbd="A"
                onClick={() => { onOpenAI(); setOverflowOpen(false); }}
              />
            )}

            {/* Print */}
            {onOpenPrint && (
              <OverflowItem
                icon={<Printer className="h-3.5 w-3.5" />}
                label="Print"
                onClick={() => { onOpenPrint(); setOverflowOpen(false); }}
              />
            )}

            {/* Export */}
            <OverflowItem
              icon={<Download className="h-3.5 w-3.5" />}
              label="Export PNG"
              onClick={() => { onExport(); setOverflowOpen(false); }}
            />

            {/* History */}
            {showHistory && onToggleHistory && (
              <>
                <div className="my-1.5 border-t border-white/[0.06]" />
                <OverflowItem
                  icon={<History className="h-3.5 w-3.5" />}
                  label="Version History"
                  active={versionHistoryOpen}
                  onClick={() => { onToggleHistory(); setOverflowOpen(false); }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Save indicator + button ── */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1.5 text-xs sm:flex">
          {dirty ? (
            <><Circle className="h-2 w-2 fill-amber-400 text-amber-400" /><span className="text-zinc-500">Unsaved</span></>
          ) : (
            <><Check className="h-3 w-3 text-emerald-500" /><span className="text-zinc-500">Saved</span></>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
            dirty
              ? "bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.28)] hover:bg-emerald-500"
              : "bg-white/[0.05] text-zinc-500",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Save</span>
          <kbd className="hidden rounded bg-white/10 px-1 py-0.5 text-[10px] font-normal text-white/50 lg:inline-block">
            ⌘S
          </kbd>
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ModeButton({
  icon,
  label,
  active,
  color,
  disabled,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: "indigo" | "emerald" | "cyan" | "amber";
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const activeClass = {
    indigo: "bg-indigo-600 text-white",
    emerald: "bg-emerald-600 text-white",
    cyan: "bg-cyan-600 text-white",
    amber: "bg-amber-500 text-white",
  }[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
        active ? activeClass : "text-zinc-400 hover:text-zinc-200",
        disabled && "pointer-events-none opacity-30",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconButton({
  icon,
  disabled,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "rounded-lg p-2 text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-zinc-200",
        disabled && "pointer-events-none opacity-30",
      )}
    >
      {icon}
    </button>
  );
}

function OverflowItem({
  icon,
  label,
  kbd,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  kbd?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
        active
          ? "bg-emerald-600/20 text-emerald-300"
          : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <span className="text-zinc-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {kbd && (
        <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{kbd}</kbd>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Verify the file was written correctly (no TypeScript errors visible)**

Check that all imports are used and all props in the interface are consumed in the component body.

---

### Task 2: Update designer/page.tsx — remove ContextBar, wire new props

**Files:**
- Modify: `src/app/(coach)/designer/page.tsx`

**Interfaces:**
- Consumes: new `PlayToolbarProps` from Task 1

- [ ] **Step 1: Remove the ContextBar import**

Find:
```tsx
import { ContextBar } from "@/components/play/context-bar";
```
Delete that line.

- [ ] **Step 2: Remove the <ContextBar> JSX block**

Find and delete:
```tsx
          <ContextBar
            coverageOverlay={coverageOverlay}
            onCoverageChange={setCoverageOverlay}
            motionMode={motionMode}
            onToggleMotion={() => {
              setMotionMode((m) => !m);
              if (!motionMode) {
                setDrawingRoute(false);
              }
              setMotionPlayerId(null);
            }}
            previewMode={previewMode}
            onTogglePreview={handleTogglePreview}
            onMirror={handleMirror}
            onExport={handleExport}
            showHistory={!!searchParams.get("playId")}
            versionHistoryOpen={versionHistoryOpen}
            onToggleHistory={() => setVersionHistoryOpen((v) => !v)}
            hasFormation={hasFormation}
          />
```

- [ ] **Step 3: Add the new props to <PlayToolbar>**

Find the closing `/>` of `<PlayToolbar ... />` and replace the entire `<PlayToolbar>` block with:

```tsx
          <PlayToolbar
            name={playName}
            onNameChange={setPlayName}
            formation={formationName}
            playType={playType}
            onPlayTypeChange={handlePlayTypeChange}
            drawingRoute={drawingRoute}
            onToggleDrawing={() => {
              setDrawingRoute((d) => !d);
              setMotionMode(false);
              setMotionPlayerId(null);
            }}
            motionMode={motionMode}
            onToggleMotion={() => {
              if (!hasFormation || previewMode) return;
              setMotionMode((m) => !m);
              if (!motionMode) setDrawingRoute(false);
              setMotionPlayerId(null);
            }}
            previewMode={previewMode}
            onTogglePreview={handleTogglePreview}
            hasFormation={hasFormation}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            saving={saving}
            dirty={dirty}
            canUndo={undoRef.current.length > 0}
            canRedo={redoRef.current.length > 0}
            coverageOverlay={coverageOverlay}
            onCoverageChange={setCoverageOverlay}
            onMirror={handleMirror}
            onExport={handleExport}
            onOpenLibrary={() => setPlayLibraryOpen(true)}
            onOpenAI={() => setAiPanelOpen((v) => !v)}
            onOpenPrint={() => setPrintPanelOpen(true)}
            gameFormat={gameFormat}
            onGameFormatChange={setGameFormat}
            showHistory={!!searchParams.get("playId")}
            versionHistoryOpen={versionHistoryOpen}
            onToggleHistory={() => setVersionHistoryOpen((v) => !v)}
          />
```

- [ ] **Step 4: Remove the wrapping flex-col div that stacked the two bars**

The current wrapper is:
```tsx
        <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
```

Change `flex-col gap-2` to just `flex` (single child now, no stacking needed).

- [ ] **Step 5: Verify — remove any now-unused imports from page.tsx**

Check the import block. Remove `MoveRight` from the lucide imports if it's no longer used directly in page.tsx (it was used for the motion indicator pill — keep the pill, so keep `MoveRight`).

- [ ] **Step 6: Commit**

```bash
git add src/components/play/play-toolbar.tsx src/app/(coach)/designer/page.tsx
git commit -m "feat: unify PlayToolbar + ContextBar into single non-wrapping bar with mode selector and overflow menu"
```

---

### Task 3: Delete ContextBar (cleanup)

**Files:**
- Delete: `src/components/play/context-bar.tsx`

- [ ] **Step 1: Confirm no other files import ContextBar**

```bash
grep -r "context-bar" src/
```
Expected output: nothing (after Task 2 is done).

- [ ] **Step 2: Delete the file**

```bash
rm src/components/play/context-bar.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete ContextBar — functionality merged into PlayToolbar"
```

---

## Self-Review

**Spec coverage:**
- ✅ Single bar that never wraps — achieved via `flex items-center` with `shrink-0` on all fixed items and `flex-1` spacer
- ✅ Mode selector: Select | Draw | Motion | Preview — `ModeButton` group in center
- ✅ Play type segmented control — retained inline
- ✅ Formation badge — retained inline (hidden on < 640 px)
- ✅ Overflow: Mirror, Coverage, Game Format, Export, Library, AI, Print, History — all in `⋯` popover
- ✅ Keyboard shortcuts — all tooltip labels retained; shortcuts themselves are in `useKeyboardShortcuts` in page.tsx (unchanged)
- ✅ ContextBar deleted after migration

**Placeholder scan:** No TBDs or TODOs.

**Type consistency:** `PlayToolbarProps` is self-contained. `ModeButton`, `IconButton`, `OverflowItem` are internal sub-components with no external consumers.
