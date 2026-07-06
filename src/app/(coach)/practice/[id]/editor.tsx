"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addPracticePeriod,
  updatePracticePeriod,
  deletePracticePeriod,
  reorderPracticePeriods,
  updatePracticePlan,
  deletePracticePlan,
} from "@/lib/actions/practice-actions";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Loader2,
  Printer,
} from "lucide-react";

interface PeriodData {
  id: string;
  name: string;
  durationMin: number;
  sortOrder: number;
  playIds: string[];
  notes: string | null;
}

interface PlayOption {
  id: string;
  name: string;
  formation: string;
  playType: string;
}

interface PlanData {
  id: string;
  name: string;
  date: string | null;
  notes: string | null;
  periods: PeriodData[];
}

export function PracticePlanEditor({
  plan,
  availablePlays,
}: {
  plan: PlanData;
  availablePlays: PlayOption[];
}) {
  const [periods, setPeriods] = useState(plan.periods);
  const [planName, setPlanName] = useState(plan.name);
  const [planDate, setPlanDate] = useState(plan.date ?? "");
  const [planNotes, setPlanNotes] = useState(plan.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const [pendingDeletePeriodId, setPendingDeletePeriodId] = useState<string | null>(null);
  const [confirmPlanDelete, setConfirmPlanDelete] = useState(false);

  const totalDuration = periods.reduce((sum, p) => sum + p.durationMin, 0);

  function savePlanHeader() {
    startTransition(async () => {
      try {
        await updatePracticePlan(plan.id, {
          name: planName,
          date: planDate || null,
          notes: planNotes || null,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save plan",
        );
      }
    });
  }

  function handleAddPeriod() {
    startTransition(async () => {
      try {
        const period = await addPracticePeriod({
          practicePlanId: plan.id,
          name: "New Period",
          durationMin: 15,
        });
        setPeriods((prev) => [
          ...prev,
          {
            id: period.id,
            name: period.name,
            durationMin: period.durationMin,
            sortOrder: period.sortOrder,
            playIds: [],
            notes: null,
          },
        ]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to add period",
        );
      }
    });
  }

  function handleUpdatePeriod(
    id: string,
    field: keyof PeriodData,
    value: string | number | string[],
  ) {
    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function savePeriod(id: string) {
    const period = periods.find((p) => p.id === id);
    if (!period) return;
    startTransition(async () => {
      try {
        await updatePracticePeriod(id, {
          name: period.name,
          durationMin: period.durationMin,
          playIds: period.playIds,
          notes: period.notes,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save period",
        );
      }
    });
  }

  function handleDeletePeriod(id: string) {
    startTransition(async () => {
      try {
        await deletePracticePeriod(id);
        setPeriods((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete period",
        );
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= periods.length) return;

    const prevPeriods = periods;
    const newPeriods = [...periods];
    [newPeriods[index], newPeriods[swapIndex]] = [
      newPeriods[swapIndex],
      newPeriods[index],
    ];
    setPeriods(newPeriods);
    startTransition(async () => {
      try {
        await reorderPracticePeriods(
          plan.id,
          newPeriods.map((p) => p.id),
        );
      } catch (err) {
        setPeriods(prevPeriods);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder periods",
        );
      }
    });
  }

  function handleDeletePlan() {
    startTransition(async () => {
      try {
        await deletePracticePlan(plan.id);
        router.push("/practice");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete plan",
        );
      }
    });
  }

  function togglePlay(periodId: string, playId: string) {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== periodId) return p;
        const has = p.playIds.includes(playId);
        return {
          ...p,
          playIds: has
            ? p.playIds.filter((id) => id !== playId)
            : [...p.playIds, playId],
        };
      }),
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Plan header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            onBlur={savePlanHeader}
            className="text-lg font-bold text-foreground bg-transparent border-transparent hover:border-border focus:border-ring print:border-none"
          />
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              onBlur={savePlanHeader}
              className="w-44"
            />
            <div className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <Clock className="h-3 w-3" />
              {totalDuration} min total
            </div>
          </div>
          <textarea
            value={planNotes}
            onChange={(e) => setPlanNotes(e.target.value)}
            onBlur={savePlanHeader}
            placeholder="Practice notes..."
            rows={2}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground/85 placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none print:border-none"
          />
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmPlanDelete(true)}
            className="text-destructive hover:text-destructive hover:border-destructive/40"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Periods */}
      <div className="space-y-3">
        {periods.map((period, index) => (
          <div
            key={period.id}
            className="rounded-lg border border-border bg-card p-4 space-y-3 print:break-inside-avoid"
          >
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 print:hidden">
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === periods.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Period name */}
              <Input
                value={period.name}
                onChange={(e) =>
                  handleUpdatePeriod(period.id, "name", e.target.value)
                }
                onBlur={() => savePeriod(period.id)}
                className="flex-1 font-medium text-foreground bg-transparent border-transparent hover:border-border focus:border-ring print:border-none"
              />

              {/* Duration */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={period.durationMin}
                  onChange={(e) =>
                    handleUpdatePeriod(
                      period.id,
                      "durationMin",
                      parseInt(e.target.value) || 1,
                    )
                  }
                  onBlur={() => savePeriod(period.id)}
                  className="w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>

              {/* Delete */}
              <button
                onClick={() => setPendingDeletePeriodId(period.id)}
                className="text-muted-foreground hover:text-destructive transition-colors print:hidden"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Notes */}
            <Input
              value={period.notes ?? ""}
              onChange={(e) =>
                handleUpdatePeriod(period.id, "notes", e.target.value)
              }
              onBlur={() => savePeriod(period.id)}
              placeholder="Period notes..."
              className="text-xs text-muted-foreground"
            />

            {/* Play selector */}
            <div className="space-y-2 print:hidden">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Plays ({period.playIds.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availablePlays.map((play) => {
                  const selected = period.playIds.includes(play.id);
                  return (
                    <button
                      key={play.id}
                      onClick={() => {
                        togglePlay(period.id, play.id);
                        // defer save
                        setTimeout(() => savePeriod(period.id), 100);
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground/85"
                      }`}
                    >
                      {play.name}
                    </button>
                  );
                })}
                {availablePlays.length === 0 && (
                  <span className="text-[11px] text-muted-foreground/70">
                    No plays in playbooks yet
                  </span>
                )}
              </div>
            </div>

            {/* Print-friendly play list */}
            {period.playIds.length > 0 && (
              <div className="hidden print:block">
                <p className="text-xs text-muted-foreground">
                  Plays:{" "}
                  {period.playIds
                    .map(
                      (pid) =>
                        availablePlays.find((p) => p.id === pid)?.name ?? pid,
                    )
                    .join(", ")}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add period */}
      <Button
        variant="outline"
        onClick={handleAddPeriod}
        disabled={isPending}
        className="w-full border-dashed print:hidden"
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-1.5 h-4 w-4" />
        )}
        Add Period
      </Button>

      <ConfirmDialog
        open={pendingDeletePeriodId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletePeriodId(null);
        }}
        title="Delete this period?"
        description="This removes the period and its play assignments from the practice plan."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDeletePeriodId) handleDeletePeriod(pendingDeletePeriodId);
        }}
      />

      <ConfirmDialog
        open={confirmPlanDelete}
        onOpenChange={setConfirmPlanDelete}
        title="Delete this practice plan?"
        description="The entire plan and all its periods will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeletePlan}
      />
    </div>
  );
}
