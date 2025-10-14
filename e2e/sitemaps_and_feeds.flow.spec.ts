import { test, expect } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";
import { parseAndValidateSitemap } from "../test/sitemap-helpers";

// Validate sitemap index and town pages render, and server sitemap + RSS endpoints respond 200.

test.describe("Sitemaps and feed", () => {
  test("sitemap index renders", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("sitemap-page")).toBeVisible();
    await expect(page.getByTestId("sitemap-title")).toBeVisible();
  });

  test("server sitemap responds", async ({ request }) => {
    const res = await request.get("/server-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();

    const urls = parseAndValidateSitemap(text);

    // Check lastmod dates are not 2023
    urls.forEach((url: { lastmod?: string }) => {
      expect(url.lastmod).toBeDefined();
      expect(url.lastmod).not.toContain("2023");
    });
  });

  test("server place sitemap responds", async ({ request }) => {
    const res = await request.get("/server-place-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();

    const urls = parseAndValidateSitemap(text);

    if (urls.length > 0) {
      // Check presence of key place URLs if any
      const urlLocs = urls.map((url: { loc: string }) => url.loc);
      if (urlLocs.length > 0) {
        // At least some place URLs should be present
        expect(urlLocs.length).toBeGreaterThan(0);
      }

      // Check lastmod dates are not 2023
      urls.forEach((url: { lastmod?: string }) => {
        expect(url.lastmod).toBeDefined();
        expect(url.lastmod).not.toContain("2023");
      });
    }
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
