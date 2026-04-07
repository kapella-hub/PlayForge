"use client";

import dynamic from "next/dynamic";
import { deserializeCanvas } from "@/engine/serialization";
import { cn } from "@/lib/utils";

const PlayCanvas = dynamic(
  () => import("@/engine/play-canvas").then((mod) => ({ default: mod.PlayCanvas })),
  { ssr: false },
);

interface PlayViewerProps {
  canvasData: unknown;
  className?: string;
}

export function PlayViewer({ canvasData, className }: PlayViewerProps) {
  const canvas = deserializeCanvas(canvasData);

  return (
    <div className={cn("aspect-[5/3] w-full overflow-hidden rounded-lg", className)}>
      <PlayCanvas
        canvasData={canvas}
        onChange={() => {}}
        selectedPlayerId={null}
        onSelectPlayer={() => {}}
        drawingRoute={false}
        readOnly
      />
    </div>
  );
}
