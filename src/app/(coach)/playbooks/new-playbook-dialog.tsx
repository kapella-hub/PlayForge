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
import { createPlaybook } from "@/lib/actions/playbook-actions";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewPlaybookDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setSide("offense");
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return; // don't close mid-submit
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("orgId", orgId);
        formData.set("name", trimmed);
        formData.set("side", side);
        const playbook = await createPlaybook(formData);
        toast.success("Playbook created");
        setOpen(false);
        reset();
        router.push(`/playbooks/${playbook.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create playbook",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Playbook</DialogTitle>
          <DialogDescription>
            Create a playbook to organize your plays by side of the ball.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Base Offense"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Side
            </label>
            <div className="flex rounded-lg bg-secondary p-0.5">
              {(["offense", "defense"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "flex-1 rounded-md px-4 py-2 text-xs font-medium capitalize transition-colors",
                    side === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
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
