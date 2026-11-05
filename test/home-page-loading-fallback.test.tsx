import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

// HomeContent waits on connection() (through generatePagesData). Keep it
// pending so the page's own Suspense fallback is what gets rendered: the UI
// users see on a first load or a client navigation.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(() => new Promise(() => {})),
}));
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
  test("shows the home skeleton and keeps the crawler links", () => {
    const html = renderToString(
      <Page
        params={fulfilled({ locale: "ca" })}
        searchParams={fulfilled({})}
      />,
    );

    expect(html).toContain('data-testid="home-page-skeleton"');
    expect(html).toContain('data-testid="home-events-skeleton"');
    expect(html).toContain('href="/openapi.json"');
  });
});
