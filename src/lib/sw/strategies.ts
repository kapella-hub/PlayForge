// Pure, unit-tested routing reference for the service worker.
// public/sw.js inlines this same logic in plain JS and shares SW_VERSION
// (kept in sync manually; enforced by tests/lib/sw/version-agreement.test.ts).

export const SW_VERSION = 1;

export type Strategy =
  | "navigation-network-first"
  | "static-cache-first"
  | "swr-assets"
  | "bypass";

export interface RequestLike {
  url: string;
  mode: string;
  method: string;
  destination: string;
}

export function classifyRequest(req: RequestLike, origin: string): Strategy {
  if (req.method !== "GET") return "bypass";

  let url: URL;
  try {
    url = new URL(req.url, origin);
  } catch {
    return "bypass";
  }
  if (url.origin !== origin) return "bypass";
  if (url.pathname.startsWith("/api/")) return "bypass";

  if (req.mode === "navigate") return "navigation-network-first";
  if (url.pathname.startsWith("/_next/static/")) return "static-cache-first";
  if (req.destination === "image" || req.destination === "font") return "swr-assets";

  return "bypass";
}

export function pagesCacheName(version: number = SW_VERSION): string {
  return `playforge-v${version}-pages`;
}

export function assetsCacheName(version: number = SW_VERSION): string {
  return `playforge-v${version}-assets`;
}

export function isPlayforgeCacheName(name: string): boolean {
  return /^playforge-v\d+-(pages|assets)$/.test(name);
}
