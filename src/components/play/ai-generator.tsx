"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, Check } from "lucide-react";
import type { CanvasData } from "@/engine/types";
import { FORMATIONS } from "@/engine/constants";

const EXAMPLE_PROMPTS = [
  "Play action bootleg with corner route and flat",
  "Four verticals from shotgun",
  "Inside zone from I-formation",
  "Screen pass to the RB",
  "Slant-flat combo with deep post clearout",
  "Trips right with bubble screen",
];

interface AIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (canvasData: CanvasData, playName: string) => void;
  gameFormat?: string;
}

export function AIGenerator({
  isOpen,
  onClose,
  onApply,
  gameFormat,
}: AIGeneratorProps) {
  const [description, setDescription] = useState("");
  const [formation, setFormation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CanvasData | null>(null);

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/generate-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          side: "offense",
          formation: formation || undefined,
          gameFormat: gameFormat || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate play");
      }

      const data = await res.json();
      setResult(data.canvasData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    // Use description as the play name, truncated
    const name = description.trim().slice(0, 40) || "AI Generated Play";
    onApply(result, name);
    setResult(null);
    setDescription("");
    onClose();
  }

  const offenseFormations = FORMATIONS.filter((f) => f.side === "offense");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-4 left-4 top-20 z-30 flex w-80 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                AI Play Generator
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Description input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Describe your play
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Play action bootleg with corner route and flat..."
                rows={3}
                className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-violet-500/50 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Formation selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Formation (optional)
              </label>
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 outline-none transition-colors focus:border-violet-500/50"
              >
                <option value="">Auto-select</option>
                {offenseFormations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-colors hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Play
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Result preview */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Play generated
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {result.players.length} players, {result.routes.length}{" "}
                    routes
                    {result.meta.formation
                      ? ` \u00b7 ${result.meta.formation}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={handleApply}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-500"
                >
                  Apply to Canvas
                </button>
              </motion.div>
            )}

            {/* Example prompts */}
            {!result && !loading && (
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  Try these
                </p>
                <div className="space-y-1.5">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setDescription(prompt)}
                      className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-zinc-800 px-4 py-2">
            <p className="text-[10px] text-zinc-600">
              <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-500">
                {"\u2318"}Enter
              </kbd>{" "}
              to generate &middot;{" "}
              <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-500">
                A
              </kbd>{" "}
              to toggle panel
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
