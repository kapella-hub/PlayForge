"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { PlayToolbar } from "@/components/play/play-toolbar";
import { FormationPicker } from "@/components/play/formation-picker";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import { RoutePicker } from "@/components/play/route-picker";
import { PlayLibrary } from "@/components/play/play-library";
import { PrintLayout } from "@/components/play/print-layout";
import { AnimationControls } from "@/components/play/animation-controls";
import { AIGenerator } from "@/components/play/ai-generator";
import { FilmLinkEditor } from "@/components/play/film-link";
import { VersionHistory } from "@/components/play/version-history";
import { createEmptyCanvasData } from "@/engine/serialization";
import { mirrorPlay } from "@/engine/mirror";
import { getFormationById } from "@/engine/constants";
import { applyRouteTemplate, getRouteById } from "@/engine/routes-library";
import { getPlay, createPlay, updatePlay } from "@/lib/actions/play-actions";
import { deserializeCanvas } from "@/engine/serialization";
import { useToast } from "@/components/ui/toast";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { generateKeyframes } from "@/engine/animation-engine";
import { exportPlayAsImage, getStageDataURL } from "@/engine/export";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import type { CanvasData, FormationTemplate, Route, AnimationData, MotionPath } from "@/engine/types";
import type { AnimationState } from "@/engine/animation-engine";
import type { PlayCanvasHandle } from "@/engine/play-canvas";
import type { RouteTemplate } from "@/engine/routes-library";
import type { PlayTemplate } from "@/engine/plays-library";
import type { GameFormat } from "@/engine/constants";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Pen,
  BookOpen,
  Route as RouteIcon,
  Printer,
  X,
  MoveRight,
  Sparkles,
  Film,
} from "lucide-react";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false },
);

