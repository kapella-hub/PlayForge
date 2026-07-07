import { describe, it, expect, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOnline } from "@/lib/use-online";

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

afterEach(() => setOnLine(true));

describe("useOnline", () => {
  it("reflects the initial navigator.onLine value", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it("updates when offline and online events fire", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
