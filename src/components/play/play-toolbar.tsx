"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FORMATS, type GameFormat } from "@/engine/constants";

interface PlayToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  formation: string;
  playType: string;
  onPlayTypeChange: (type: string) => void;
  drawingRoute: boolean;
  onToggleDrawing: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  saving: boolean;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onOpenLibrary?: () => void;
  onOpenPrint?: () => void;
  gameFormat?: GameFormat;
  onGameFormatChange?: (format: GameFormat) => void;
}

const playTypes = [
  { value: "run", label: "Run" },
  { value: "pass", label: "Pass" },
  { value: "play_action", label: "PA" },
  { value: "screen", label: "Screen" },
] as const;

const formatOptions: { value: GameFormat; label: string }[] = (
  Object.keys(GAME_FORMATS) as GameFormat[]
).map((k) => ({
  value: k,
  label: k,
}));

export function PlayToolbar({
  name,
  onNameChange,
  formation,
  playType,
  onPlayTypeChange,
  drawingRoute,
  onToggleDrawing,
  onSave,
  onUndo,
  onRedo,
  saving,
  dirty,
  canUndo,
  canRedo,
  onOpenLibrary,
  onOpenPrint,
  gameFormat,
  onGameFormatChange,
}: PlayToolbarProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameEditing, setNameEditing] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/80 px-4 py-2.5 shadow-xl backdrop-blur-xl">
      {/* ── Left section: play info ── */}
      <div className="flex items-center gap-3">
        {/* Play name — heading when not focused, input when editing */}
        <input
          ref={nameInputRef}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => setNameEditing(true)}
          onBlur={() => setNameEditing(false)}
          className={cn(
            "w-48 bg-transparent text-base font-semibold text-white outline-none transition-all",
            nameEditing
              ? "rounded-lg border border-indigo-500/50 px-2.5 py-1"
              : "border border-transparent px-2.5 py-1 hover:border-zinc-700",
          )}
          placeholder="Play name..."
        />

        {/* Formation badge */}
        {formation && (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
            {formation}
          </span>
        )}
      </div>

      {/* ── Center section: play type segmented control + tools ── */}
      <div className="flex flex-1 items-center justify-center gap-4">
        {/* Game format selector */}
        {gameFormat && onGameFormatChange && (
          <>
            <select
              value={gameFormat}
              onChange={(e) => onGameFormatChange(e.target.value as GameFormat)}
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-2 py-1.5 text-xs font-medium text-zinc-300 outline-none transition-colors hover:border-zinc-600 focus:border-indigo-500/50"
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="h-5 w-px bg-zinc-700/50" />
          </>
        )}

        {/* Play type segmented control */}
        <div className="flex rounded-lg bg-zinc-800/80 p-0.5">
          {playTypes.map((pt) => (
            <button
              key={pt.value}
              onClick={() => onPlayTypeChange(pt.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                playType === pt.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-700/50" />

        {/* Tool button group */}
        <div className="flex items-center rounded-lg bg-zinc-800/80 p-0.5">
          <ToolButton
            icon={<MousePointer2 className="h-4 w-4" />}
            active={!drawingRoute}
            onClick={() => drawingRoute && onToggleDrawing()}
            tooltip="Select (V)"
          />
          <ToolButton
            icon={<Pen className="h-4 w-4" />}
            active={drawingRoute}
            onClick={() => !drawingRoute && onToggleDrawing()}
            tooltip="Draw Route (D)"
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-700/50" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            icon={<Undo2 className="h-4 w-4" />}
            onClick={onUndo}
            disabled={!canUndo}
            tooltip="Undo (Cmd+Z)"
          />
          <ToolButton
            icon={<Redo2 className="h-4 w-4" />}
            onClick={onRedo}
            disabled={!canRedo}
            tooltip="Redo (Cmd+Shift+Z)"
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-700/50" />

        {/* Library & Print */}
        <div className="flex items-center gap-0.5">
          {onOpenLibrary && (
            <ToolButton
              icon={<BookOpen className="h-4 w-4" />}
              onClick={onOpenLibrary}
              tooltip="Play Library (L)"
            />
          )}
          {onOpenPrint && (
            <ToolButton
              icon={<Printer className="h-4 w-4" />}
              onClick={onOpenPrint}
              tooltip="Print"
            />
          )}
        </div>
      </div>

      {/* ── Right section: status + save ── */}
      <div className="flex items-center gap-3">
        {/* Save status indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {dirty ? (
            <>
              <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
              <span className="text-zinc-500">Unsaved</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-zinc-500">Saved</span>
            </>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            dirty
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
              : "bg-zinc-800 text-zinc-500",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
          <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/50 sm:inline-block">
            {"\u2318"}S
          </kbd>
        </button>
      </div>
    </div>
  );
}

/* ── Internal tool button ── */

function ToolButton({
  icon,
  active = false,
  disabled = false,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  active?: boolean;
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
        "relative rounded-md p-2 transition-all",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
        disabled && "opacity-30 pointer-events-none",
      )}
    >
      {icon}
    </button>
  );
}
