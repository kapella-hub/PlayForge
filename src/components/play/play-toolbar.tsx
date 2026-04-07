"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pencil, Undo2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  saving: boolean;
  dirty: boolean;
}

const playTypes = [
  { value: "run", label: "Run" },
  { value: "pass", label: "Pass" },
  { value: "play_action", label: "Play Action" },
  { value: "screen", label: "Screen" },
  { value: "special", label: "Special" },
];

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
  saving,
  dirty,
}: PlayToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      {/* Play name */}
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Play name..."
        className="w-44"
      />

      {/* Formation display */}
      <span className="rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
        {formation || "No formation"}
      </span>

      {/* Play type select */}
      <Select
        value={playType}
        onChange={(e) => onPlayTypeChange(e.target.value)}
        className="w-36"
      >
        {playTypes.map((pt) => (
          <option key={pt.value} value={pt.value}>
            {pt.label}
          </option>
        ))}
      </Select>

      <div className="flex-1" />

      {/* Drawing mode toggle */}
      <Button
        variant={drawingRoute ? "default" : "outline"}
        size="sm"
        onClick={onToggleDrawing}
        className={cn(drawingRoute && "bg-green-600 hover:bg-green-700")}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        {drawingRoute ? "Drawing" : "Draw Route"}
      </Button>

      {/* Undo */}
      <Button variant="ghost" size="icon" onClick={onUndo} title="Undo">
        <Undo2 className="h-4 w-4" />
      </Button>

      {/* Save */}
      <Button
        variant="default"
        size="sm"
        onClick={onSave}
        disabled={saving || !dirty}
      >
        {saving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-3.5 w-3.5" />
        )}
        Save
      </Button>
    </div>
  );
}
