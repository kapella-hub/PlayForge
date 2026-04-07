"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { deserializeCanvas } from "@/engine/serialization";
import { generateKeyframes } from "@/engine/animation-engine";
import { exportPlayAsImage } from "@/engine/export";
import { AnimationControls } from "@/components/play/animation-controls";
import { cn } from "@/lib/utils";
import type { AnimationState } from "@/engine/animation-engine";
import type { AnimationData } from "@/engine/types";
import type { PlayCanvasHandle } from "@/engine/play-canvas";
import { Download } from "lucide-react";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false },
);

interface PlayViewerProps {
  canvasData: unknown;
  className?: string;
  /** Auto-play the animation once on load */
  autoPlay?: boolean;
  /** When set, highlights only this player and their route */
  highlightPlayerId?: string;
  /** Play name used for PNG export filename */
  playName?: string;
}

export function PlayViewer({ canvasData, className, autoPlay = false, highlightPlayerId, playName = "play" }: PlayViewerProps) {
  const canvas = deserializeCanvas(canvasData);
  const canvasRef = useRef<PlayCanvasHandle>(null);
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState | null>(null);

  // Generate keyframes on mount
  useEffect(() => {
    if (canvas.players.length > 0 && canvas.routes.length > 0) {
      const data = generateKeyframes(canvas);
      setAnimationData(data);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnimationFrame = useCallback((state: AnimationState) => {
    setAnimationState(state);
  }, []);

  const handleExport = useCallback(() => {
    const handle = canvasRef.current;
    if (!handle) return;
    const stageRef = handle.getStageRef();
    exportPlayAsImage(stageRef, playName);
  }, [playName]);

  return (
    <div className={cn("relative aspect-[5/3] w-full overflow-hidden rounded-lg", className)}>
      <PlayCanvas
        ref={canvasRef}
        canvasData={canvas}
        onChange={() => {}}
        selectedPlayerId={null}
        onSelectPlayer={() => {}}
        drawingRoute={false}
        readOnly
        animationState={animationState}
        highlightPlayerId={highlightPlayerId}
      />

      {/* Download button */}
      <button
        onClick={handleExport}
        className="absolute right-2 top-2 z-10 rounded-md bg-zinc-900/70 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-white"
        title="Download as PNG"
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      {/* Animation controls at bottom */}
      {animationData && (
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center px-2 pointer-events-none">
          <AnimationControls
            animationData={animationData}
            canvasData={canvas}
            onFrameUpdate={handleAnimationFrame}
            isVisible
            autoPlay={autoPlay}
          />
        </div>
      )}
    </div>
  );
}
