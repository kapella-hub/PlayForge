"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateQuiz, deleteQuiz } from "@/lib/actions/quiz-actions";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

export function QuizDetailClient({
  quizId,
  initialName,
}: {
  quizId: string;
  initialName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [deleting, startDelete] = useTransition();

  function handleSaveName() {
    const next = draftName.trim();
    if (!next || next === name) {
      setEditing(false);
      setDraftName(name);
      return;
    }
    startSaveName(async () => {
      try {
        await updateQuiz(quizId, { name: next });
        setName(next);
        setEditing(false);
        toast.success("Quiz renamed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename quiz");
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteQuiz(quizId);
        toast.success("Quiz deleted");
        router.push("/quizzes"); // navigation tears down the dialog
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete quiz");
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-1 items-center justify-between gap-3">
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") {
                setDraftName(name);
                setEditing(false);
              }
            }}
            className="max-w-sm"
            autoFocus
          />
          <button
            onClick={handleSaveName}
            disabled={savingName}
            aria-label="Save name"
            className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {savingName ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => {
              setDraftName(name);
              setEditing(false);
            }}
            aria-label="Cancel rename"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-white">{name}</h1>
          <button
            onClick={() => {
              setDraftName(name);
              setEditing(true);
            }}
            aria-label="Rename quiz"
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete quiz?"
        description={`This permanently deletes "${name}" and all of its questions and attempts. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
