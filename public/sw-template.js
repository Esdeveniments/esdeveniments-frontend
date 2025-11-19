// Service Worker for improved caching and performance using Workbox (2025 Best Practices)

// Import the Workbox library from Google's CDN.
// Workbox simplifies common service worker tasks like caching, routing, and lifecycle management.
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js"
);

// Set a more descriptive name for your caches for easier debugging.
workbox.core.setCacheNameDetails({
  prefix: "esdeveniments-app",
  suffix: "v4",
  precache: "precache",
  runtime: "runtime-cache",
});

// --- 1. Navigation Preload (Performance Enhancement) ---
// This feature allows the browser to start fetching a page from the network
// at the same time the service worker starts up, eliminating any delay.
workbox.navigationPreload.enable();

// --- 2. Precaching the App Shell ---
// Precaching downloads and stores essential files when the service worker is installed.
// This ensures the basic app shell is always available, even offline.
const APP_SHELL_ASSETS = [
  { url: "/offline", revision: null },
  // Precache a minimal offline stylesheet (hashed Next CSS cannot be reliably precached)
  { url: "/static/css/offline.css", revision: null },
  { url: "/static/icons/icon-192x192.png", revision: null },
  { url: "/static/icons/icon-512x512.png", revision: null },
  { url: "/static/icons/today-icon.png", revision: null },
];
workbox.precaching.precacheAndRoute(APP_SHELL_ASSETS);

// --- 3. Caching Strategies for Runtime Requests ---

// Strategy for Pages (Network First)
// This ensures users always get the latest content if they are online.
// If they are offline, it will serve a cached version of the page *if they have visited it before*.
// If the page is not in the cache, it will fall back to the offline page.
const pageStrategy = new workbox.strategies.NetworkFirst({
  cacheName: "esdeveniments-pages-cache",
  plugins: [
    new workbox.broadcastUpdate.BroadcastUpdatePlugin(),
    new workbox.expiration.ExpirationPlugin({
      maxEntries: 50, // Don't cache more than 50 pages.
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
    }),
  ],
});

workbox.routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  async (args) => {
    try {
      // Use the Navigation Preload response if it's available.
      const preloadResponse = await args.preloadResponse;
      if (preloadResponse) return preloadResponse;
      // Otherwise, fall back to the network-first strategy.
      return await pageStrategy.handle(args);
    } catch (error) {
      // If the network fails AND the page isn't in the cache,
      // serve the pre-cached offline page as a last resort.
      const cache = await caches.open(workbox.core.cacheNames.precache);
      console.error("Error loading page:", error);
      return await cache.match("/offline");
    }
  }
);

// FIXED: Add a specific route to handle ad/tracker scripts.
// This tells the service worker to just try the network and fail gracefully
// if an ad blocker is present, preventing the unhandled promise rejection errors.
workbox.routing.registerRoute(
  ({ url }) =>
    /googlesyndication|googletagmanager|google-analytics|sentry\.io/.test(
      url.href
    ),
  new workbox.strategies.NetworkOnly()
);

// Strategy for Static Assets (CSS, JS, Fonts, Images) - Cache First
// These files don't change often, so serving them from the cache first is fastest.
workbox.routing.registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "worker" ||
    request.destination === "font" ||
    request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "esdeveniments-static-assets-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Strategy for Event API Requests - Stale-While-Revalidate with 5-minute TTL
// Events need fresher data, so we use a shorter cache duration
workbox.routing.registerRoute(
  ({ url }) =>
    url.pathname === "/api/events" ||
    url.pathname === "/api/events/categorized",
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "esdeveniments-events-api-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 300, // 5 minutes
      }),
    ],
  })
);

// Strategy for Other Local API Requests - Stale-While-Revalidate
// This strategy serves a cached response immediately for speed,
// then updates the cache in the background with a fresh network response for the next time.
// It's a great balance of performance and data freshness.
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "esdeveniments-local-api-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 Hours
      }),
    ],
  })
);

// Strategy for External API Requests - Stale-While-Revalidate
// Changed from CacheFirst to ensure users get fresh data updates in the background
workbox.routing.registerRoute(
  ({ url }) => url.origin === "{{API_ORIGIN}}",
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "esdeveniments-external-api-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 60, // 30 minutes for external API
      }),
      // Add network timeout for external API
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
    networkTimeoutSeconds: 5, // Fallback to cache if network is slow
  })
);

// --- 4. Service Worker Lifecycle ---
// This ensures that the new service worker activates immediately upon installation.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
