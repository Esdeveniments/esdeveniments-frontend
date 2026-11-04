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

    it("calls self.skipWaiting() on install so SW fixes actually reach users with a stale SW", () => {
      // 2026-07-26: Without this, the new SW stays in the WAITING state until
      // every tab of the app closes, so any SW-side fix silently fails to
      // reach users that already have the broken SW installed. See LESSONS.md.
      const contents = getContents();
      expect(contents).toContain('self.addEventListener("install"');
      // The install listener must live BEFORE the message listener so the
      // new SW is ready to skipWaiting as soon as it installs (then the
      // manual SKIP_WAITING message handler still works for ad-hoc reloads).
      const installIdx = contents.indexOf('self.addEventListener("install"');
      const messageIdx = contents.indexOf('self.addEventListener("message"');
      expect(installIdx).toBeGreaterThan(-1);
      expect(messageIdx).toBeGreaterThan(-1);
      expect(installIdx).toBeLessThan(messageIdx);
    });

    it("purges the hardcoded local-api-cache on activate (Workbox suffix bump alone can't reach it)", () => {
      // 2026-07-26: The catch-all /api/ SWR route uses a literal cache name,
      // so a Workbox suffix bump doesn't invalidate it. Users whose OLD SW
      // poisoned it pre-logout need that specific cache explicitly deleted.
      const contents = getContents();
      expect(contents).toContain(
        'caches.delete("esdeveniments-local-api-cache")',
      );
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

    it("has separate cache for events API with 10-minute TTL", () => {
      const contents = getContents();
      expect(contents).toContain("esdeveniments-events-api-cache");
      expect(contents).toContain("maxAgeSeconds: 600"); // 10 minutes - matches server cache TTL
    });

    it("has separate cache for news API with 3-minute TTL", () => {
      const contents = getContents();
      expect(contents).toContain("esdeveniments-news-api-cache");
      expect(contents).toContain("maxAgeSeconds: 180"); // 3 minutes - matches server cache TTL
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

    it("never caches session-dependent endpoints — NetworkOnly, before the catch-all", () => {
      const contents = getContents();
      // Auth and per-user endpoints must use NetworkOnly so a cached response
      // can't keep the UI logged in after logout (/api/auth/me) or serve one
      // user's data to another (/api/favorites).
      expect(contents).toMatch(
        /startsWith\("\/api\/auth\/"\)[\s\S]*?NetworkOnly\(\)/
      );
      expect(contents).toContain('url.pathname === "/api/favorites"');
      // And it must register before the catch-all /api/ route, or Workbox's
      // first-match-wins ordering would route it to the SWR cache instead.
      const authIdx = contents.indexOf('startsWith("/api/auth/")');
      const catchAllIdx = contents.indexOf('!url.pathname.startsWith("/api/image-proxy")');
      expect(authIdx).toBeGreaterThan(-1);
      expect(authIdx).toBeLessThan(catchAllIdx);
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
