import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { HERO_IMAGE } from "@config/hero-image";

const { preloadMock } = vi.hoisted(() => ({
  preloadMock: vi.fn(),
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: preloadMock,
}));

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
    preloadMock.mockClear();
    const html = renderToString(
      await Page({
        params: fulfilled({ locale: "ca" }),
        searchParams: fulfilled({}),
      }),
    );

    expect(html).toContain('data-testid="home-page-skeleton"');
    expect(html).toContain('data-testid="home-events-skeleton"');
    expect(html).toContain('href="/openapi.json"');
    // Fallback omits headings so the streamed HeroSection remains the sole <h1>
    // in raw HTML without duplicate <h1> tags or an <h2> before <h1>.
    expect(html).not.toMatch(/<h[1-6][\s>]/);
    // The hero skeleton carries the real hero text, so it has the same height.
    expect(html).toContain('data-testid="hero-section-skeleton"');
    // Hero LCP preloads use ReactDOM.preload (avoiding duplicate JSX <link> tags in React 19).
    expect(preloadMock).toHaveBeenCalledTimes(2);
    expect(preloadMock).toHaveBeenCalledWith(HERO_IMAGE.mobile.href, {
      as: "image",
      media: HERO_IMAGE.mobile.media,
      imageSrcSet: HERO_IMAGE.mobile.srcSet,
      imageSizes: HERO_IMAGE.mobile.sizes,
      type: HERO_IMAGE.mobile.type,
      fetchPriority: "high",
    });
    expect(preloadMock).toHaveBeenCalledWith(HERO_IMAGE.desktop.href, {
      as: "image",
      media: HERO_IMAGE.desktop.media,
      imageSrcSet: HERO_IMAGE.desktop.srcSet,
      imageSizes: HERO_IMAGE.desktop.sizes,
      type: HERO_IMAGE.desktop.type,
      fetchPriority: "high",
    });
    expect(html).not.toContain('rel="preload"');
  });
});
