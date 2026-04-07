"use client";

import { useState } from "react";
import { ExternalLink, Film } from "lucide-react";
import {
  formatTimestamp,
  parseTimestamp,
  appendTimestampToUrl,
} from "@/lib/film-utils";

interface FilmLinkProps {
  filmUrl: string;
  filmTimestamp: number | null;
  onFilmUrlChange: (url: string) => void;
  onFilmTimestampChange: (seconds: number | null) => void;
}

export function FilmLinkEditor({
  filmUrl,
  filmTimestamp,
  onFilmUrlChange,
  onFilmTimestampChange,
}: FilmLinkProps) {
  const [tsInput, setTsInput] = useState(
    filmTimestamp ? formatTimestamp(filmTimestamp) : "",
  );

  const handleTimestampBlur = () => {
    if (!tsInput.trim()) {
      onFilmTimestampChange(null);
      return;
    }
    const seconds = parseTimestamp(tsInput);
    onFilmTimestampChange(seconds);
    setTsInput(formatTimestamp(seconds));
  };

  const previewUrl = filmTimestamp
    ? appendTimestampToUrl(filmUrl, filmTimestamp)
    : filmUrl;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400">Film URL</label>
      <input
        type="url"
        value={filmUrl}
        onChange={(e) => onFilmUrlChange(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50"
      />

      <label className="text-xs font-medium text-zinc-400">
        Timestamp (MM:SS)
      </label>
      <input
        type="text"
        value={tsInput}
        onChange={(e) => setTsInput(e.target.value)}
        onBlur={handleTimestampBlur}
        placeholder="2:34"
        className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50"
      />

      {filmUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
        >
          <Film className="h-3.5 w-3.5" />
          {filmTimestamp
            ? `Watch film at ${formatTimestamp(filmTimestamp)}`
            : "Watch film"}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/** Read-only display link for player view */
export function FilmLinkDisplay({
  filmUrl,
  filmTimestamp,
}: {
  filmUrl: string;
  filmTimestamp: number | null;
}) {
  const url = filmTimestamp
    ? appendTimestampToUrl(filmUrl, filmTimestamp)
    : filmUrl;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300"
    >
      <ExternalLink className="h-4 w-4" />
      {filmTimestamp
        ? `Watch film at ${formatTimestamp(filmTimestamp)} \u2192`
        : "Watch film \u2192"}
    </a>
  );
}
