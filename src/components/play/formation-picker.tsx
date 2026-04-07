"use client";

import { useState, useMemo } from "react";
import { FORMATIONS } from "@/engine/constants";
import type { FormationTemplate, CanvasPlayer } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Check, Search, X } from "lucide-react";

interface FormationPickerProps {
  side: "offense" | "defense";
  selectedId: string;
  onSelect: (formation: FormationTemplate) => void;
  onClose: () => void;
}

/** Renders a tiny schematic of player positions as an SVG minimap */
function FormationMinimap({
  players,
  isSelected,
}: {
  players: CanvasPlayer[];
  isSelected: boolean;
}) {
  // Normalize player positions to fit in a 72x44 SVG
  const minX = Math.min(...players.map((p) => p.x));
  const maxX = Math.max(...players.map((p) => p.x));
  const minY = Math.min(...players.map((p) => p.y));
  const maxY = Math.max(...players.map((p) => p.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padX = 6;
  const padY = 6;
  const svgW = 72;
  const svgH = 44;

  const side = players[0]?.side ?? "offense";
  const dotColor = isSelected
    ? "#818cf8"
    : side === "offense"
      ? "#60a5fa"
      : "#f87171";

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="shrink-0"
    >
      {players.map((p, i) => {
        const cx = padX + ((p.x - minX) / rangeX) * (svgW - padX * 2);
        const cy = padY + ((p.y - minY) / rangeY) * (svgH - padY * 2);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={3}
            fill={dotColor}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

export function FormationPicker({
  side,
  selectedId,
  onSelect,
  onClose,
}: FormationPickerProps) {
  const [search, setSearch] = useState("");

  const formations = useMemo(() => {
    const filtered = FORMATIONS.filter((f) => f.side === side);
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter((f) => f.name.toLowerCase().includes(q));
  }, [side, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-sm font-semibold text-zinc-200">
          {side === "offense" ? "Offense" : "Defense"} Formations
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search filter */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter..."
          className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/50"
        />
      </div>

      {/* Formation grid */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-0.5">
        {formations.map((f) => {
          const isSelected = f.id === selectedId;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                isSelected
                  ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                  : "border-zinc-800 bg-zinc-900/50 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/60 hover:shadow-lg",
              )}
            >
              <FormationMinimap
                players={f.players}
                isSelected={isSelected}
              />
              <div className="flex w-full items-center justify-center gap-1">
                <span
                  className={cn(
                    "truncate text-[11px] font-medium",
                    isSelected ? "text-indigo-300" : "text-zinc-400 group-hover:text-zinc-200",
                  )}
                >
                  {f.name}
                </span>
                {isSelected && (
                  <Check className="h-3 w-3 shrink-0 text-indigo-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {formations.length === 0 && (
        <p className="py-6 text-center text-xs text-zinc-600">
          No formations found
        </p>
      )}
    </div>
  );
}
