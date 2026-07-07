import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { SW_VERSION } from "@/lib/sw/strategies";

function parseSwVersion(source: string): number {
  const match = source.match(/SW_VERSION\s*=\s*(\d+)/);
  if (!match) throw new Error("SW_VERSION literal not found in public/sw.js");
  return Number(match[1]);
}

describe("service worker version agreement", () => {
  it("public/sw.js encodes the same SW_VERSION as strategies.ts", () => {
    const swSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(parseSwVersion(swSource)).toBe(SW_VERSION);
  });
});
