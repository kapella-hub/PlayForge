"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  GripVertical,
  Loader2,
} from "lucide-react";
import {
  reorderGamePlanPlays,
  addPlayToGamePlan,
  removePlayFromGamePlan,
} from "@/lib/actions/game-plan-actions";

interface GamePlanPlay {
  id: string;
  playId: string;
  sortOrder: number;
  name: string;
  formation: string;
  playType: string;
  thumbnailUrl: string | null;
}

interface AvailablePlay {
  id: string;
  name: string;
  formation: string;
  playType: string;
}

interface GamePlanPlayListProps {
  gamePlanId: string;
  plays: GamePlanPlay[];
  availablePlays: AvailablePlay[];
}

export function GamePlanPlayList({
  gamePlanId,
  plays: initialPlays,
  availablePlays: initialAvailable,
}: GamePlanPlayListProps) {
  const [plays, setPlays] = useState(initialPlays);
  const [availablePlays, setAvailablePlays] = useState(initialAvailable);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const movePlay = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plays.length) return;

    const newPlays = [...plays];
    const temp = newPlays[index];
    newPlays[index] = newPlays[newIndex];
    newPlays[newIndex] = temp;

    // Update sortOrder
    const reordered = newPlays.map((p, i) => ({ ...p, sortOrder: i }));
    setPlays(reordered);

    startTransition(async () => {
      await reorderGamePlanPlays(
        gamePlanId,
        reordered.map((p) => p.playId),
      );
    });
  };

  const handleRemove = (playId: string) => {
    const removed = plays.find((p) => p.playId === playId);
    setPlays((prev) => prev.filter((p) => p.playId !== playId));
    if (removed) {
      setAvailablePlays((prev) => [
        ...prev,
        {
          id: removed.playId,
          name: removed.name,
          formation: removed.formation,
          playType: removed.playType,
        },
      ]);
    }

    startTransition(async () => {
      await removePlayFromGamePlan(gamePlanId, playId);
    });
  };

  const handleAdd = (playId: string) => {
    const play = availablePlays.find((p) => p.id === playId);
    if (!play) return;

    setAvailablePlays((prev) => prev.filter((p) => p.id !== playId));
    setPlays((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        playId: play.id,
        sortOrder: prev.length,
        name: play.name,
        formation: play.formation,
        playType: play.playType,
        thumbnailUrl: null,
      },
    ]);
    setShowPicker(false);

    startTransition(async () => {
      await addPlayToGamePlan(gamePlanId, playId);
    });
  };

  return (
    <div className="space-y-3">
      {plays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16">
          <p className="text-sm text-zinc-500">No plays in this game plan</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add plays to build your game plan.
          </p>
        </div>
      ) : (
        plays.map((play, index) => (
          <Card
            key={play.id}
            className="transition-colors hover:border-zinc-700"
          >
            <CardContent className="flex items-center gap-4 p-4">
              {/* Order number */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
                {index + 1}
              </div>

              {/* Grip icon */}
              <GripVertical className="h-4 w-4 shrink-0 text-zinc-600" />

              {/* Thumbnail */}
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-green-900/30">
                {play.thumbnailUrl ? (
                  <img
                    src={play.thumbnailUrl}
                    alt={play.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-zinc-600">No preview</span>
                )}
              </div>

              {/* Play info */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white">
                  {play.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {play.formation}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {play.playType.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => movePlay(index, "up")}
                  disabled={index === 0 || isPending}
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => movePlay(index, "down")}
                  disabled={index === plays.length - 1 || isPending}
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRemove(play.playId)}
                  disabled={isPending}
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-900/30 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                  title="Remove from game plan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Play button / picker */}
      {showPicker ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                Add a Play
              </h3>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {availablePlays.length === 0 ? (
              <p className="text-xs text-zinc-500">
                All plays are already in this game plan.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {availablePlays.map((play) => (
                  <button
                    key={play.id}
                    onClick={() => handleAdd(play.id)}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">
                        {play.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {play.formation} &middot;{" "}
                        {play.playType.replace("_", " ")}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-zinc-500" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Play
        </button>
      )}
    </div>
  );
}
