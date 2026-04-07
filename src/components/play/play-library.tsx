"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, Download } from "lucide-react";
import {
  PLAY_LIBRARY,
  getAllPlayCategories,
  type PlayTemplate,
} from "@/engine/plays-library";

interface PlayLibraryProps {
  onImportPlay: (template: PlayTemplate) => void;
  isOpen: boolean;
  onClose: () => void;
}

/** Readable label for category slugs */
function categoryLabel(cat: string): string {
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Badge color by play type */
function playTypeBadge(type: PlayTemplate["playType"]): string {
  switch (type) {
    case "pass":
      return "bg-blue-500/20 text-blue-300";
    case "run":
      return "bg-emerald-500/20 text-emerald-300";
    case "play_action":
      return "bg-amber-500/20 text-amber-300";
    case "screen":
      return "bg-purple-500/20 text-purple-300";
    case "special":
      return "bg-pink-500/20 text-pink-300";
    default:
      return "bg-zinc-500/20 text-zinc-300";
  }
}

export function PlayLibrary({ onImportPlay, isOpen, onClose }: PlayLibraryProps) {
  const categories = useMemo(() => getAllPlayCategories(), []);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const plays = useMemo(() => {
    let pool = activeCategory
      ? PLAY_LIBRARY.filter((p) => p.category === activeCategory)
      : PLAY_LIBRARY;
    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.formation.toLowerCase().includes(q),
    );
  }, [activeCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Play Library</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative px-5 pt-3">
          <Search className="absolute left-7.5 top-1/2 h-3.5 w-3.5 translate-y-0 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plays..."
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/50"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 px-5 pt-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === null
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
              )}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Play grid */}
        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {plays.map((play) => (
            <div
              key={play.id}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-800/60 hover:shadow-lg"
            >
              <div>
                <span className="block truncate text-xs font-semibold text-zinc-200 group-hover:text-white">
                  {play.name}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  {play.formation}
                </span>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                  {play.description}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    playTypeBadge(play.playType),
                  )}
                >
                  {play.playType.replace("_", " ")}
                </span>
                <button
                  onClick={() => onImportPlay(play)}
                  className="flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-1 text-[10px] font-medium text-indigo-300 transition-colors hover:bg-indigo-500/30"
                >
                  <Download className="h-3 w-3" />
                  Import
                </button>
              </div>
            </div>
          ))}
          {plays.length === 0 && (
            <p className="col-span-full py-8 text-center text-xs text-zinc-600">
              No plays found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
