// Hand-rolled service worker. Routing logic MIRRORS src/lib/sw/strategies.ts
// (kept in sync by hand; the SW_VERSION literal below MUST equal the one there —
// enforced by tests/lib/sw/version-agreement.test.ts). Plain JS, no imports.

const SW_VERSION = 1;
const PAGES_CACHE = `playforge-v${SW_VERSION}-pages`;
const ASSETS_CACHE = `playforge-v${SW_VERSION}-assets`;
const OFFLINE_URL = "/offline";
const MAX_ASSET_ENTRIES = 60;

function classify(request) {
  if (request.method !== "GET") return "bypass";
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }
  if (url.origin !== self.location.origin) return "bypass";
  if (url.pathname.startsWith("/api/")) return "bypass";
  if (request.mode === "navigate") return "navigation-network-first";
  if (url.pathname.startsWith("/_next/static/")) return "static-cache-first";
  if (request.destination === "image" || request.destination === "font") return "swr-assets";
  return "bypass";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (n) =>
                /^playforge-v\d+-(pages|assets)$/.test(n) &&
                n !== PAGES_CACHE &&
                n !== ASSETS_CACHE,
            )
            .map((n) => caches.delete(n)),
        ),
      )
      // Re-add /offline into the current pages cache; never let this reject activate.
      .then(() => caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL)))
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = classify(event.request);
  if (strategy === "bypass") return; // default browser fetch
  if (strategy === "navigation-network-first") {
    event.respondWith(handleNavigation(event.request));
  } else if (strategy === "static-cache-first") {
    event.respondWith(cacheFirst(event.request, ASSETS_CACHE));
  } else if (strategy === "swr-assets") {
    event.respondWith(staleWhileRevalidate(event.request, ASSETS_CACHE));
  }
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).then(() => trimCache(cache, MAX_ASSET_ENTRIES));
      }
      return response;
    })
    .catch(() => cached);
  return cached || (await network) || new Response(null, { status: 504 });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}
