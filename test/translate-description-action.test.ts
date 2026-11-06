import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventDetailResponseDTO } from "types/api/event";

const { getCachedEventBySlug, requestHeaders } = vi.hoisted(() => ({
  getCachedEventBySlug: vi.fn<(slug: string) => Promise<EventDetailResponseDTO | null>>(),
  requestHeaders: { current: new Headers() },
}));

vi.mock("@lib/api/events", () => ({ getCachedEventBySlug }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.current }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { translateDescription } from "app/[locale]/e/[eventId]/actions";

const SLUG = "concert-de-nadal-2026-5df20b79-fb9b-4964-9c5a-4697ecc3f5cb";
let ipCounter = 0;

function eventWith(description: string) {
  return { slug: SLUG, description } as EventDetailResponseDTO;
}

function deeplOk(text = "Translated") {
  return Response.json({ translations: [{ text }] });
}

beforeEach(() => {
  vi.restoreAllMocks();
  getCachedEventBySlug.mockReset();
  vi.stubEnv("DEEPL_API_KEY", "test-key");
  // A fresh client IP per test so the per-IP limit doesn't leak across tests.
  requestHeaders.current = new Headers({ "x-real-ip": `198.51.100.${++ipCounter}` });
});

describe("translateDescription", () => {
  it("translates the stored description of the event, not client text", async () => {
    getCachedEventBySlug.mockResolvedValue(eventWith(`Concert ${ipCounter}`));
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(deeplOk());

    const result = await translateDescription({ slug: SLUG, targetLang: "es" });

    expect(result).toEqual({ ok: true, translation: "Translated" });
    expect(getCachedEventBySlug).toHaveBeenCalledWith(SLUG);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body)).text).toEqual([`Concert ${ipCounter}`]);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects a malformed slug without loading or translating", async () => {
    const fetchMock = vi.spyOn(global, "fetch");

    const result = await translateDescription({
      slug: "../../x",
      targetLang: "es",
    });

    expect(result).toEqual({ ok: false, error: "not-found" });
    expect(getCachedEventBySlug).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not-found for an unknown event", async () => {
    getCachedEventBySlug.mockResolvedValue(null);
    const fetchMock = vi.spyOn(global, "fetch");

    const result = await translateDescription({ slug: SLUG, targetLang: "en" });

    expect(result).toEqual({ ok: false, error: "not-found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send an over-long description to DeepL", async () => {
    getCachedEventBySlug.mockResolvedValue(eventWith("a".repeat(20_001)));
    const fetchMock = vi.spyOn(global, "fetch");

    const result = await translateDescription({ slug: SLUG, targetLang: "en" });

    expect(result).toEqual({ ok: false, error: "too-long" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate-limits one client IP", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async () => deeplOk());
    let call = 0;
    getCachedEventBySlug.mockImplementation(async () =>
      eventWith(`Text ${ipCounter}-${++call}`),
    );

    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(await translateDescription({ slug: SLUG, targetLang: "es" }));
    }

    expect(results.slice(0, 10).every((r) => r.ok)).toBe(true);
    expect(results[10]).toEqual({ ok: false, error: "rate-limited" });
  });
});
