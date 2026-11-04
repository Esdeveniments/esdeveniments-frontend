import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Categories never resolve, so PlacePageGate stays suspended and the page's
// own Suspense fallback is what gets rendered: the UI users see on a first
// load or a client navigation until the backend answers.
vi.mock("@lib/api/categories", () => ({
  fetchCategories: vi.fn(() => new Promise(() => {})),
}));
// The gate also starts the place and events reads before it awaits
// categories; keep them off the network too.
vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(() => new Promise(() => {})),
}));

import Page from "app/[locale]/[place]/page";

// use(params) reads an already-fulfilled thenable synchronously.
function fulfilled<T>(value: T): Promise<T> {
  return Object.assign(Promise.resolve(value), {
    status: "fulfilled",
    value,
  });
}

describe("[place] page loading fallback", () => {
  // The page wraps everything in its own <Suspense>, so [place]/loading.tsx
  // never shows for this route. An sr-only-only fallback renders a blank
  // <main> (only the footer visible) while the page loads.
  test("shows the place skeleton and keeps the h1 for crawlers", () => {
    const html = renderToString(
      <Page
        params={fulfilled({ locale: "ca", place: "barcelona" })}
        searchParams={fulfilled({})}
      />,
    );

    expect(html).toContain('data-testid="events-list-skeleton"');
    expect(html).toMatch(/<h1 class="sr-only">Barcelona<\/h1>/);
  });
});
