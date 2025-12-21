import { test, expect } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";
import { parseAndValidateSitemap } from "../test/sitemap-helpers";

// Validate sitemap index and town pages render, and server sitemap + RSS endpoints respond 200.

test.describe("Sitemaps and feed", () => {
  test("sitemap index renders", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("sitemap-page")).toBeVisible();
    await expect(page.getByTestId("sitemap-title").first()).toBeVisible();
  });

  test("sitemap displays regions and cities data", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Verify page structure
    await expect(page.getByTestId("sitemap-page")).toBeVisible();
    await expect(page.getByTestId("sitemap-title").first()).toBeVisible();
    
    // Verify regions section has data
    const regionLinks = page.getByTestId("sitemap-region-link");
    const regionCount = await regionLinks.count();
    
    // If API call failed, we'd have 0 regions
    // This test verifies that fetchRegions() succeeded
    expect(regionCount).toBeGreaterThan(0);
    
    // Verify at least one region link is visible and clickable
    await expect(regionLinks.first()).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
    
    // Verify cities section has data
    const cityLinks = page.getByTestId("sitemap-city-link");
    const cityCount = await cityLinks.count();
    
    // If API call failed, we'd have 0 cities
    // This test verifies that fetchCities() succeeded
    expect(cityCount).toBeGreaterThan(0);
    
    // Verify at least one city link is visible
    await expect(cityLinks.first()).toBeVisible({ timeout: process.env.CI ? 60000 : 30000 });
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
