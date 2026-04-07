"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  /** The key to listen for (e.g. "d", "z", "Escape", "Backspace", "Delete") */
  key: string;
  /** Require Cmd (Mac) / Ctrl (Windows/Linux) */
  meta?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Handler function */
  handler: () => void;
  /** If true, do not fire when user is typing in an input/textarea */
  ignoreInputs?: boolean;
}

/**
 * Registers keyboard shortcuts and cleans up on unmount.
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: "z", meta: true, handler: undo },
 *   { key: "z", meta: true, shift: true, handler: redo },
 *   { key: "d", handler: toggleDraw, ignoreInputs: true },
 *   { key: "Escape", handler: deselect },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const metaMatch = shortcut.meta
        ? e.metaKey || e.ctrlKey
        : !e.metaKey && !e.ctrlKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const keyMatch =
        e.key.toLowerCase() === shortcut.key.toLowerCase() ||
        e.key === shortcut.key;

      if (keyMatch && metaMatch && shiftMatch) {
        if (shortcut.ignoreInputs && isInput) continue;

        e.preventDefault();
        e.stopPropagation();
        shortcut.handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
