"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getTeamFiles,
  createTeamFile,
  updateTeamFile,
  deleteTeamFile,
} from "@/lib/actions/team-file-actions";
import {
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  FileText,
  Calendar,
  Target,
  Video,
  Link2,
  ArrowLeft,
  Check,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────

interface TeamFile {
  id: string;
  title: string;
  url: string;
  category: FileCategory;
}

type FileCategory = "rules" | "schedule" | "goals" | "video" | "other";

const FILE_CATEGORIES: {
  value: FileCategory;
  label: string;
  icon: typeof FileText;
}[] = [
  { value: "rules", label: "Team Rules", icon: FileText },
  { value: "schedule", label: "Schedule", icon: Calendar },
  { value: "goals", label: "Goals / Mission", icon: Target },
  { value: "video", label: "Video", icon: Video },
  { value: "other", label: "Other", icon: Link2 },
];

function normalizeCategory(value: string): FileCategory {
  return (
    FILE_CATEGORIES.find((c) => c.value === value)?.value ?? "other"
  );
}

// ── Component ──────────────────────────────────────────────────────

export default function TeamFilesPage() {
  const toast = useToast();
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<FileCategory>("rules");
  const [adding, startAdd] = useTransition();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingEdit, startSaveEdit] = useTransition();

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await getTeamFiles();
      setFiles(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          category: normalizeCategory(r.category),
        })),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    startAdd(async () => {
      try {
        const created = await createTeamFile({
          title: newTitle.trim(),
          url: newUrl.trim(),
          category: newCategory,
        });
        setFiles((prev) => [
          {
            id: created.id,
            title: created.title,
            url: created.url,
            category: normalizeCategory(created.category),
          },
          ...prev,
        ]);
        setNewTitle("");
        setNewUrl("");
        setNewCategory("rules");
        setShowAdd(false);
        toast.success("Link added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add link");
      }
    });
  }, [newTitle, newUrl, newCategory, toast]);

  const confirmDelete = useCallback(() => {
    const id = confirmDeleteId;
    if (!id) return;
    const previous = files;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setConfirmDeleteId(null);
    startSaveEdit(async () => {
      try {
        await deleteTeamFile(id);
        toast.success("Link deleted");
      } catch (err) {
        setFiles(previous); // revert
        toast.error(
          err instanceof Error ? err.message : "Failed to delete link",
        );
      }
    });
  }, [confirmDeleteId, files, toast]);

  const fileToDelete = files.find((f) => f.id === confirmDeleteId) ?? null;

  const startEdit = useCallback((file: TeamFile) => {
    setEditingId(file.id);
    setEditTitle(file.title);
    setEditUrl(file.url);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editTitle.trim() || !editUrl.trim()) return;
    const id = editingId;
    const title = editTitle.trim();
    const url = editUrl.trim();
    startSaveEdit(async () => {
      try {
        await updateTeamFile(id, { title, url });
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, title, url } : f)),
        );
        setEditingId(null);
        toast.success("Link updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update link",
        );
      }
    });
  }, [editingId, editTitle, editUrl, toast]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Group by category
  const grouped = FILE_CATEGORIES.map((cat) => ({
    ...cat,
    files: files.filter((f) => f.category === cat.value),
  })).filter((g) => g.files.length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/settings"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Team Files</h1>
          <p className="text-sm text-zinc-500">
            Manage links to team documents, schedules, and videos.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={loading}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 py-16">
          <p className="text-sm text-red-400">Couldn&apos;t load team files.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {/* Add form */}
      {!loading && !loadError && showAdd && (
        <Card className="mb-6 border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Team Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 sm:pt-0">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FILE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setNewCategory(cat.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      newCategory === cat.value
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Label
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Team Handbook 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                URL
              </label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || !newTitle.trim() || !newUrl.trim()}
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Add Link"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !loadError && files.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
          <Link2 className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">No team files yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add links to team rules, schedules, goals, and videos.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Your First Link
          </Button>
        </div>
      )}

      {/* File list grouped by category */}
      {!loading && !loadError && (
        <div className="space-y-6">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-zinc-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {group.label}
                  </h3>
                </div>
                <div className="space-y-2">
                  {group.files.map((file) => (
                    <Card key={file.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        {editingId === file.id ? (
                          <>
                            <div className="flex min-w-0 flex-1 gap-2">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <Input
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <button
                              onClick={saveEdit}
                              disabled={savingEdit}
                              className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                              aria-label="Save"
                            >
                              {savingEdit ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-200">
                                {file.title}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {file.url}
                              </p>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                              title="Open link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => startEdit(file)}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(file.id)}
                              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete link?"
        description={
          fileToDelete
            ? `This removes "${fileToDelete.title}" from your team files.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
