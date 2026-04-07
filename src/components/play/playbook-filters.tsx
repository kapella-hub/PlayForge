"use client";

import { useState, useMemo } from "react";
import { PlayCard } from "./play-card";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

interface Play {
  id: string;
  name: string;
  formation: string;
  playType: string;
  thumbnailUrl: string | null;
  situationTags: string[];
  createdAt: Date;
}

interface PlaybookFiltersProps {
  plays: Play[];
  playbookId: string;
}

const PLAY_TYPES = [
  { value: "all", label: "All" },
  { value: "run", label: "Run" },
  { value: "pass", label: "Pass" },
  { value: "play_action", label: "PA" },
  { value: "screen", label: "Screen" },
] as const;

type SortKey = "name" | "createdAt" | "formation";

export function PlaybookFilters({ plays, playbookId }: PlaybookFiltersProps) {
  const [search, setSearch] = useState("");
  const [playTypeFilter, setPlayTypeFilter] = useState("all");
  const [formationFilter, setFormationFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");

  // Derive unique formations and tags from plays
  const formations = useMemo(() => {
    const set = new Set(plays.map((p) => p.formation).filter(Boolean));
    return Array.from(set).sort();
  }, [plays]);

  const allTags = useMemo(() => {
    const set = new Set(plays.flatMap((p) => p.situationTags ?? []));
    return Array.from(set).sort();
  }, [plays]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = plays;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Play type
    if (playTypeFilter !== "all") {
      result = result.filter((p) => p.playType === playTypeFilter);
    }

    // Formation
    if (formationFilter !== "all") {
      result = result.filter((p) => p.formation === formationFilter);
    }

    // Tags (AND: play must have ALL selected tags)
    if (tagFilter.length > 0) {
      result = result.filter((p) =>
        tagFilter.every((t) => (p.situationTags ?? []).includes(t)),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "formation") return a.formation.localeCompare(b.formation);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [plays, search, playTypeFilter, formationFilter, tagFilter, sortBy]);

  const toggleTag = (tag: string) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plays..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500/50"
            />
          </div>

          {/* Formation filter */}
          {formations.length > 1 && (
            <select
              value={formationFilter}
              onChange={(e) => setFormationFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none transition-colors focus:border-indigo-500/50"
            >
              <option value="all">All Formations</option>
              {formations.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-2 text-sm text-zinc-300 outline-none transition-colors focus:border-indigo-500/50"
            >
              <option value="createdAt">Newest</option>
              <option value="name">Name</option>
              <option value="formation">Formation</option>
            </select>
          </div>
        </div>

        {/* Row 2: Play type buttons + tags */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          <div className="flex rounded-lg bg-zinc-800/80 p-0.5">
            {PLAY_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setPlayTypeFilter(pt.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  playTypeFilter === pt.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>

          {/* Situation tags */}
          {allTags.length > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-700/50" />
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    tagFilter.includes(tag)
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Results count */}
      {plays.length > 0 && (
        <p className="mb-3 text-xs text-zinc-600">
          {filtered.length} of {plays.length} play{plays.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Play grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12">
          <p className="text-sm text-zinc-500">No plays match your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setPlayTypeFilter("all");
              setFormationFilter("all");
              setTagFilter([]);
            }}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((play) => (
            <PlayCard
              key={play.id}
              id={play.id}
              name={play.name}
              formation={play.formation}
              playType={play.playType}
              thumbnailUrl={play.thumbnailUrl}
              playbookId={playbookId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
