"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { PlayToolbar } from "@/components/play/play-toolbar";
import { FormationPicker } from "@/components/play/formation-picker";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import { createEmptyCanvasData } from "@/engine/serialization";
import { getFormationById } from "@/engine/constants";
import type { CanvasData, FormationTemplate, Route } from "@/engine/types";

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
  const historyRef = useRef<CanvasData[]>([]);

  const pushHistory = useCallback((data: CanvasData) => {
    historyRef.current = [...historyRef.current.slice(-49), data];
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
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setCanvasData(prev);
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    // Actual save needs playbook context — for now just log
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

  const handlePlayTypeChange = useCallback(
    (type: string) => {
      setPlayType(type);
      setCanvasData((prev) => ({
        ...prev,
        meta: { ...prev.meta, playType: type },
      }));
      setDirty(true);
    },
    [],
  );

  const selectedPlayer =
    canvasData.players.find((p) => p.id === selectedPlayerId) ?? null;
  const selectedRoute = selectedPlayerId
    ? canvasData.routes.find((r) => r.playerId === selectedPlayerId)
    : undefined;

  const formationName =
    getFormationById(canvasData.meta.formation)?.name ??
    canvasData.meta.formation ??
    "";

  return (
    <div className="fixed inset-0 top-16 flex flex-col lg:pl-[240px]">
      {/* Toolbar */}
      <div className="shrink-0 px-4 pt-4">
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
          saving={saving}
          dirty={dirty}
        />
      </div>

      {/* 3-column layout */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Left: Formation Picker */}
        <div className="hidden w-52 shrink-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 lg:block">
          {/* Side toggle */}
          <div className="mb-3 flex rounded-lg bg-zinc-800 p-0.5">
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
          />
        </div>

        {/* Center: Canvas */}
        <div className="min-w-0 flex-1">
          <PlayCanvas
            canvasData={canvasData}
            onChange={handleCanvasChange}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            drawingRoute={drawingRoute}
          />
        </div>

        {/* Right: Assignment Panel */}
        {selectedPlayer && (
          <div className="w-60 shrink-0">
            <AssignmentPanel
              player={selectedPlayer}
              route={selectedRoute}
              onClose={() => setSelectedPlayerId(null)}
              onDeleteRoute={handleDeleteRoute}
              onUpdateRouteType={handleUpdateRouteType}
            />
          </div>
        )}
      </div>
    </div>
  );
}
