"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { deserializeCanvas } from "@/engine/serialization";
import { generateKeyframes } from "@/engine/animation-engine";
import { AnimationControls } from "@/components/play/animation-controls";
import { cn } from "@/lib/utils";
import type { AnimationState } from "@/engine/animation-engine";
import type { AnimationData } from "@/engine/types";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false },
);

interface PlayViewerProps {
  canvasData: unknown;
  className?: string;
  /** Auto-play the animation once on load */
  autoPlay?: boolean;
}

export function PlayViewer({ canvasData, className, autoPlay = false }: PlayViewerProps) {
  const canvas = deserializeCanvas(canvasData);
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

  return (
    <div className={cn("relative aspect-[5/3] w-full overflow-hidden rounded-lg", className)}>
      <PlayCanvas
        canvasData={canvas}
        onChange={() => {}}
        selectedPlayerId={null}
        onSelectPlayer={() => {}}
        drawingRoute={false}
        readOnly
        animationState={animationState}
      />

      {/* Animation controls at bottom */}
      {animationData && (
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center px-2 pointer-events-none">
          <AnimationControls
            animationData={animationData}
            canvasData={canvas}
            onFrameUpdate={handleAnimationFrame}
            isVisible
          />
        </div>
      )}
    </div>
  );
}
