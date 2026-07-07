import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayToolbar } from "@/components/play/play-toolbar";

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    name: "Play", onNameChange: () => {},
    formation: "", playType: "pass", onPlayTypeChange: () => {},
    drawingRoute: false, onToggleDrawing: () => {},
    motionMode: false, onToggleMotion: () => {},
    previewMode: false, onTogglePreview: () => {},
    hasFormation: true,
    onUndo: () => {}, onRedo: () => {}, canUndo: false, canRedo: false,
    onSave: () => {}, saving: false, dirty: false,
    coverageOverlay: "", onCoverageChange: () => {},
    onMirror: () => {}, onExport: () => {},
    snapEnabled: true, onToggleSnap: vi.fn(),
    ...overrides,
  };
}

describe("PlayToolbar snap toggle", () => {
  it("reflects the pressed state and fires onToggleSnap on click", () => {
    const onToggleSnap = vi.fn();
    const { rerender } = render(<PlayToolbar {...baseProps({ onToggleSnap })} />);

    const snap = screen.getByRole("button", { name: /snap/i });
    expect(snap).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(snap);
    expect(onToggleSnap).toHaveBeenCalledTimes(1);

    rerender(<PlayToolbar {...baseProps({ onToggleSnap, snapEnabled: false })} />);
    expect(screen.getByRole("button", { name: /snap/i })).toHaveAttribute("aria-pressed", "false");
  });
});
