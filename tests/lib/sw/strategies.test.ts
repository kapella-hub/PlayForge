import { describe, it, expect } from "vitest";
import {
  SW_VERSION,
  classifyRequest,
  pagesCacheName,
  assetsCacheName,
  isPlayforgeCacheName,
  type RequestLike,
} from "@/lib/sw/strategies";

const ORIGIN = "https://app.playforge.test";
function req(partial: Partial<RequestLike> & { url: string }): RequestLike {
  return { mode: "no-cors", method: "GET", destination: "", ...partial };
}

describe("classifyRequest", () => {
  it("bypasses every non-GET request, even navigations (server actions are POST)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/home`, mode: "navigate", method: "POST" }), ORIGIN)).toBe("bypass");
    expect(classifyRequest(req({ url: `${ORIGIN}/api/x`, method: "DELETE" }), ORIGIN)).toBe("bypass");
  });

  it("bypasses cross-origin GETs", () => {
    expect(classifyRequest(req({ url: "https://cdn.other.test/a.png", destination: "image" }), ORIGIN)).toBe("bypass");
  });

  it("bypasses /api/** (covers NextAuth /api/auth/*)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/api/plays` }), ORIGIN)).toBe("bypass");
    expect(classifyRequest(req({ url: `${ORIGIN}/api/auth/session` }), ORIGIN)).toBe("bypass");
  });

  it("routes GET navigations network-first", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/home`, mode: "navigate" }), ORIGIN)).toBe("navigation-network-first");
    expect(classifyRequest(req({ url: `${ORIGIN}/login`, mode: "navigate" }), ORIGIN)).toBe("navigation-network-first");
  });

  it("routes /_next/static/** cache-first, winning over destination", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/_next/static/chunks/a.js`, destination: "script" }), ORIGIN)).toBe("static-cache-first");
    expect(classifyRequest(req({ url: `${ORIGIN}/_next/static/media/f.woff2`, destination: "font" }), ORIGIN)).toBe("static-cache-first");
  });

  it("routes same-origin images/fonts stale-while-revalidate", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/icons/icon-192.png`, destination: "image" }), ORIGIN)).toBe("swr-assets");
    expect(classifyRequest(req({ url: `${ORIGIN}/fonts/x.woff2`, destination: "font" }), ORIGIN)).toBe("swr-assets");
  });

  it("bypasses anything else (e.g. a same-origin script outside /_next/static)", () => {
    expect(classifyRequest(req({ url: `${ORIGIN}/custom.js`, destination: "script" }), ORIGIN)).toBe("bypass");
  });
});

describe("cache names", () => {
  it("builds versioned names from SW_VERSION", () => {
    expect(pagesCacheName()).toBe(`playforge-v${SW_VERSION}-pages`);
    expect(assetsCacheName()).toBe(`playforge-v${SW_VERSION}-assets`);
    expect(pagesCacheName(2)).toBe("playforge-v2-pages");
  });

  it("recognises only playforge versioned cache names", () => {
    expect(isPlayforgeCacheName("playforge-v1-pages")).toBe(true);
    expect(isPlayforgeCacheName("playforge-v9-assets")).toBe(true);
    expect(isPlayforgeCacheName("playforge-pages")).toBe(false);
    expect(isPlayforgeCacheName("other-v1-pages")).toBe(false);
  });
});
