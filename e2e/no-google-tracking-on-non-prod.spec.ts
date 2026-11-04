import { test, expect } from "@playwright/test";

// Single-route smoke guard: the home page of the configured base URL must not
// contact Google tracking endpoints when the base URL is a non-production
// host. The app's own gtag/Ads scripts are gated to the production host
// (utils/production-host.ts), but Cloudflare Zaraz injects zone-wide and has
// fired Google pings from staging and the Coolify dashboard, bypassing the
// app-level gating entirely. This guard catches that class of leak — see
// docs/incidents/2026-08-18-zaraz-zone-wide-google-tags.md. Coverage is one
// route on one host; it is not a proof that every non-prod host and route is
// clean (a nightly workflow runs it against the deployed staging host).
const GOOGLE_TRACKING_RE =
  /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|fundingchoicesmessages\.google\.com|doubleclick\.net|googleadservices\.com|googletagservices\.com/;

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const PROD_HOSTS = ["www.esdeveniments.cat", "esdeveniments.cat"];
// Exact hostname match (never substring — "esdeveniments.cat" is a suffix of
// staging.esdeveniments.cat, so includes() would skip the guard on staging).
const baseHostname = new URL(BASE_URL).hostname.toLowerCase();
const targetsProd = PROD_HOSTS.includes(baseHostname);

// How long to wait after load before asserting. gtag scripts use lazyOnload
// and edge-injected tags (Zaraz) fire at load, so a short settle wait covers
// both without needing networkidle (which ad slots can starve).
const SETTLE_MS = 10000;

test.describe("No Google tracking on non-prod hosts", () => {
  test.skip(
    targetsProd,
    "production is expected to load Google tags — this guard targets non-prod hosts",
  );

  test("page load makes zero Google tracking requests", async ({ page }) => {
    const googleHits: string[] = [];
    page.on("request", (req) => {
      if (GOOGLE_TRACKING_RE.test(req.url())) {
        googleHits.push(`${req.resourceType()} ${req.url()}`);
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(SETTLE_MS);

    expect(
      googleHits,
      `non-prod host contacted Google tracking endpoints (${googleHits.length} requests)`,
    ).toEqual([]);
  });
});
