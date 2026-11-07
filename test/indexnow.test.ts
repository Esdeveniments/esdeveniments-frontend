import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const originalFetch = global.fetch;

async function loadWithSiteUrl(siteUrl: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  return import("@lib/seo/indexnow");
}

describe("submitEventsToIndexNow", () => {
  let mockFetch: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    mockFetch = vi.fn<typeof fetch>(
      async () => new Response("", { status: 202 }),
    );
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("submits every locale URL of each distinct slug from production", async () => {
    const { submitEventsToIndexNow } = await loadWithSiteUrl(
      "https://www.esdeveniments.cat",
    );

    await submitEventsToIndexNow(["old-slug", "new-slug", "new-slug", null]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://api.indexnow.org/indexnow");
    const body = JSON.parse(String(init?.body));
    expect(body.host).toBe("www.esdeveniments.cat");
    expect(body.key).toMatch(/^[0-9a-f]{32}$/);
    expect(body.urlList).toEqual([
      "https://www.esdeveniments.cat/e/old-slug",
      "https://www.esdeveniments.cat/es/e/old-slug",
      "https://www.esdeveniments.cat/en/e/old-slug",
      "https://www.esdeveniments.cat/e/new-slug",
      "https://www.esdeveniments.cat/es/e/new-slug",
      "https://www.esdeveniments.cat/en/e/new-slug",
    ]);
  });

  it("never submits from staging or previews", async () => {
    const { submitEventsToIndexNow } = await loadWithSiteUrl(
      "https://staging.esdeveniments.cat",
    );

    await submitEventsToIndexNow(["slug"]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips the request when there is no slug", async () => {
    const { submitEventsToIndexNow } = await loadWithSiteUrl(
      "https://www.esdeveniments.cat",
    );

    await submitEventsToIndexNow([undefined, ""]);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
