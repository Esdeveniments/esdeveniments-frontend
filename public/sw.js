// Service Worker for improved caching and performance
// This will cache static assets and API responses for better Core Web Vitals

const CACHE_NAME = "esdeveniments-cache-v2";
const STATIC_CACHE_NAME = "esdeveniments-static-v2";
const API_CACHE_NAME = "esdeveniments-api-v2";

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/qui-som",
  "/publica",
  "/offline",
  "/barcelona",
  "/girona",
  "/catalunya",
  "/lleida",
  "/tarragona",
  "/static/icons/icon-192x192.png",
  "/static/icons/icon-512x512.png",
  "/static/icons/today-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        // Add assets individually to avoid failing the entire cache
        const promises = STATIC_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
            console.log(`Cached: ${asset}`);
          } catch (error) {
            console.warn(`Failed to cache: ${asset}`, error);
          }
        });
        return Promise.all(promises);
      }),
      caches.open(API_CACHE_NAME),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style"
  ) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle page requests
  event.respondWith(handlePageRequest(request));
});

async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Return cached response if available and still fresh (5 minutes)
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get("date"));
    const now = new Date();
    const age = (now.getTime() - cachedDate.getTime()) / 1000 / 60; // minutes

    if (age < 5) {
      return cachedResponse;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return stale cache if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Try cache first for static assets (cache first strategy)
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful responses
      try {
        cache.put(request, response.clone());
      } catch (cacheError) {
        console.warn("Failed to cache static asset:", request.url, cacheError);
      }
    }
    return response;
  } catch (error) {
    console.error("Failed to fetch static asset:", request.url, error);

    // For critical assets like favicon, return a minimal fallback
    if (request.url.includes("favicon.ico")) {
      return new Response("", { status: 404 });
    }

    throw error;
  }
}

async function handlePageRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  try {
    // Try to fetch from network first
    const response = await fetch(request);

    // Cache successful page responses for common routes
    if (response.ok && request.method === "GET") {
      const url = new URL(request.url);
      const path = url.pathname;

      // Cache popular pages
      if (
        path === "/" ||
        path.startsWith("/barcelona") ||
        path.startsWith("/girona") ||
        path.startsWith("/catalunya") ||
        path.startsWith("/lleida") ||
        path.startsWith("/tarragona") ||
        path === "/publica" ||
        path === "/qui-som"
      ) {
        try {
          cache.put(request, response.clone());
        } catch (cacheError) {
          console.warn("Failed to cache page:", path, cacheError);
        }
      }
    }

    return response;
  } catch (error) {
    console.log("Network request failed, trying cache:", error);

    // Try to get from cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page as last resort
    const offlinePage = await cache.match("/offline");
    if (offlinePage) {
      return offlinePage;
    }

    // If all else fails, return a basic offline response
    return new Response(
      "<html><body><h1>Offline</h1><p>No connection available and no cached content found.</p></body></html>",
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
