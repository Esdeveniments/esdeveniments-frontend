/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";

test.describe("Server sitemaps (news/google)", () => {
  test("/server-news-sitemap.xml responds 200 and contains urlset", async ({
    request,
  }) => {
    const res = await request.get("/server-news-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<urlset|<sitemapindex/);

    // Parse XML and validate structure
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.urlset).toBeDefined();
    expect(Array.isArray(xmlObj.urlset.url)).toBe(true);

    // Check lastmod dates are not 2023
    xmlObj.urlset.url.forEach((url: any) => {
      if (url.lastmod) {
        expect(url.lastmod).not.toContain("2023");
      }
    });
  });

  test("/server-google-news-sitemap.xml responds 200", async ({ request }) => {
    const res = await request.get("/server-google-news-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");

    // Parse XML and validate structure
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.urlset).toBeDefined();
    if (xmlObj.urlset.url) {
      expect(Array.isArray(xmlObj.urlset.url)).toBe(true);

      // Check publication dates are not 2023
      xmlObj.urlset.url.forEach((url: any) => {
        if (url.news && url.news.publication_date) {
          expect(url.news.publication_date).not.toContain("2023");
        }
      });
    }
  });
});
