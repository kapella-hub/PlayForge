import { describe, it, expect } from "vitest";
import {
  resolveThemeClass,
  themeInitScript,
  THEME_STORAGE_KEY,
} from "@/lib/theme-script";

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
  it("references the storage key and the dark fallback", () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
    expect(themeInitScript).toContain("prefers-color-scheme: dark");
    expect(themeInitScript).toContain("classList.add('dark')");
  });
});
