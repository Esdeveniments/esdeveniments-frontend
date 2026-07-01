import { test, expect } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";
import { parseAndValidateSitemap } from "../test/sitemap-helpers";

// Validate sitemap index and town pages render, and server sitemap + RSS endpoints respond 200.
//
// These run against the live preview backend, so they assert STRUCTURE (200,
// well-formed XML), never data volume. Whether the sitemap actually contains
// region/city/place entries depends on backend data availability at request
// time (server-side fetches Playwright can't mock), which flakes when the
// backend is slow. The "does the fetched data render" coverage lives in the
// deterministic test/sitemap-content.test.tsx; the chunking logic is exercised
// by the event-sitemap tests below (event data is reliably populated).

test.describe("Sitemaps and feed", () => {
  test("sitemap index renders", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("sitemap-page")).toBeVisible();
    await expect(page.getByTestId("sitemap-title").first()).toBeVisible();
  });

  test("server sitemap responds with sitemap index", async ({ request }) => {
    const res = await request.get("/server-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();

    // server-sitemap.xml now returns a sitemap index pointing to chunked event sitemaps
    expect(text).toContain("<sitemapindex");
    expect(text).toContain("/sitemap-events/");

    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.sitemapindex).toBeDefined();

    const sitemaps = Array.isArray(xmlObj.sitemapindex.sitemap)
      ? xmlObj.sitemapindex.sitemap
      : [xmlObj.sitemapindex.sitemap];

    expect(sitemaps.length).toBeGreaterThan(0);

    // Check lastmod dates are not 2023
    sitemaps.forEach((sitemap: { lastmod?: string }) => {
      expect(sitemap.lastmod).toBeDefined();
      expect(sitemap.lastmod).not.toContain("2023");
    });
  });

  test("chunked event sitemap responds with URLs", async ({ request }) => {
    const res = await request.get("/sitemap-events/1.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();

    const urls = parseAndValidateSitemap(text);

    // Check presence of event URLs
    expect(urls.length).toBeGreaterThan(0);

    const urlLocs = urls.map((url: { loc: string }) => url.loc);
    expect(urlLocs.length).toBeGreaterThan(0);
    // Event URLs should contain /e/ path
    expect(urlLocs.some((loc: string) => loc.includes("/e/"))).toBe(true);

    // Check lastmod dates are not 2023
    urls.forEach((url: { lastmod?: string }) => {
      expect(url.lastmod).toBeDefined();
      expect(url.lastmod).not.toContain("2023");
    });
  });

  test("server place sitemap responds with a valid sitemap index", async ({
    request,
  }) => {
    const res = await request.get("/server-place-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<sitemapindex");

    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.sitemapindex).toBeDefined();

    // Entry count is data-dependent (place volume on the backend) — assert
    // structure, not count. Validate any entries that are present.
    const sitemaps = xmlObj.sitemapindex.sitemap
      ? Array.isArray(xmlObj.sitemapindex.sitemap)
        ? xmlObj.sitemapindex.sitemap
        : [xmlObj.sitemapindex.sitemap]
      : [];
    sitemaps.forEach((sitemap: { lastmod?: string }) => {
      if (sitemap.lastmod) expect(sitemap.lastmod).not.toContain("2023");
    });
  });

  test("chunked place sitemap responds with a valid urlset", async ({
    request,
  }) => {
    const res = await request.get("/sitemap-places/1.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();

    // parseAndValidateSitemap asserts a well-formed <urlset>; it returns []
    // when empty. URL count is data-dependent, so validate structure + any
    // entries present rather than requiring a non-empty list.
    const urls = parseAndValidateSitemap(text);
    urls.forEach((url: { lastmod?: string }) => {
      if (url.lastmod) expect(url.lastmod).not.toContain("2023");
    });
  });

  test("sitemap index does not contain self-references", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<sitemapindex|<urlset/);

    // Parse XML
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    if (xmlObj.sitemapindex) {
      const sitemaps = Array.isArray(xmlObj.sitemapindex.sitemap)
        ? xmlObj.sitemapindex.sitemap
        : [xmlObj.sitemapindex.sitemap];
      expect(sitemaps.length).toBeGreaterThan(0);

      // Check no self-reference
      const locs = sitemaps.map((s: { loc: string }) => s.loc);
      expect(locs).not.toContain(expect.stringContaining("/sitemap.xml"));
    } else if (xmlObj.urlset) {
      // If it's urlset, check no self-reference in urls
      if (xmlObj.urlset.url) {
        const urls = Array.isArray(xmlObj.urlset.url)
          ? xmlObj.urlset.url
          : [xmlObj.urlset.url];
        const locs = urls.map((u: { loc: string }) => u.loc);
        expect(locs).not.toContain(expect.stringContaining("/sitemap.xml"));
      }
    }
  });

  test("rss feed responds", async ({ request }) => {
    const res = await request.get("/rss.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<?xml");

    // Parse XML and validate structure
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.rss).toBeDefined();
    expect(xmlObj.rss.channel).toBeDefined();
  });
});