export default function DesignerPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [canvasData, setCanvasData] = useState<CanvasData>(createEmptyCanvasData);
  const [playName, setPlayName] = useState("Untitled Play");
  const [playType, setPlayType] = useState("pass");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [formationPanelOpen, setFormationPanelOpen] = useState(false);

  // Motion mode state
  const [motionMode, setMotionMode] = useState(false);
  const [motionPlayerId, setMotionPlayerId] = useState<string | null>(null);

  // New state for route picker, play library, game format, print
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [playLibraryOpen, setPlayLibraryOpen] = useState(false);
  const [gameFormat, setGameFormat] = useState<GameFormat>("11v11");
  const [printPanelOpen, setPrintPanelOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"playbook" | "wristband">("playbook");
  const [printImageUrl, setPrintImageUrl] = useState<string | null>(null);

  // AI generator state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Version history state
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Film link state
  const [filmUrl, setFilmUrl] = useState("");
  const [filmTimestamp, setFilmTimestamp] = useState<number | null>(null);
  const [filmPanelOpen, setFilmPanelOpen] = useState(false);

  // Coverage overlay state
  const [coverageOverlay, setCoverageOverlay] = useState<string>("");
  const canvasRef = useRef<PlayCanvasHandle>(null);

  // Draft restore state
  const [draftKey, setDraftKey] = useState<string | null>(null);

  // Load existing play if playId search param is present
  useEffect(() => {
    const playId = searchParams.get("playId");
    if (!playId) return;
    let cancelled = false;
    getPlay(playId)
      .then((play) => {
        if (cancelled || !play) return;
        const canvas = deserializeCanvas(play.canvasData);
        setCanvasData(canvas);
        setPlayName(play.name);
        setPlayType(play.playType);
        if (canvas.meta.side) setSide(canvas.meta.side as "offense" | "defense");
        if (play.filmUrl) setFilmUrl(play.filmUrl);
        if (play.filmTimestamp) setFilmTimestamp(play.filmTimestamp);
        setDirty(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Couldn't load this play. It may have been deleted.");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Offer to restore a saved draft when opening the designer with no target
  useEffect(() => {
    if (searchParams.get("playId") || searchParams.get("playbookId")) return;
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("playforge-draft-"),
    );
    if (keys.length === 0) return;
    keys.sort();
    setDraftKey(keys[keys.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation preview state
  const [previewMode, setPreviewMode] = useState(false);
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState | null>(null);

  const handleTogglePreview = useCallback(() => {
    if (previewMode) {
      // Exit preview
      setPreviewMode(false);
      setAnimationData(null);
      setAnimationState(null);
    } else {
      // Enter preview: generate keyframes from current canvas
      if (canvasData.players.length === 0) return;
      const data = generateKeyframes(canvasData);
      setAnimationData(data);
      setPreviewMode(true);
      setDrawingRoute(false);
      setSelectedPlayerId(null);
    }
  }, [previewMode, canvasData]);

  const handleAnimationFrame = useCallback((state: AnimationState) => {
    setAnimationState(state);
  }, []);

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
        motions: [],
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
      setMotionMode(false);
      setFormationPanelOpen(false);
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

  const handleMirror = useCallback(() => {
    if (canvasData.players.length === 0) return;
    pushHistory(canvasData);
    setCanvasData(mirrorPlay(canvasData));
    setDirty(true);
  }, [canvasData, pushHistory]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const playId = searchParams.get("playId");
      const playbookId = searchParams.get("playbookId");
      const formation = canvasData.meta.formation ?? "";
      const situationTags = (canvasData.meta as Record<string, unknown>).situationTags as string[] | undefined;

      if (playId) {
        // Editing existing play
        await updatePlay(playId, {
          name: playName,
          formation,
          playType: playType as "run" | "pass" | "play_action" | "screen" | "special",
          canvasData: JSON.parse(JSON.stringify(canvasData)),
          situationTags,
          filmUrl: filmUrl || null,
          filmTimestamp: filmTimestamp ?? null,
        });
        toast.success("Play saved");
      } else if (playbookId) {
        // Creating new play in a playbook
        await createPlay({
          playbookId,
          name: playName,
          formation,
          playType: playType as "run" | "pass" | "play_action" | "screen" | "special",
          canvasData,
        });
        toast.success("Play created");
      } else {
        // No playbook context — save to localStorage as fallback.
        // Cap stored drafts: keep only the one we are about to write.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("playforge-draft-"))
          .forEach((k) => localStorage.removeItem(k));
        const key = `playforge-draft-${Date.now()}`;
        localStorage.setItem(
          key,
          JSON.stringify({ name: playName, playType, canvasData }),
        );
        setDraftKey(null);
        toast.info("No playbook selected. Draft saved to browser storage.");
      }
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save play");
    } finally {
      setSaving(false);
    }
  }, [playName, playType, canvasData, searchParams, toast, filmUrl, filmTimestamp]);

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

  const handleUpdateRouteTypeName = useCallback(
    (playerId: string, routeType: string) => {
      pushHistory(canvasData);
      setCanvasData({
        ...canvasData,
        routes: canvasData.routes.map((r) =>
          r.playerId === playerId ? { ...r, routeType } : r,
        ),
      });
      setDirty(true);
    },
    [canvasData, pushHistory],
  );

  const handlePlayTypeChange = useCallback((type: string) => {
    setPlayType(type);
    setCanvasData((prev) => ({
      ...prev,
      meta: { ...prev.meta, playType: type },
    }));
    setDirty(true);
  }, []);

  // ── Route picker handler ──
  const handleRouteSelect = useCallback(
    (template: RouteTemplate) => {
      if (!selectedPlayerId) return;
      const player = canvasData.players.find((p) => p.id === selectedPlayerId);
      if (!player) return;

      pushHistory(canvasData);
      const waypoints = applyRouteTemplate(player.x, player.y, template);
      const newRoute: Route = {
        playerId: selectedPlayerId,
        waypoints,
        type: template.category === "block" ? "thick" : "solid",
        routeType: template.name,
      };

      setCanvasData({
        ...canvasData,
        routes: [
          ...canvasData.routes.filter((r) => r.playerId !== selectedPlayerId),
          newRoute,
        ],
      });
      setRoutePickerOpen(false);
      setDirty(true);
    },
    [selectedPlayerId, canvasData, pushHistory],
  );

  // ── Play library import handler ──
  const handleImportPlay = useCallback(
    (template: PlayTemplate) => {
      const formation = getFormationById(template.formation);
      if (!formation) return;

      pushHistory(canvasData);

      const players = formation.players.map((p) => ({ ...p }));
      const routes: Route[] = [];

      for (const routeAssignment of template.routes) {
        const player = players.find((p) => p.id === routeAssignment.playerId);
        const routeTemplate = getRouteById(routeAssignment.routeId);
        if (!player || !routeTemplate) continue;

        const waypoints = applyRouteTemplate(player.x, player.y, routeTemplate);
        routes.push({
          playerId: routeAssignment.playerId,
          waypoints,
          type: routeAssignment.lineType ?? "solid",
          routeType: routeTemplate.name,
        });
      }

      const newData: CanvasData = {
        players,
        routes,
        motions: [],
        meta: {
          formation: formation.id,
          playType: template.playType,
          side: formation.side,
        },
      };

      setCanvasData(newData);
      setPlayName(template.name);
      setPlayType(template.playType);
      setSide(formation.side);
      setSelectedPlayerId(null);
      setDrawingRoute(false);
      setPlayLibraryOpen(false);
      setDirty(true);
    },
    [canvasData, pushHistory],
  );

  // ── AI play apply handler ──
  const handleAIApply = useCallback(
    (aiCanvasData: CanvasData, name: string) => {
      pushHistory(canvasData);
      setCanvasData(aiCanvasData);
      setPlayName(name);
      setPlayType(aiCanvasData.meta.playType || "pass");
      setSide(aiCanvasData.meta.side || "offense");
      setSelectedPlayerId(null);
      setDrawingRoute(false);
      setDirty(true);
    },
    [canvasData, pushHistory],
  );

  // ── Export handler ──
  const handleExport = useCallback(() => {
    const handle = canvasRef.current;
    if (!handle) return;
    const stageRef = handle.getStageRef();
    exportPlayAsImage(stageRef, playName);
  }, [playName]);

  // ── Print handler ──
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Open print dialog: snapshot the live canvas as a PNG for the layout ──
  const handleOpenPrint = useCallback(() => {
    const handle = canvasRef.current;
    setPrintImageUrl(handle ? getStageDataURL(handle.getStageRef()) : null);
    setPrintPanelOpen(true);
  }, []);

  const handleRestoreDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          name?: string;
          playType?: string;
          canvasData?: unknown;
        };
        const canvas = deserializeCanvas(draft.canvasData);
        setCanvasData(canvas);
        setPlayName(draft.name ?? "Untitled Play");
        setPlayType(draft.playType ?? "pass");
        if (canvas.meta.side) setSide(canvas.meta.side as "offense" | "defense");
        setDirty(true);
        localStorage.removeItem(draftKey);
      } else {
        toast.error("Draft is no longer available");
      }
    } catch {
      toast.error("Couldn't restore draft.");
    }
    setDraftKey(null);
  }, [draftKey, toast]);

  const handleDismissDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
    setDraftKey(null);
  }, [draftKey]);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts([
    {
      key: "d",
      handler: () => {
        setDrawingRoute((d) => !d);
        setMotionMode(false);
        setMotionPlayerId(null);
      },
      ignoreInputs: true,
    },
    {
      key: "v",
      handler: () => setDrawingRoute(false),
      ignoreInputs: true,
    },
    {
      key: "m",
      handler: () => {
        if (!hasFormation || previewMode) return;
        setMotionMode((m) => !m);
        if (!motionMode) {
          setDrawingRoute(false);
        }
        setMotionPlayerId(null);
      },
      ignoreInputs: true,
    },
    {
      key: "h",
      handler: handleMirror,
      ignoreInputs: true,
    },
    {
      key: "a",
      handler: () => setAiPanelOpen((v) => !v),
      ignoreInputs: true,
    },
    {
      key: "Escape",
      ignoreInputs: true,
      handler: () => {
        if (aiPanelOpen) {
          setAiPanelOpen(false);
        } else if (routePickerOpen) {
          setRoutePickerOpen(false);
        } else if (playLibraryOpen) {
          setPlayLibraryOpen(false);
        } else if (printPanelOpen) {
          setPrintPanelOpen(false);
        } else if (motionMode) {
          setMotionMode(false);
          setMotionPlayerId(null);
        } else if (drawingRoute) {
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
      ignoreInputs: true,
    },
    {
      key: "z",
      meta: true,
      shift: true,
      handler: handleRedo,
      ignoreInputs: true,
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
    {
      key: "r",
      handler: () => {
        if (selectedPlayerId && canvasData.players.length > 0) {
          setRoutePickerOpen((v) => !v);
        }
      },
      ignoreInputs: true,
    },
    {
      key: "l",
      handler: () => setPlayLibraryOpen((v) => !v),
      ignoreInputs: true,
    },
    {
      key: "p",
      handler: () => {
        if (canvasData.players.length > 0) {
          handleTogglePreview();
        }
      },
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

  const printPlays = [
    {
      name: playName,
      formation: formationName,
      canvasData: printImageUrl ?? "",
      notes: canvasData.routes
        .map((r) => {
          const player = canvasData.players.find((p) => p.id === r.playerId);
          return player ? `${player.label}: ${r.routeType ?? "Custom Route"}` : null;
        })
        .filter(Boolean)
        .join("\n"),
    },
  ];

  return (
    <div className="fixed inset-0 top-16 flex flex-col xl:pl-[240px]" data-print-hide>
      {/* ── Canvas area (takes maximum space) ── */}
      <div className="relative flex-1">
        {/* Floating toolbar over canvas */}
        <div className="absolute inset-x-0 top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4">
          <PlayToolbar
            name={playName}
            onNameChange={setPlayName}
            formation={formationName}
            playType={playType}
            onPlayTypeChange={handlePlayTypeChange}
            drawingRoute={drawingRoute}
            onToggleDrawing={() => {
              setDrawingRoute((d) => !d);
              setMotionMode(false);
              setMotionPlayerId(null);
            }}
            motionMode={motionMode}
            onToggleMotion={() => {
              if (!hasFormation || previewMode) return;
              setMotionMode((m) => !m);
              if (!motionMode) setDrawingRoute(false);
              setMotionPlayerId(null);
            }}
            previewMode={previewMode}
            onTogglePreview={handleTogglePreview}
            hasFormation={hasFormation}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            saving={saving}
            dirty={dirty}
            canUndo={undoRef.current.length > 0}
            canRedo={redoRef.current.length > 0}
            coverageOverlay={coverageOverlay}
            onCoverageChange={setCoverageOverlay}
            onMirror={handleMirror}
            onExport={handleExport}
            onOpenLibrary={() => setPlayLibraryOpen(true)}
            onOpenAI={() => setAiPanelOpen((v) => !v)}
            onOpenPrint={handleOpenPrint}
            gameFormat={gameFormat}
            onGameFormatChange={setGameFormat}
            showHistory={!!searchParams.get("playId")}
            versionHistoryOpen={versionHistoryOpen}
            onToggleHistory={() => setVersionHistoryOpen((v) => !v)}
          />
        </div>

        {/* Draft restore banner */}
        {draftKey && (
          <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-3">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm">
              <span>Restore your unsaved draft?</span>
              <button
                onClick={handleRestoreDraft}
                className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Restore
              </button>
              <button
                onClick={handleDismissDraft}
                className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Drawing mode indicator */}
        <AnimatePresence>
          {drawingRoute && !previewMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-24 z-10 flex justify-center px-3"
            >
              <div className="flex max-w-full items-center gap-2 rounded-full bg-primary/90 px-4 py-1.5 text-center text-xs font-medium text-primary-foreground shadow-lg backdrop-blur-sm">
                <Pen className="h-3 w-3" />
                Drawing Route — Click to add points, Double-click to finish,{" "}
                <kbd className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                  Esc
                </kbd>{" "}
                to cancel
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Motion mode indicator */}
        <AnimatePresence>
          {motionMode && !previewMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-24 z-10 flex justify-center px-3"
            >
              <div className="flex max-w-full items-center gap-2 rounded-full bg-accent/90 px-4 py-1.5 text-center text-xs font-medium text-accent-foreground shadow-lg backdrop-blur-sm">
                <MoveRight className="h-3 w-3" />
                {motionPlayerId
                  ? "Click the field to set motion destination"
                  : "Click a player to set as motion man"
                }
                {" "}
                <kbd className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
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
              ref={canvasRef}
              canvasData={canvasData}
              onChange={handleCanvasChange}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              drawingRoute={previewMode ? false : drawingRoute}
              readOnly={previewMode}
              animationState={animationState}
              motionMode={previewMode ? false : motionMode}
              motionPlayerId={motionPlayerId}
              onMotionPlayerSelect={setMotionPlayerId}
              coverageOverlay={coverageOverlay || undefined}
            />
          ) : (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="rounded-2xl border border-dashed border-border bg-card px-8 py-10 text-center">
                <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-muted-foreground/70" />
                <h3 className="mb-1 text-lg font-semibold text-foreground/85">
                  Select a formation to get started
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Choose from offense or defense formations to place players on the field.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => setFormationPanelOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition-colors hover:bg-primary/90"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Open Formations
                  </button>
                  <button
                    onClick={() => setPlayLibraryOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <BookOpen className="h-4 w-4" />
                    Play Library
                  </button>
                </div>
                <button
                    onClick={() => setAiPanelOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 hover:text-accent"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Generator
                  </button>
                <p className="mt-3 text-[11px] text-muted-foreground/70">
                  or press{" "}
                  <kbd className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">F</kbd>
                  {" "}for formations,{" "}
                  <kbd className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">L</kbd>
                  {" "}for play library,{" "}
                  <kbd className="rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">A</kbd>
                  {" "}for AI
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
              className="absolute inset-x-3 bottom-3 top-24 z-30 overflow-hidden rounded-[24px] border border-border bg-card p-4 shadow-2xl backdrop-blur-xl sm:left-4 sm:right-auto sm:w-72"
            >
              {/* Side toggle */}
              <SegmentedControl
                size="sm"
                ariaLabel="Formation side"
                className="mb-3 w-full"
                value={side}
                onChange={setSide}
                options={[
                  { value: "offense", label: "Offense" },
                  { value: "defense", label: "Defense" },
                ]}
              />

              <FormationPicker
                side={side}
                selectedId={canvasData.meta.formation}
                onSelect={handleFormationSelect}
                onClose={() => setFormationPanelOpen(false)}
                gameFormat={gameFormat}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Generator panel ── */}
        <AIGenerator
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          onApply={handleAIApply}
          gameFormat={gameFormat}
        />

        {/* ── Version History panel ── */}
        {searchParams.get("playId") && (
          <VersionHistory
            playId={searchParams.get("playId")!}
            isOpen={versionHistoryOpen}
            onClose={() => setVersionHistoryOpen(false)}
            onRestore={(canvasData) => {
              const canvas = deserializeCanvas(canvasData);
              pushHistory(canvasData as CanvasData);
              setCanvasData(canvas);
              setDirty(true);
            }}
          />
        )}

        {/* ── Animation controls (floating bottom) ── */}
        <AnimatePresence>
          {previewMode && animationData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 pointer-events-none"
            >
              <AnimationControls
                animationData={animationData}
                canvasData={canvasData}
                onFrameUpdate={handleAnimationFrame}
                isVisible={previewMode}
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
              onUpdateRouteTypeName={handleUpdateRouteTypeName}
              onMirror={handleMirror}
            />

            {/* Pick Route from Library button */}
            <button
              onClick={() => setRoutePickerOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-xs font-medium text-foreground/85 shadow-lg backdrop-blur-xl transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground"
            >
              <RouteIcon className="h-3.5 w-3.5" />
              Pick Route from Library
              <kbd className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                R
              </kbd>
            </button>
          </div>
        )}

        {/* ── Film Link editor (collapsible icon button, bottom-right) ── */}
        {hasFormation && !selectedPlayer && !previewMode && (
          <div className="absolute bottom-4 right-4 z-20">
            {filmPanelOpen ? (
              <div className="w-64 rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/85">
                    <Film className="h-3.5 w-3.5" />
                    Film Clip
                  </div>
                  <button
                    onClick={() => setFilmPanelOpen(false)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground/85"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <FilmLinkEditor
                  filmUrl={filmUrl}
                  filmTimestamp={filmTimestamp}
                  onFilmUrlChange={(url) => {
                    setFilmUrl(url);
                    setDirty(true);
                  }}
                  onFilmTimestampChange={(ts) => {
                    setFilmTimestamp(ts);
                    setDirty(true);
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setFilmPanelOpen(true)}
                title="Film Clip"
                className={`rounded-xl border border-border bg-card p-3 shadow-lg backdrop-blur-xl transition-colors hover:bg-secondary hover:text-foreground ${filmUrl ? "text-accent" : "text-muted-foreground"}`}
              >
                <Film className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* ── Formation panel toggle button (visible when panel closed) ── */}
        {!formationPanelOpen && hasFormation && (
          <button
            onClick={() => setFormationPanelOpen(true)}
            title="Toggle Formations (F)"
            className="absolute bottom-4 left-4 z-20 rounded-xl border border-border bg-card p-3 text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Route Picker Modal ── */}
      <RoutePicker
        isOpen={routePickerOpen}
        onClose={() => setRoutePickerOpen(false)}
        onSelectRoute={handleRouteSelect}
      />

      {/* ── Play Library Modal ── */}
      <PlayLibrary
        isOpen={playLibraryOpen}
        onClose={() => setPlayLibraryOpen(false)}
        onImportPlay={handleImportPlay}
      />

      {/* ── Print Panel Modal ── */}
      <Dialog open={printPanelOpen} onOpenChange={setPrintPanelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Play</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a print layout and print the current play.
            </DialogDescription>
          </DialogHeader>

          {/* Mode selector */}
          <SegmentedControl
            size="md"
            ariaLabel="Print mode"
            className="mb-4 w-full"
            value={printMode}
            onChange={setPrintMode}
            options={[
              { value: "playbook", label: "Playbook" },
              { value: "wristband", label: "Wristband" },
            ]}
          />

          {/* Preview info */}
          <div className="mb-4 rounded-xl border border-border bg-secondary p-4">
            <p className="text-xs text-muted-foreground">
              {printMode === "playbook" ? (
                <>Full-page layout with play name, diagram, and route assignments. One play per page.</>
              ) : (
                <>Compact 4x4 grid for wristband cards. Play name and mini diagram per cell.</>
              )}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/85">{playName}</span>
              {formationName && <> &middot; {formationName}</>}
              {" "}&middot; {canvasData.routes.length} route(s)
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Off-screen print layout (shown only during print) ── */}
      <div className="hidden print:block">
        <PrintLayout plays={printPlays} mode={printMode} />
      </div>
    </div>
  );
}
