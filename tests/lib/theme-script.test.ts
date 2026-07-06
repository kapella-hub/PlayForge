import { describe, it, expect } from "vitest";
import { resolveThemeClass, themeInitScript } from "@/lib/theme-script";

describe("resolveThemeClass", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(resolveThemeClass(null, true)).toBe("dark");
    expect(resolveThemeClass(null, false)).toBe("dark");
  });

  it("honours an explicit light preference", () => {
    expect(resolveThemeClass("light", true)).toBe("light");
  });

  it("honours an explicit dark preference", () => {
    expect(resolveThemeClass("dark", false)).toBe("dark");
  });

  it("resolves system via prefers-color-scheme", () => {
    expect(resolveThemeClass("system", true)).toBe("dark");
    expect(resolveThemeClass("system", false)).toBe("light");
  });

  it("falls back to dark for an unrecognised value", () => {
    expect(resolveThemeClass("chartreuse", false)).toBe("dark");
  });
});

describe("themeInitScript", () => {
  it("drift detector: script behavior matches resolveThemeClass across all inputs", () => {
    const testCases: Array<[string | null, boolean]> = [
      // Stored values: null (default), known values, empty string, unrecognised
      [null, true],
      [null, false],
      ["dark", true],
      ["dark", false],
      ["light", true],
      ["light", false],
      ["system", true],
      ["system", false],
      ["", true],
      ["", false],
      ["garbage", true],
      ["garbage", false],
    ];

    testCases.forEach(([stored, prefersDark]) => {
      // Create a fresh html element for this test case
      const testElement = document.createElement("html");

      // Save and mock the relevant globals
      const originalGetItem = Storage.prototype.getItem;
      const originalMatchMedia = window.matchMedia;
      const originalDocumentElement = Object.getOwnPropertyDescriptor(document, "documentElement");

      try {
        // Mock localStorage.getItem to return our test value
        Storage.prototype.getItem = () => stored;

        // Mock window.matchMedia to return our test preference
        window.matchMedia = (() => ({
          matches: prefersDark,
        })) as unknown as typeof window.matchMedia;

        // Replace document.documentElement temporarily for this execution
        Object.defineProperty(document, "documentElement", {
          value: testElement,
          writable: true,
        });

        // Create a wrapped function from the script string and call it
        // The script is a self-invoking IIFE, so wrapping it allows safe execution
        const executeScript = new Function(themeInitScript);
        executeScript();

        // Compare script result with resolver
        const resolvedClass = resolveThemeClass(stored, prefersDark);
        const scriptClass = testElement.className;

        if (scriptClass !== resolvedClass) {
          throw new Error(
            `Mismatch for stored="${stored}", prefersDark=${prefersDark}: script returned "${scriptClass}" but resolveThemeClass returned "${resolvedClass}"`,
          );
        }
        expect(scriptClass).toBe(resolvedClass);
      } finally {
        // Restore all mocked globals
        Storage.prototype.getItem = originalGetItem;
        window.matchMedia = originalMatchMedia;
        if (originalDocumentElement) {
          Object.defineProperty(document, "documentElement", originalDocumentElement);
        }
      }
    });
  });
});
