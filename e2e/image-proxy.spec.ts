import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for image proxy functionality
 * Verifies that external images are correctly proxied and optimized
 * across different page types and components
 */

test.describe("Image Proxy", () => {
  /**
   * Helper to check if images on page are loading correctly via proxy
   */
  async function verifyImagesLoad(page: Page, context: string) {
    // Wait for images to be present
    const images = page.locator("img");
    const count = await images.count();

    if (count === 0) {
      // Some pages may not have images, skip verification
      return;
    }

    // Check at least one image loaded successfully
    // We check for naturalWidth > 0 which indicates the image loaded
    const firstImage = images.first();
    await expect(firstImage).toBeVisible({ timeout: 10000 });

    // Verify the image actually loaded (naturalWidth > 0)
    const loaded = await firstImage.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0;
    });
    expect(loaded, `Image should load in ${context}`).toBe(true);
  }

  /**
   * Helper to verify proxy URL structure for external images
   */
  async function verifyProxyUrls(page: Page) {
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const src = await images.nth(i).getAttribute("src");
      if (src && src.includes("/api/image-proxy")) {
        // Verify proxy URL has required parameters
        expect(src).toContain("url=");
        // May have optimization params
        if (src.includes("&w=")) {
          expect(src).toMatch(/&w=\d+/);
        }
        if (src.includes("&q=")) {
          expect(src).toMatch(/&q=\d+/);
        }
      }
    }
  }

  test.describe("Home page images", () => {
    test("event cards load images via proxy", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });

      // Wait for event cards to render
      await page.waitForSelector('[data-testid="event-card"], article', {
        timeout: 30000,
      });

      await verifyImagesLoad(page, "home page event cards");
      await verifyProxyUrls(page);
    });
  });

  test.describe("Event detail page images", () => {
    test("event detail image loads via proxy", async ({ page }) => {
      // Navigate to sitemap to find a real event
      await page.goto("/sitemap", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Try to find an event link
      const cityLink = page.getByTestId("sitemap-city-link").first();
      if (await cityLink.isVisible({ timeout: 5000 })) {
        await cityLink.click();
        await page.waitForLoadState("domcontentloaded");

        const monthLink = page.locator('nav[role="list"] a').first();
        if (await monthLink.isVisible({ timeout: 5000 })) {
          await monthLink.click();
          await page.waitForLoadState("domcontentloaded");

          const eventLink = page.locator('a[href^="/e/"]').first();
          if (await eventLink.isVisible({ timeout: 5000 })) {
            await eventLink.click();
            await page.waitForURL(/\/e\/[^/]+$/, { timeout: 30000 });
            await page.waitForLoadState("domcontentloaded");

            await verifyImagesLoad(page, "event detail page");
            await verifyProxyUrls(page);
            return;
          }
        }
      }

      // If no events found, skip test gracefully
      test.skip(true, "No events available for testing");
    });
  });

  test.describe("Place page images", () => {
    test("place listing loads images via proxy", async ({ page }) => {
      // Test a known place
      await page.goto("/barcelona", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for content
      await page.waitForSelector('[data-testid="event-card"], article, main', {
        timeout: 30000,
      });

      await verifyImagesLoad(page, "barcelona place page");
      await verifyProxyUrls(page);
    });
  });

  test.describe("Image proxy API direct", () => {
    test("returns optimized image with correct headers", async ({ request }) => {
      // Test with a reliable public image (picsum.photos is more reliable than placeholder.com)
      const testImageUrl = "https://picsum.photos/400/300.jpg";
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(testImageUrl)}&w=200&q=50`;

      const response = await request.get(proxyUrl);

      // picsum.photos may redirect, accept 200 or skip if service is down
      if (response.status() === 502) {
        test.skip(true, "Test image service unavailable");
        return;
      }

      // Should return 200 OK
      expect(response.status()).toBe(200);

      // Should have image content type
      const contentType = response.headers()["content-type"];
      expect(contentType).toMatch(/^image\/(jpeg|webp|avif|png|gif)$/);

      // Should have cache control header
      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain("public");
    });

    test("returns placeholder for invalid URLs", async ({ request }) => {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent("https://invalid-domain-that-does-not-exist-xyz.com/img.jpg")}`;

      const response = await request.get(proxyUrl);

      // Should return fallback (502 with no-store)
      expect(response.status()).toBe(502);

      const contentType = response.headers()["content-type"];
      expect(contentType).toBe("image/png");

      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("no-store");
    });

    test("respects Accept header for format selection", async ({ request }) => {
      const testImageUrl = "https://picsum.photos/400/300.jpg";
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(testImageUrl)}&w=200&q=50`;

      // Request with AVIF preference
      const avifResponse = await request.get(proxyUrl, {
        headers: { Accept: "image/avif,image/webp,image/*" },
      });

      if (avifResponse.status() === 502) {
        test.skip(true, "Test image service unavailable");
        return;
      }

      if (avifResponse.status() === 200) {
        const contentType = avifResponse.headers()["content-type"];
        // Should prefer AVIF when browser supports it
        expect(contentType).toMatch(/^image\/(avif|webp|jpeg)$/);
      }

      // Request with WebP preference (no AVIF)
      const webpResponse = await request.get(proxyUrl, {
        headers: { Accept: "image/webp,image/*" },
      });

      if (webpResponse.status() === 200) {
        const contentType = webpResponse.headers()["content-type"];
        // Should use WebP when browser supports it
        expect(contentType).toMatch(/^image\/(webp|jpeg)$/);
      }
    });

    test("includes optimization headers", async ({ request }) => {
      const testImageUrl = "https://picsum.photos/800/600.jpg";
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(testImageUrl)}&w=400&q=60`;

      const response = await request.get(proxyUrl, {
        headers: { Accept: "image/avif,image/webp,image/*" },
      });

      if (response.status() === 502) {
        test.skip(true, "Test image service unavailable");
        return;
      }

      if (response.status() === 200) {
        const headers = response.headers();

        // Check for optimization indicator headers
        if (headers["x-image-proxy-optimized"]) {
          expect(headers["x-image-proxy-optimized"]).toMatch(
            /^(true|skipped-small|skipped-animated)$/
          );
        }

        // If optimized, should have savings info
        if (headers["x-image-proxy-optimized"] === "true") {
          expect(headers["x-image-proxy-savings"]).toBeTruthy();
          expect(headers["x-image-proxy-original-size"]).toBeTruthy();
          expect(headers["x-image-proxy-final-size"]).toBeTruthy();
        }
      }
    });
  });

  test.describe("Related events images", () => {
    test("related events section loads images", async ({ page }) => {
      // Navigate to an event detail page
      await page.goto("/sitemap", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      const cityLink = page.getByTestId("sitemap-city-link").first();
      if (await cityLink.isVisible({ timeout: 5000 })) {
        await cityLink.click();
        await page.waitForLoadState("domcontentloaded");

        const monthLink = page.locator('nav[role="list"] a').first();
        if (await monthLink.isVisible({ timeout: 5000 })) {
          await monthLink.click();
          await page.waitForLoadState("domcontentloaded");

          const eventLink = page.locator('a[href^="/e/"]').first();
          if (await eventLink.isVisible({ timeout: 5000 })) {
            await eventLink.click();
            await page.waitForURL(/\/e\/[^/]+$/, { timeout: 30000 });
            await page.waitForLoadState("domcontentloaded");

            // Check for related events section
            const relatedSection = page.locator(
              '[data-testid="related-events"], section:has-text("Esdeveniments relacionats")'
            );
            if (await relatedSection.isVisible({ timeout: 5000 })) {
              const relatedImages = relatedSection.locator("img");
              if ((await relatedImages.count()) > 0) {
                await verifyImagesLoad(page, "related events");
              }
            }
            return;
          }
        }
      }

      test.skip(true, "No events with related events available");
    });
  });
});
