import { describe, it, expect, vi } from "vitest";
import { renderHook, fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";

describe("useKeyboardShortcuts", () => {
  it("does not fire a plain arrow shortcut when Alt is held (browser back stays free)", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "ArrowLeft", handler }]));

    fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it("fires an alt-scoped shortcut only when Alt is held", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "ArrowLeft", alt: true, handler }]),
    );

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
