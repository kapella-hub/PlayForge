"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { createPracticePlan } from "@/lib/actions/practice-actions";

export function CreatePracticePlanButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const plan = await createPracticePlan({
        orgId,
        name: name.trim(),
        date: date || null,
      });
      router.push(`/practice/${plan.id}`);
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        New Plan
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Plan name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        className="w-48"
        autoFocus
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-40"
      />
      <Button size="sm" onClick={handleCreate} disabled={isPending || !name.trim()}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(false);
          setName("");
          setDate("");
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
