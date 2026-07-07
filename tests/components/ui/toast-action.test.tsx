import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";

// jsdom has no real animation-frame loop, so framer-motion's AnimatePresence
// exit animation never completes and the exiting toast is never unmounted.
// Render motion.div/AnimatePresence as plain passthroughs for this test.
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...rest }: Record<string, unknown>) => {
          delete rest.initial;
          delete rest.animate;
          delete rest.exit;
          delete rest.transition;
          delete rest.layout;
          return React.createElement(tag, rest, children as React.ReactNode);
        },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

function Trigger({ onAction }: { onAction: () => void }) {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.info("Updated", { label: "Reload", onClick: onAction })}>
        action-toast
      </button>
      <button onClick={() => toast.info("Plain")}>plain-toast</button>
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("toast with action", () => {
  it("renders the action button and fires its onClick", () => {
    const onAction = vi.fn();
    render(<ToastProvider><Trigger onAction={onAction} /></ToastProvider>);
    act(() => { fireEvent.click(screen.getByText("action-toast")); });

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not auto-dismiss an action toast after 3s, but a plain toast does", () => {
    render(<ToastProvider><Trigger onAction={() => {}} /></ToastProvider>);
    act(() => { fireEvent.click(screen.getByText("action-toast")); });
    act(() => { fireEvent.click(screen.getByText("plain-toast")); });

    act(() => { vi.advanceTimersByTime(3100); });

    expect(screen.getByText("Updated")).toBeInTheDocument();     // action toast survives
    expect(screen.queryByText("Plain")).not.toBeInTheDocument(); // plain toast gone
  });
});
