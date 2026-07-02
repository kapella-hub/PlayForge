import { describe, it, expect, vi } from "vitest";
import type Konva from "konva";
import { getStageDataURL } from "@/engine/export";

describe("getStageDataURL", () => {
  it("returns null when the stage ref is empty", () => {
    expect(getStageDataURL({ current: null })).toBeNull();
  });

  it("returns the stage's data URL at 2x pixel ratio", () => {
    const toDataURL = vi.fn(() => "data:image/png;base64,AAAA");
    const stageRef = {
      current: { toDataURL },
    } as unknown as React.RefObject<Konva.Stage | null>;

    const result = getStageDataURL(stageRef);

    expect(result).toBe("data:image/png;base64,AAAA");
    expect(toDataURL).toHaveBeenCalledWith({ pixelRatio: 2 });
  });
});
