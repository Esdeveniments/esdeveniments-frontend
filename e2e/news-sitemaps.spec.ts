import { test, expect } from "@playwright/test";
import { parseAndValidateSitemap } from "../test/sitemap-helpers";

test.describe("Server sitemaps (news/google)", () => {
  test("/server-news-sitemap.xml responds 200 and contains urlset", async ({
    request,
  }) => {
    const res = await request.get("/server-news-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<urlset|<sitemapindex/);

    // Parse XML and validate structure
    const urls = parseAndValidateSitemap(text);

    // Check lastmod dates are not 2023
    urls.forEach(
      (url: { lastmod?: string; news?: { publication_date?: string } }) => {
        if (url.lastmod) {
          expect(url.lastmod).not.toContain("2023");
        }
      }
    );
  });

  test("/server-google-news-sitemap.xml responds 200 or 404", async ({
    request,
  }) => {
    const res = await request.get("/server-google-news-sitemap.xml");
    const status = res.status();

    // Google News sitemap returns 404 when there are no news items (last 48h)
    // This is valid because Google News sitemaps must have at least one URL
    if (status === 404) {
      // Empty sitemap is valid - no news in the last 48 hours
      expect(status).toBe(404);
      return;
    }

    // When there are news items, should return 200 with valid XML
    expect(status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");

    // Parse XML and validate structure
    const urls = parseAndValidateSitemap(text);

    // Check publication dates are not 2023
    urls.forEach(
      (url: { lastmod?: string; news?: { publication_date?: string } }) => {
        if (url.news && url.news.publication_date) {
          expect(url.news.publication_date).not.toContain("2023");
        }
      }
    );
  });
});
