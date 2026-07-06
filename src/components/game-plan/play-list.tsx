"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
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
  const toast = useToast();

  const movePlay = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= plays.length) return;

    const prevPlays = plays;

    const newPlays = [...plays];
    const temp = newPlays[index];
    newPlays[index] = newPlays[newIndex];
    newPlays[newIndex] = temp;

    // Update sortOrder
    const reordered = newPlays.map((p, i) => ({ ...p, sortOrder: i }));
    setPlays(reordered);

    startTransition(async () => {
      try {
        await reorderGamePlanPlays(
          gamePlanId,
          reordered.map((p) => p.playId),
        );
      } catch (err) {
        setPlays(prevPlays);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder plays",
        );
      }
    });
  };

  const handleRemove = (playId: string) => {
    const prevPlays = plays;
    const prevAvailable = availablePlays;

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
      try {
        await removePlayFromGamePlan(gamePlanId, playId);
      } catch (err) {
        setPlays(prevPlays);
        setAvailablePlays(prevAvailable);
        toast.error(
          err instanceof Error ? err.message : "Failed to remove play",
        );
      }
    });
  };

  const handleAdd = (playId: string) => {
    const play = availablePlays.find((p) => p.id === playId);
    if (!play) return;

    const prevPlays = plays;
    const prevAvailable = availablePlays;

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
      try {
        await addPlayToGamePlan(gamePlanId, playId);
      } catch (err) {
        setPlays(prevPlays);
        setAvailablePlays(prevAvailable);
        toast.error(err instanceof Error ? err.message : "Failed to add play");
      }
    });
  };

  return (
    <div className="space-y-3">
      {plays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">No plays in this game plan</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Add plays to build your game plan.
          </p>
        </div>
      ) : (
        plays.map((play, index) => (
          <Card
            key={play.id}
          >
            <CardContent className="flex items-center gap-4 p-4">
              {/* Order number */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground/85">
                {index + 1}
              </div>

              {/* Grip icon */}
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/70" />

              {/* Thumbnail */}
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary">
                {play.thumbnailUrl ? (
                  <img
                    src={play.thumbnailUrl}
                    alt={play.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-muted-foreground/70">No preview</span>
                )}
              </div>

              {/* Play info */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {play.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
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
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => movePlay(index, "down")}
                  disabled={index === plays.length - 1 || isPending}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRemove(play.playId)}
                  disabled={isPending}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/30 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
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
              <h3 className="text-sm font-semibold text-foreground">
                Add a Play
              </h3>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground/85"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {availablePlays.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All plays are already in this game plan.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {availablePlays.map((play) => (
                  <button
                    key={play.id}
                    onClick={() => handleAdd(play.id)}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {play.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {play.formation} &middot;{" "}
                        {play.playType.replace("_", " ")}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground/85"
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
