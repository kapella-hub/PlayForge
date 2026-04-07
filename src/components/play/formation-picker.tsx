"use client";

import { FORMATIONS } from "@/engine/constants";
import type { FormationTemplate } from "@/engine/types";
import { cn } from "@/lib/utils";

interface FormationPickerProps {
  side: "offense" | "defense";
  selectedId: string;
  onSelect: (formation: FormationTemplate) => void;
}

export function FormationPicker({
  side,
  selectedId,
  onSelect,
}: FormationPickerProps) {
  const formations = FORMATIONS.filter((f) => f.side === side);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {side === "offense" ? "Offense" : "Defense"} Formations
      </span>
      {formations.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className={cn(
            "rounded-lg px-3 py-2 text-left text-sm transition-colors",
            f.id === selectedId
              ? "bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/50"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}
