"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { CanvasPlayer, Route } from "@/engine/types";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignmentPanelProps {
  player: CanvasPlayer | null;
  route: Route | undefined;
  onClose: () => void;
  onDeleteRoute: () => void;
  onUpdateRouteType: (type: Route["type"]) => void;
}

const routeStyles: { value: Route["type"]; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "thick", label: "Thick (Block)" },
];

const routeTypeOptions = [
  "Go",
  "Slant",
  "Out",
  "In",
  "Post",
  "Corner",
  "Curl",
  "Comeback",
  "Drag",
  "Screen",
  "Block",
  "Flat",
  "Wheel",
  "Seam",
];

export function AssignmentPanel({
  player,
  route,
  onClose,
  onDeleteRoute,
  onUpdateRouteType,
}: AssignmentPanelProps) {
  if (!player) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-white">{player.label}</span>
          <span
            className={cn(
              "ml-2 text-xs uppercase",
              player.side === "offense" ? "text-blue-400" : "text-red-400",
            )}
          >
            {player.side}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Player info */}
      <div className="text-xs text-zinc-500">
        ID: {player.id} &middot; Position ({Math.round(player.x)},{" "}
        {Math.round(player.y)})
      </div>

      {route ? (
        <>
          {/* Route style selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Route Style
            </label>
            <div className="flex gap-1.5">
              {routeStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => onUpdateRouteType(style.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    route.type === style.value
                      ? "bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/50"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Route type dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Route Type
            </label>
            <Select
              value={route.routeType ?? ""}
              onChange={(e) => {
                // We only update the routeType label — not the visual type
                // This is informational metadata
              }}
            >
              <option value="">Select route...</option>
              {routeTypeOptions.map((rt) => (
                <option key={rt} value={rt.toLowerCase()}>
                  {rt}
                </option>
              ))}
            </Select>
          </div>

          {/* Waypoint count */}
          <div className="text-xs text-zinc-500">
            {route.waypoints.length} waypoint
            {route.waypoints.length !== 1 ? "s" : ""}
          </div>

          {/* Delete route */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteRoute}
            className="mt-1"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete Route
          </Button>
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          Enable drawing mode and click on the field to draw a route for this
          player.
        </p>
      )}
    </div>
  );
}
