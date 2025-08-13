import { test, expect } from "@playwright/test";

test.describe("Server sitemaps (news/google)", () => {
  test("/server-news-sitemap.xml responds 200 and contains urlset", async ({
    request,
  }) => {
    const res = await request.get("/server-news-sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<urlset|<sitemapindex/);
  });

  test("/server-google-news-sitemap.xml responds 200", async ({ request }) => {
    const res = await request.get("/server-google-news-sitemap.xml");
    expect(res.status()).toBe(200);
  });
});
