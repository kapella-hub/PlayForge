import type Konva from "konva";

/**
 * Exports the current Konva stage as a PNG image download.
 */
export async function exportPlayAsImage(
  stageRef: React.RefObject<Konva.Stage | null>,
  playName: string,
): Promise<void> {
  const stage = stageRef.current;
  if (!stage) return;

  const pixelRatio = 2; // high-res export
  const dataURL = stage.toDataURL({ pixelRatio });

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.download = `${playName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
