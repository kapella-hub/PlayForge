"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { PlayToolbar } from "@/components/play/play-toolbar";
import { FormationPicker } from "@/components/play/formation-picker";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import { createEmptyCanvasData } from "@/engine/serialization";
import { getFormationById } from "@/engine/constants";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import type { CanvasData, FormationTemplate, Route } from "@/engine/types";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Pen } from "lucide-react";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false },
);

export default function DesignerPage() {
  const [canvasData, setCanvasData] = useState<CanvasData>(createEmptyCanvasData);
  const [playName, setPlayName] = useState("Untitled Play");
  const [playType, setPlayType] = useState("pass");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [formationPanelOpen, setFormationPanelOpen] = useState(false);

  // Undo / redo stacks
  const undoRef = useRef<CanvasData[]>([]);
  const redoRef = useRef<CanvasData[]>([]);

  const pushHistory = useCallback((data: CanvasData) => {
    undoRef.current = [...undoRef.current.slice(-49), data];
    redoRef.current = []; // clear redo on new action
  }, []);

  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      pushHistory(canvasData);
      setCanvasData(data);
      setDirty(true);
    },
    [canvasData, pushHistory],
  );

  const handleFormationSelect = useCallback(
    (formation: FormationTemplate) => {
      pushHistory(canvasData);
      const newData: CanvasData = {
        players: formation.players.map((p) => ({ ...p })),
        routes: [],
        meta: {
          formation: formation.id,
          playType,
          side: formation.side,
        },
      };
      setCanvasData(newData);
      setSide(formation.side);
      setSelectedPlayerId(null);
      setDrawingRoute(false);
      setDirty(true);
    },
    [canvasData, playType, pushHistory],
  );

  const handleUndo = useCallback(() => {
    if (undoRef.current.length === 0) return;
    const prev = undoRef.current[undoRef.current.length - 1];
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, canvasData];
    setCanvasData(prev);
    setDirty(true);
  }, [canvasData]);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current[redoRef.current.length - 1];
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, canvasData];
    setCanvasData(next);
    setDirty(true);
  }, [canvasData]);

  const handleSave = useCallback(() => {
    setSaving(true);
    console.log("Saving play:", { playName, playType, canvasData });
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 500);
  }, [playName, playType, canvasData]);

  const handleDeleteRoute = useCallback(() => {
    if (!selectedPlayerId) return;
    pushHistory(canvasData);
    setCanvasData({
      ...canvasData,
      routes: canvasData.routes.filter((r) => r.playerId !== selectedPlayerId),
    });
    setDirty(true);
  }, [selectedPlayerId, canvasData, pushHistory]);

  const handleUpdateRouteType = useCallback(
    (type: Route["type"]) => {
      if (!selectedPlayerId) return;
      pushHistory(canvasData);
      setCanvasData({
        ...canvasData,
        routes: canvasData.routes.map((r) =>
          r.playerId === selectedPlayerId ? { ...r, type } : r,
        ),
      });
      setDirty(true);
    },
    [selectedPlayerId, canvasData, pushHistory],
  );

  const handlePlayTypeChange = useCallback((type: string) => {
    setPlayType(type);
    setCanvasData((prev) => ({
      ...prev,
      meta: { ...prev.meta, playType: type },
    }));
    setDirty(true);
  }, []);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts([
    {
      key: "d",
      handler: () => setDrawingRoute((d) => !d),
      ignoreInputs: true,
    },
    {
      key: "v",
      handler: () => setDrawingRoute(false),
      ignoreInputs: true,
    },
    {
      key: "Escape",
      handler: () => {
        if (drawingRoute) {
          setDrawingRoute(false);
        } else if (selectedPlayerId) {
          setSelectedPlayerId(null);
        } else if (formationPanelOpen) {
          setFormationPanelOpen(false);
        }
      },
    },
    {
      key: "z",
      meta: true,
      handler: handleUndo,
    },
    {
      key: "z",
      meta: true,
      shift: true,
      handler: handleRedo,
    },
    {
      key: "s",
      meta: true,
      handler: handleSave,
    },
    {
      key: "Backspace",
      handler: handleDeleteRoute,
      ignoreInputs: true,
    },
    {
      key: "Delete",
      handler: handleDeleteRoute,
      ignoreInputs: true,
    },
    {
      key: "f",
      handler: () => setFormationPanelOpen((v) => !v),
      ignoreInputs: true,
    },
  ]);

  const selectedPlayer =
    canvasData.players.find((p) => p.id === selectedPlayerId) ?? null;
  const selectedRoute = selectedPlayerId
    ? canvasData.routes.find((r) => r.playerId === selectedPlayerId)
    : undefined;

  const formationName =
    getFormationById(canvasData.meta.formation)?.name ??
    canvasData.meta.formation ??
    "";

  const hasFormation = canvasData.players.length > 0;

  return (
    <div className="fixed inset-0 top-16 flex flex-col lg:pl-[240px]">
      {/* ── Canvas area (takes maximum space) ── */}
      <div className="relative flex-1">
        {/* Floating toolbar over canvas */}
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4">
          <PlayToolbar
            name={playName}
            onNameChange={setPlayName}
            formation={formationName}
            playType={playType}
            onPlayTypeChange={handlePlayTypeChange}
            drawingRoute={drawingRoute}
            onToggleDrawing={() => setDrawingRoute((d) => !d)}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            saving={saving}
            dirty={dirty}
            canUndo={undoRef.current.length > 0}
            canRedo={redoRef.current.length > 0}
          />
        </div>

        {/* Drawing mode indicator */}
        <AnimatePresence>
          {drawingRoute && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-20 z-10 flex justify-center"
            >
              <div className="flex items-center gap-2 rounded-full bg-emerald-600/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                <Pen className="h-3 w-3" />
                Drawing Route — Click to add points, Double-click to finish,{" "}
                <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                  Esc
                </kbd>{" "}
                to cancel
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <div className="h-full">
          {hasFormation ? (
            <PlayCanvas
              canvasData={canvasData}
              onChange={handleCanvasChange}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              drawingRoute={drawingRoute}
            />
          ) : (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-8 py-10 text-center">
                <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
                <h3 className="mb-1 text-lg font-semibold text-zinc-300">
                  Select a formation to get started
                </h3>
                <p className="mb-4 text-sm text-zinc-500">
                  Choose from offense or defense formations to place players on the field.
                </p>
                <button
                  onClick={() => setFormationPanelOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-500"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Open Formations
                </button>
                <p className="mt-3 text-[11px] text-zinc-600">
                  or press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">F</kbd>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Collapsible formation panel (overlay from left) ── */}
        <AnimatePresence>
          {formationPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-4 left-4 top-20 z-30 w-64 overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              {/* Side toggle */}
              <div className="mb-3 flex rounded-lg bg-zinc-800/80 p-0.5">
                <button
                  onClick={() => setSide("offense")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    side === "offense"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Offense
                </button>
                <button
                  onClick={() => setSide("defense")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    side === "defense"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Defense
                </button>
              </div>

              <FormationPicker
                side={side}
                selectedId={canvasData.meta.formation}
                onSelect={handleFormationSelect}
                onClose={() => setFormationPanelOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Assignment panel (floating right) ── */}
        {selectedPlayer && (
          <div className="absolute bottom-4 right-4 top-20 z-30 w-64">
            <AssignmentPanel
              player={selectedPlayer}
              route={selectedRoute}
              onClose={() => setSelectedPlayerId(null)}
              onDeleteRoute={handleDeleteRoute}
              onUpdateRouteType={handleUpdateRouteType}
            />
          </div>
        )}

        {/* ── Formation panel toggle button (visible when panel closed) ── */}
        {!formationPanelOpen && hasFormation && (
          <button
            onClick={() => setFormationPanelOpen(true)}
            title="Toggle Formations (F)"
            className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/[0.06] bg-zinc-900/80 p-3 text-zinc-400 shadow-lg backdrop-blur-xl transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
