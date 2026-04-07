"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const totalDuration = periods.reduce((sum, p) => sum + p.durationMin, 0);

  function savePlanHeader() {
    startTransition(async () => {
      await updatePracticePlan(plan.id, {
        name: planName,
        date: planDate || null,
        notes: planNotes || null,
      });
    });
  }

  function handleAddPeriod() {
    startTransition(async () => {
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
      await updatePracticePeriod(id, {
        name: period.name,
        durationMin: period.durationMin,
        playIds: period.playIds,
        notes: period.notes,
      });
    });
  }

  function handleDeletePeriod(id: string) {
    startTransition(async () => {
      await deletePracticePeriod(id);
      setPeriods((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const newPeriods = [...periods];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPeriods.length) return;
    [newPeriods[index], newPeriods[swapIndex]] = [
      newPeriods[swapIndex],
      newPeriods[index],
    ];
    setPeriods(newPeriods);
    startTransition(async () => {
      await reorderPracticePeriods(
        plan.id,
        newPeriods.map((p) => p.id),
      );
    });
  }

  function handleDeletePlan() {
    if (!confirm("Delete this practice plan?")) return;
    startTransition(async () => {
      await deletePracticePlan(plan.id);
      router.push("/practice");
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
            className="text-lg font-bold text-white bg-transparent border-transparent hover:border-zinc-700 focus:border-zinc-600 print:border-none"
          />
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              onBlur={savePlanHeader}
              className="w-44"
            />
            <div className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300">
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
            className="w-full rounded-md border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none print:border-none"
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
            onClick={handleDeletePlan}
            className="text-red-400 hover:text-red-300 hover:border-red-800"
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
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 print:break-inside-avoid"
          >
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 print:hidden">
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  className="rounded p-0.5 text-zinc-500 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === periods.length - 1}
                  className="rounded p-0.5 text-zinc-500 hover:text-white disabled:opacity-30"
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
                className="flex-1 font-medium text-white bg-transparent border-transparent hover:border-zinc-700 focus:border-zinc-600 print:border-none"
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
                <span className="text-xs text-zinc-500">min</span>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeletePeriod(period.id)}
                className="text-zinc-500 hover:text-red-400 transition-colors print:hidden"
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
              className="text-xs text-zinc-400"
            />

            {/* Play selector */}
            <div className="space-y-2 print:hidden">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
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
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {play.name}
                    </button>
                  );
                })}
                {availablePlays.length === 0 && (
                  <span className="text-[11px] text-zinc-600">
                    No plays in playbooks yet
                  </span>
                )}
              </div>
            </div>

            {/* Print-friendly play list */}
            {period.playIds.length > 0 && (
              <div className="hidden print:block">
                <p className="text-xs text-zinc-500">
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
    </div>
  );
}
