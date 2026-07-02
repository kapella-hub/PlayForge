import type Konva from "konva";

/**
 * Returns the current Konva stage as a PNG data-URL at high resolution,
 * or null if the stage is not mounted.
 */
export function getStageDataURL(
  stageRef: React.RefObject<Konva.Stage | null>,
): string | null {
  const stage = stageRef.current;
  if (!stage) return null;
  return stage.toDataURL({ pixelRatio: 2 });
}

/**
 * Exports the current Konva stage as a PNG image download.
 */
export async function exportPlayAsImage(
  stageRef: React.RefObject<Konva.Stage | null>,
  playName: string,
): Promise<void> {
  const dataURL = getStageDataURL(stageRef);
  if (!dataURL) return;

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.download = `${playName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
