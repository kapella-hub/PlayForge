"use client";

import { useState, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
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
  Magnet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FORMATS, type GameFormat } from "@/engine/constants";
import { COVERAGE_SCHEMES } from "@/engine/coverage-zone";
import { Select } from "@/components/ui/select";

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
  snapEnabled: boolean;
  onToggleSnap: () => void;
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
  snapEnabled,
  onToggleSnap,
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
  const [nameEditing, setNameEditing] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const selectActive = !drawingRoute && !motionMode && !previewMode;
  const drawActive = drawingRoute && !previewMode;
  const motionActive = motionMode && !previewMode;

  const handleModeSelect = useCallback(
    (mode: "select" | "draw" | "motion" | "preview") => {
      if (mode === "preview") { onTogglePreview(); return; }
      if (previewMode) onTogglePreview();
      if (mode === "select") {
        if (drawingRoute) onToggleDrawing();
        if (motionMode) onToggleMotion();
      }
      if (mode === "draw") {
        if (!drawingRoute) onToggleDrawing();
        if (motionMode) onToggleMotion();
      }
      if (mode === "motion") {
        if (drawingRoute) onToggleDrawing();
        if (!motionMode) onToggleMotion();
      }
    },
    [drawingRoute, motionMode, previewMode, onToggleDrawing, onToggleMotion, onTogglePreview],
  );

  return (
    <div className="flex items-center gap-2 rounded-[20px] border border-border bg-card px-3 py-2 shadow-2xl backdrop-blur-xl">

      {/* ── Play name ── */}
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onFocus={() => setNameEditing(true)}
        onBlur={() => setNameEditing(false)}
        className={cn(
          "w-32 min-w-0 shrink bg-transparent text-sm font-semibold text-foreground outline-none transition-all sm:w-44",
          nameEditing
            ? "rounded-xl border border-ring/50 px-2 py-1"
            : "border border-transparent px-2 py-1 hover:border-border",
        )}
        placeholder="Play name…"
      />

      {/* Formation badge */}
      {formation && (
        <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-block">
          {formation}
        </span>
      )}

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* ── Play type ── */}
      <div className="flex shrink-0 rounded-xl bg-secondary p-0.5">
        {playTypes.map((pt) => (
          <button
            key={pt.value}
            onClick={() => onPlayTypeChange(pt.value)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              playType === pt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {pt.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* ── Mode selector: Select | Draw | Motion | Preview ── */}
      <div className="flex shrink-0 items-center rounded-xl bg-secondary p-0.5">
        <ModeButton
          icon={<MousePointer2 className="h-3.5 w-3.5" />}
          label="Select"
          active={selectActive}
          color="emerald"
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
          color="accent"
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

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* ── Undo / Redo ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton icon={<Undo2 className="h-4 w-4" />} onClick={onUndo} disabled={!canUndo} tooltip="Undo (⌘Z)" />
        <IconButton icon={<Redo2 className="h-4 w-4" />} onClick={onRedo} disabled={!canRedo} tooltip="Redo (⌘⇧Z)" />
      </div>

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

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Overflow menu (Radix Popover) ── */}
      <Popover.Root open={overflowOpen} onOpenChange={setOverflowOpen}>
        <Popover.Trigger asChild>
          <button
            title="More options"
            className={cn(
              "rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              overflowOpen && "bg-secondary text-foreground",
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-50 w-52 rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-100"
          >
            {/* Game format */}
            {gameFormat && onGameFormatChange && (
              <div className="mb-1 px-2 py-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Format
                </label>
                <Select
                  value={gameFormat}
                  onChange={(e) => onGameFormatChange(e.target.value as GameFormat)}
                  className="h-auto rounded-lg px-2 py-1.5 text-xs font-medium"
                >
                  {formatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Coverage overlay */}
            {!previewMode && (
              <div className="mb-1 px-2 py-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Coverage
                </label>
                <div className="relative">
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
                  <Shield className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="my-1.5 border-t border-border" />

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
            {onOpenPrint && !previewMode && (
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
                <div className="my-1.5 border-t border-border" />
                <OverflowItem
                  icon={<History className="h-3.5 w-3.5" />}
                  label="Version History"
                  active={versionHistoryOpen}
                  onClick={() => { onToggleHistory(); setOverflowOpen(false); }}
                />
              </>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* ── Save indicator + button ── */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1.5 text-xs sm:flex">
          {dirty ? (
            <>
              <Circle className="h-2 w-2 fill-warning text-warning" />
              <span className="text-muted-foreground">Unsaved</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-muted-foreground">Saved</span>
            </>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
            dirty
              ? "bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(15,118,110,0.28)] hover:bg-primary/90"
              : "bg-secondary text-muted-foreground",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Save</span>
          <kbd className="hidden rounded bg-primary-foreground/10 px-1 py-0.5 text-[10px] font-normal text-primary-foreground/50 lg:inline-block">
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
  color: "emerald" | "accent" | "amber";
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const activeClass = {
    emerald: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    amber: "bg-success text-primary-foreground",
  }[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
        active ? activeClass : "text-muted-foreground hover:text-foreground",
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
        "rounded-lg p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
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
          ? "bg-primary/20 text-primary-emphasis"
          : "text-foreground/85 hover:bg-secondary hover:text-foreground",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {kbd && (
        <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{kbd}</kbd>
      )}
    </button>
  );
}
