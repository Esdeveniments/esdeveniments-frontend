import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

// The event read never resolves, so the page's Suspense fallbacks are what
// get rendered: the UI users see on a first load or a client navigation.
vi.mock("@lib/api/events", () => ({
  getCachedEventBySlug: vi.fn(() => new Promise(() => {})),
}));
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(() => new Promise(() => {})),
}));

import Page from "app/[locale]/e/[eventId]/page";

// use(params) reads an already-fulfilled thenable synchronously.
function fulfilled<T>(value: T): Promise<T> {
  return Object.assign(Promise.resolve(value), {
    status: "fulfilled",
    value,
  });
}

describe("event page loading fallback", () => {
  // Event slugs are unknown at build time, so the prerendered shell is
  // rendered with params pending. A fallback that reads params can't be in
  // it, and the shell showed a blank <main> until the stream resumed.
  test("the generic shell shows the skeleton while params are pending", () => {
    const html = renderToString(
      <Page
        params={new Promise(() => {}) as never}
        searchParams={fulfilled({})}
      />,
    );

    expect(html).toContain('data-testid="event-detail-skeleton"');
  });

  test("keeps the slug h1 for crawlers next to the skeleton", () => {
    const html = renderToString(
      <Page
        params={fulfilled({ locale: "ca", eventId: "concert-de-jazz" })}
        searchParams={fulfilled({})}
      />,
    );

    expect(html).toContain('data-testid="event-detail-skeleton"');
    expect(html).toMatch(/<h1 class="sr-only">concert de jazz<\/h1>/);
  });
});
