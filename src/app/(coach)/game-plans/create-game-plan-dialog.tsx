"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createGamePlan } from "@/lib/actions/game-plan-actions";
import { Plus, Loader2 } from "lucide-react";

export function CreateGamePlanDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [week, setWeek] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setOpponent("");
    setWeek("");
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedWeek = week.trim() ? Number(week) : NaN;
    startTransition(async () => {
      try {
        const gamePlan = await createGamePlan({
          orgId,
          name: trimmed,
          opponent: opponent.trim() || undefined,
          week: Number.isFinite(parsedWeek) ? parsedWeek : undefined,
        });
        toast.success("Game plan created");
        setOpen(false);
        reset();
        router.push(`/game-plans/${gamePlan.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create game plan",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Game Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Game Plan</DialogTitle>
          <DialogDescription>
            Set up a game plan for an upcoming opponent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 5 vs. Eagles"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Opponent
              </label>
              <Input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Week
              </label>
              <Input
                type="number"
                min={1}
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
