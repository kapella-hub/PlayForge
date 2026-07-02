"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createGamePlan } from "@/lib/actions/game-plan-actions";
import { Plus, Loader2, X } from "lucide-react";

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
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Game Plan
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-zinc-100">
              New Game Plan
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

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
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={pending || !name.trim()}>
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
