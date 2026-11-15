import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

// HomeContent waits on connection() (through generatePagesData). Keep it
// pending so the page's own Suspense fallback is what gets rendered: the UI
// users see on a first load or a client navigation.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(() => new Promise(() => {})),
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(() => new Promise(() => {})),
}));

import Page from "app/[locale]/page";

// use(params) reads an already-fulfilled thenable synchronously.
function fulfilled<T>(value: T): Promise<T> {
  return Object.assign(Promise.resolve(value), {
    status: "fulfilled",
    value,
  });
}

describe("home page loading fallback", () => {
  // An sr-only/noscript-only fallback rendered a blank <main> while loading.
  test("shows the home skeleton and keeps the crawler links", async () => {
    const html = renderToString(
      await Page({
        params: fulfilled({ locale: "ca" }),
        searchParams: fulfilled({}),
      }),
    );

    expect(html).toContain('data-testid="home-page-skeleton"');
    expect(html).toContain('data-testid="home-events-skeleton"');
    expect(html).toContain('href="/openapi.json"');
    // Crawlers that don't run JS read headings in source order.
    expect(html.match(/<h[1-6][\s>]/)?.[0]).toBe("<h1 ");
    // The hero skeleton carries the real hero text, so it has the same height.
    expect(html).toContain('data-testid="hero-section-skeleton"');
  });
});
