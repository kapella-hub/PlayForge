"use client";

import { useState, useMemo } from "react";
import {
  FORMATIONS,
  GAME_FORMATS,
  getFormationsByFormat,
  type GameFormat,
} from "@/engine/constants";
import type { FormationTemplate, CanvasPlayer } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Check, Search, X } from "lucide-react";

interface FormationPickerProps {
  side: "offense" | "defense";
  selectedId: string;
  onSelect: (formation: FormationTemplate) => void;
  onClose: () => void;
  /** When provided, formations are filtered to those matching the game format player count */
  gameFormat?: GameFormat;
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
  gameFormat,
}: FormationPickerProps) {
  const [search, setSearch] = useState("");

  const formations = useMemo(() => {
    let pool: FormationTemplate[];

    if (gameFormat && side === "offense") {
      // Filter by game format player count for offense
      pool = getFormationsByFormat(gameFormat);
    } else {
      pool = FORMATIONS.filter((f) => f.side === side);
    }

    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter((f) => f.name.toLowerCase().includes(q));
  }, [side, search, gameFormat]);

  const formatLabel = gameFormat ? GAME_FORMATS[gameFormat].label : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {side === "offense" ? "Offense" : "Defense"} Formations
          </h3>
          {formatLabel && side === "offense" && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Showing {formatLabel} formations
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground/85"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search filter */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter..."
          className="w-full rounded-lg border border-border/50 bg-secondary py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary/50"
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
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(15,118,110,0.15)]"
                  : "border-border bg-card hover:-translate-y-0.5 hover:shadow-lg",
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
                    isSelected ? "text-primary-emphasis" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {f.name}
                </span>
                {isSelected && (
                  <Check className="h-3 w-3 shrink-0 text-primary-emphasis" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {formations.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground/70">
          No formations found
        </p>
      )}
    </div>
  );
}
