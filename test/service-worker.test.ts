import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker template", () => {
  const swTemplatePath = path.join(process.cwd(), "public", "sw-template.js");
  const getContents = () => fs.readFileSync(swTemplatePath, "utf8");

  describe("lifecycle management", () => {
    it("clears the pages HTML cache on activate to avoid cross-deploy hydration mismatches", () => {
      const contents = getContents();
      expect(contents).toContain('self.addEventListener("activate"');
      expect(contents).toContain('caches.delete("esdeveniments-pages-cache")');
    });

    it("calls clients.claim() for immediate takeover", () => {
      const contents = getContents();
      expect(contents).toContain("self.clients.claim()");
    });

    it("listens for SKIP_WAITING message", () => {
      const contents = getContents();
      expect(contents).toContain('type === "SKIP_WAITING"');
      expect(contents).toContain("self.skipWaiting()");
    });
  });

  describe("resilience", () => {
    it("has defensive check for Workbox CDN availability", () => {
      const contents = getContents();
      expect(contents).toContain("if (!self.workbox)");
      expect(contents).toContain("Workbox failed to load");
    });

    it("has setDefaultHandler for uncaught requests", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.routing.setDefaultHandler");
    });

    it("has setCatchHandler for error recovery", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.routing.setCatchHandler");
    });

    it("returns offline page from catch handler for navigation requests", () => {
      const contents = getContents();
      expect(contents).toMatch(/setCatchHandler[\s\S]*destination === "document"[\s\S]*\/offline/);
    });
  });

  describe("caching strategies", () => {
    it("uses NetworkFirst for navigation requests", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.strategies.NetworkFirst");
      expect(contents).toContain('request.mode === "navigate"');
    });

    it("uses CacheFirst for static assets (CSS, JS, fonts)", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.strategies.CacheFirst");
      expect(contents).toContain('request.destination === "style"');
      expect(contents).toContain('request.destination === "script"');
      expect(contents).toContain('request.destination === "font"');
    });

    it("uses StaleWhileRevalidate for images with CacheableResponsePlugin", () => {
      const contents = getContents();
      expect(contents).toContain('request.destination === "image"');
      expect(contents).toContain("esdeveniments-images-cache");
      expect(contents).toContain("CacheableResponsePlugin");
    });

    it("has separate cache for events API with 5-minute TTL", () => {
      const contents = getContents();
      expect(contents).toContain("esdeveniments-events-api-cache");
      expect(contents).toContain("maxAgeSeconds: 300"); // 5 minutes
    });

    it("has separate cache for news API with 1-minute TTL", () => {
      const contents = getContents();
      expect(contents).toContain("esdeveniments-news-api-cache");
      expect(contents).toContain("maxAgeSeconds: 60"); // 1 minute
    });
  });

  describe("privacy and correctness", () => {
    it("respects Cache-Control headers (private/no-store)", () => {
      const contents = getContents();
      expect(contents).toContain("respectCacheControlPlugin");
      expect(contents).toContain('cacheControl.includes("private")');
      expect(contents).toContain('cacheControl.includes("no-store")');
    });

    it("only caches successful responses (status 0 or 200)", () => {
      const contents = getContents();
      // Multiple CacheableResponsePlugin instances with statuses: [0, 200]
      const matches = contents.match(/statuses:\s*\[0,\s*200\]/g);
      expect(matches?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("performance optimizations", () => {
    it("enables navigation preload", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.navigationPreload.enable()");
    });

    it("cleans up outdated caches", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.precaching.cleanupOutdatedCaches()");
    });

    it("uses BroadcastUpdatePlugin for pages cache", () => {
      const contents = getContents();
      expect(contents).toContain("workbox.broadcastUpdate.BroadcastUpdatePlugin");
    });
  });

  describe("precaching", () => {
    it("precaches the offline page", () => {
      const contents = getContents();
      expect(contents).toContain('url: "/offline"');
    });

    it("precaches essential icons", () => {
      const contents = getContents();
      expect(contents).toContain("/static/icons/icon-192x192.png");
      expect(contents).toContain("/static/icons/icon-512x512.png");
    });
  });
});
