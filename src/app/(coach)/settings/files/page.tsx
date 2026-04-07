"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────

interface TeamFile {
  id: string;
  label: string;
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

const STORAGE_KEY = "playforge_team_files";

function loadFiles(): TeamFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFiles(files: TeamFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

let nextId = 1;
function generateId() {
  return `tf-${Date.now()}-${nextId++}`;
}

function getCategoryMeta(cat: FileCategory) {
  return FILE_CATEGORIES.find((c) => c.value === cat) ?? FILE_CATEGORIES[4];
}

// ── Component ──────────────────────────────────────────────────────

export default function TeamFilesPage() {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState<FileCategory>("rules");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  useEffect(() => {
    setFiles(loadFiles());
    setLoaded(true);
  }, []);

  const persist = useCallback((updated: TeamFile[]) => {
    setFiles(updated);
    saveFiles(updated);
  }, []);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const file: TeamFile = {
      id: generateId(),
      label: newLabel.trim(),
      url: newUrl.trim(),
      category: newCategory,
    };
    persist([...files, file]);
    setNewLabel("");
    setNewUrl("");
    setNewCategory("rules");
    setShowAdd(false);
  }, [newLabel, newUrl, newCategory, files, persist]);

  const handleDelete = useCallback(
    (id: string) => {
      persist(files.filter((f) => f.id !== id));
    },
    [files, persist],
  );

  const startEdit = useCallback((file: TeamFile) => {
    setEditingId(file.id);
    setEditLabel(file.label);
    setEditUrl(file.url);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || !editLabel.trim() || !editUrl.trim()) return;
    persist(
      files.map((f) =>
        f.id === editingId
          ? { ...f, label: editLabel.trim(), url: editUrl.trim() }
          : f,
      ),
    );
    setEditingId(null);
  }, [editingId, editLabel, editUrl, files, persist]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Group by category
  const grouped = FILE_CATEGORIES.map((cat) => ({
    ...cat,
    files: files.filter((f) => f.category === cat.value),
  })).filter((g) => g.files.length > 0);

  if (!loaded) return null;

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
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="mb-6 border-indigo-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Team Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
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
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newLabel.trim() || !newUrl.trim()}
              >
                Add Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {files.length === 0 && !showAdd && (
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
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
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
                            className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-zinc-800"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {file.label}
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
                            onClick={() => handleDelete(file.id)}
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
    </div>
  );
}
