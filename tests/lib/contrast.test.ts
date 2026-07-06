import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** sRGB relative luminance per WCAG 2.x */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio in [1, 21] */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Parse the committed `.light` palette (hex tokens only) from globals.css */
function readLightPalette(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const block = css.match(/\.light\s*\{([^}]*)\}/)?.[1] ?? "";
  const vars: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[m[1]] = m[2];
  }
  return vars;
}

const p = readLightPalette();

function token(name: string): string {
  const v = p[name];
  if (!v) throw new Error(`missing --${name} (hex) in .light palette of globals.css`);
  return v;
}

const AA = 4.5; // normal-size text

describe("light palette meets WCAG AA (4.5:1) for core text pairs", () => {
  it("foreground on background", () =>
    void expect(contrast(token("foreground"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("foreground on card", () =>
    void expect(contrast(token("card-foreground"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("muted-foreground on background", () =>
    void expect(contrast(token("muted-foreground"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("muted-foreground on card", () =>
    void expect(contrast(token("muted-foreground"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("primary-foreground on primary", () =>
    void expect(contrast(token("primary-foreground"), token("primary"))).toBeGreaterThanOrEqual(AA));
  it("primary-emphasis on background", () =>
    void expect(contrast(token("primary-emphasis"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("accent on background", () =>
    void expect(contrast(token("accent"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("accent on card", () =>
    void expect(contrast(token("accent"), token("card"))).toBeGreaterThanOrEqual(AA));
});

describe("offense/defense badge text meets AA in either badge design", () => {
  // colored-text-on-surface (tinted-bg badge)
  it("offense on background", () =>
    void expect(contrast(token("offense"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("offense on card", () =>
    void expect(contrast(token("offense"), token("card"))).toBeGreaterThanOrEqual(AA));
  it("defense on background", () =>
    void expect(contrast(token("defense"), token("background"))).toBeGreaterThanOrEqual(AA));
  it("defense on card", () =>
    void expect(contrast(token("defense"), token("card"))).toBeGreaterThanOrEqual(AA));
  // white-text-on-fill (solid badge)
  it("white on offense", () =>
    void expect(contrast("#ffffff", token("offense"))).toBeGreaterThanOrEqual(AA));
  it("white on defense", () =>
    void expect(contrast("#ffffff", token("defense"))).toBeGreaterThanOrEqual(AA));
});
