import { describe, it, expect } from "vitest";
import {
  ROUTE_TYPES,
  ROUTE_TYPE_GROUPS,
  normalizeRouteType,
  normalizeCanvasRouteTypes,
} from "@/engine/route-types";
import type { CanvasData } from "@/engine/types";

describe("normalizeRouteType", () => {
  it("heals legacy lowercase to canonical casing", () => {
    expect(normalizeRouteType("slant")).toBe("Slant");
    expect(normalizeRouteType("post")).toBe("Post");
    expect(normalizeRouteType("GO")).toBe("Go");
  });

  it("is identity for already-canonical values", () => {
    expect(normalizeRouteType("Slant")).toBe("Slant");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeRouteType("  slant  ")).toBe("Slant");
  });

  it("passes through route-library names that are not pills, unchanged", () => {
    expect(normalizeRouteType("Dig / In")).toBe("Dig / In");
    expect(normalizeRouteType("Go / Fly")).toBe("Go / Fly");
    expect(normalizeRouteType("Bubble Screen")).toBe("Bubble Screen");
  });
});

describe("ROUTE_TYPES", () => {
  it("is the de-duplicated flattening of the groups and includes core pills", () => {
    const flat = ROUTE_TYPE_GROUPS.flatMap((g) => g.routes);
    expect([...ROUTE_TYPES]).toEqual(flat);
    expect(new Set(ROUTE_TYPES).size).toBe(ROUTE_TYPES.length);
    for (const t of ["Flat", "Slant", "Post", "Go", "Corner"]) {
      expect(ROUTE_TYPES).toContain(t);
    }
  });

  it("contains every named output the detector can produce", () => {
    // Contract: detectRouteType's named outputs must stay canonical.
    // ("Route" and "Unknown" are documented non-pill fallbacks.)
    const detectorNamed = ["Flat", "Drag", "Curl", "Post", "Corner", "Dig", "Out", "Go", "Slant"];
    for (const name of detectorNamed) {
      expect(ROUTE_TYPES).toContain(name);
    }
  });
});

describe("normalizeCanvasRouteTypes", () => {
  it("heals every route's casing and leaves missing routeType untouched", () => {
    const data: CanvasData = {
      players: [],
      routes: [
        { playerId: "a", waypoints: [], type: "solid", routeType: "slant" },
        { playerId: "b", waypoints: [], type: "solid" },
        { playerId: "c", waypoints: [], type: "solid", routeType: "Dig / In" },
      ],
      motions: [],
      meta: { formation: "", playType: "", side: "offense" },
    };
    const out = normalizeCanvasRouteTypes(data);
    expect(out.routes[0].routeType).toBe("Slant");
    expect(out.routes[1].routeType).toBeUndefined();
    expect(out.routes[2].routeType).toBe("Dig / In");
  });
});
