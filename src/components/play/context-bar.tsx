"use client";

import {
  Shield,
  History,
  Download,
  FlipHorizontal,
  MoveRight,
  Play,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COVERAGE_SCHEMES } from "@/engine/coverage-zone";

interface ContextBarProps {
  coverageOverlay: string;
  onCoverageChange: (value: string) => void;
  motionMode: boolean;
  onToggleMotion: () => void;
  previewMode: boolean;
  onTogglePreview: () => void;
  onMirror: () => void;
  onExport: () => void;
  showHistory: boolean;
  versionHistoryOpen: boolean;
  onToggleHistory: () => void;
  hasFormation: boolean;
}

export function ContextBar({
  coverageOverlay,
  onCoverageChange,
  motionMode,
  onToggleMotion,
  previewMode,
  onTogglePreview,
  onMirror,
  onExport,
  showHistory,
  versionHistoryOpen,
  onToggleHistory,
  hasFormation,
}: ContextBarProps) {
  if (!hasFormation) return null;

  return (
    <div className="flex items-center justify-end gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/80 px-3 py-1.5 shadow-lg backdrop-blur-xl">
      {/* Coverage overlay dropdown */}
      {!previewMode && (
        <div className="relative">
          <select
            value={coverageOverlay}
            onChange={(e) => onCoverageChange(e.target.value)}
            className="inline-flex appearance-none items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 pl-7 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            <option value="">No Coverage</option>
            {COVERAGE_SCHEMES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Shield className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
        </div>
      )}

      {/* Motion tool */}
      {!previewMode && (
        <button
          onClick={onToggleMotion}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            motionMode
              ? "bg-cyan-600 text-white hover:bg-cyan-500"
              : "border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white",
          )}
          title={motionMode ? "Exit Motion Mode (M)" : "Motion Tool (M)"}
        >
          <MoveRight className="h-3.5 w-3.5" />
          {motionMode ? "Exit Motion" : "Motion"}
        </button>
      )}

      {/* Mirror */}
      {!previewMode && (
        <button
          onClick={onMirror}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Mirror Play (H)"
        >
          <FlipHorizontal className="h-3.5 w-3.5" />
          Mirror
        </button>
      )}

      {/* Export */}
      <button
        onClick={onExport}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Export as PNG"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>

      {/* History */}
      {showHistory && (
        <button
          onClick={onToggleHistory}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            versionHistoryOpen
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white",
          )}
          title="Version History"
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
      )}

      {/* Preview / Play — rightmost, prominent */}
      <button
        onClick={onTogglePreview}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          previewMode
            ? "bg-amber-600 text-white hover:bg-amber-500"
            : "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-500",
        )}
        title={previewMode ? "Exit Preview (P)" : "Preview Animation (P)"}
      >
        {previewMode ? (
          <>
            <Square className="h-3.5 w-3.5" />
            Exit Preview
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Preview
          </>
        )}
      </button>
    </div>
  );
}
