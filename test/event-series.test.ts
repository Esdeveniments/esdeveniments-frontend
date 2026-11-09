import { describe, expect, it, vi } from "vitest";
import type { EventSummaryResponseDTO } from "types/api/event";
import {
  pickNextEdition,
  seriesKey,
  seriesSearchTerm,
} from "@utils/event-series";
import { fetchNextEdition } from "@lib/api/event-series";
import { fetchEventsExternalResult } from "@lib/api/events-external";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));
vi.mock("@lib/api/events-external", () => ({
  fetchEventsExternalResult: vi.fn(),
}));

describe("seriesKey", () => {
  it.each([
    ["54è Pessebre Vivent d’Osona", "55è Pessebre Vivent d'Osona 2026"],
    ["XX Rua de Carnaval de Castellví de la Marca", "XXI Rua de Carnaval de Castellví de la Marca"],
    ["Carnestoltes 2026 a Sant Julià de Vilatorta", "Carnestoltes 2027 a Sant Julià de Vilatorta"],
    ["3a edició de la Fira del Vi", "4a Edició de la Fira del Vi"],
  ])("%s and %s are one series", (a, b) => {
    expect(seriesKey(a)).not.toBeNull();
    expect(seriesKey(a)).toBe(seriesKey(b));
  });

  it("keeps the Catalan 'i' and words that differ", () => {
    expect(seriesKey("Rua i Ball de Carnaval")).toBe("rua i ball de carnaval");
    expect(seriesKey("Festa del Foc")).not.toBe(seriesKey("Festa del Foc i de l'aigua"));
  });

  it.each(["Carnestoltes", "Concert 2026", "XX"])("%s is too short to be a series", (title) => {
    expect(seriesKey(title)).toBeNull();
  });
});

describe("seriesSearchTerm", () => {
  it.each([
    ["54è Pessebre Vivent d’Osona 2025", "Pessebre Vivent d"],
    ["55è Pessebre Vivent d'Osona", "Pessebre Vivent d"],
    ["XX Rua de Carnaval de Castellví de la Marca", "Rua de Carnaval de Castellví de la Marca"],
    ["Els Pastorets de Cardedeu", "Els Pastorets de Cardedeu"],
    ["Carnestoltes 2026 a Sant Julià de Vilatorta", "a Sant Julià de Vilatorta"],
  ])("%s → %s", (title, term) => {
    expect(seriesSearchTerm(title)).toBe(term);
  });
});

describe("pickNextEdition", () => {
  const candidate = (
    slug: string,
    title: string,
    startDate: string,
    city = "cardedeu",
  ) => ({ slug, title, startDate, city: { slug: city } }) as EventSummaryResponseDTO;
  const ended = { slug: "festa-2025", title: "Festa del Foc 2025", citySlug: "cardedeu" };

  it("takes the earliest same-series event in the same town", () => {
    const next = pickNextEdition(ended, [
      candidate("festa-2025", "Festa del Foc 2025", "2025-06-28"),
      candidate("other-town", "Festa del Foc 2026", "2026-06-20", "granollers"),
      candidate("aigua", "Festa del Foc i de l'aigua", "2026-06-21"),
      candidate("festa-2027", "Festa del Foc 2027", "2027-06-26"),
      candidate("festa-2026", "Festa del Foc 2026", "2026-06-27"),
    ]);
    expect(next?.slug).toBe("festa-2026");
  });

  it("finds nothing for a title too short to be a series", () => {
    expect(
      pickNextEdition({ ...ended, title: "Concert" }, [
        candidate("c", "Concert", "2026-06-27"),
      ]),
    ).toBeNull();
  });
});

describe("fetchNextEdition", () => {
  const event = (slug: string, title: string, city: string) =>
    ({ slug, title, startDate: "2026-12-05", city: { slug: city } }) as EventSummaryResponseDTO;
  const page = (content: EventSummaryResponseDTO[], last: boolean) => ({
    data: { content, last, currentPage: 0, pageSize: 50, totalElements: 0, totalPages: 1 },
    error: null,
    status: 200,
  });
  const ended = { slug: "fira-2025", title: "Fira de Nadal 2025", citySlug: "olot" };

  it("searches again in the town when a cut-off page has no match", async () => {
    const fetchMock = vi.mocked(fetchEventsExternalResult);
    fetchMock
      .mockResolvedValueOnce(page([event("vic", "Fira de Nadal 2026", "vic")], false))
      .mockResolvedValueOnce(page([event("olot-2026", "Fira de Nadal 2026", "olot")], true));

    expect((await fetchNextEdition(ended))?.slug).toBe("olot-2026");
    expect(fetchMock.mock.calls[1][0]).toMatchObject({ place: "olot", term: "Fira de Nadal" });
  });

  it("doesn't search again when the page was complete", async () => {
    const fetchMock = vi.mocked(fetchEventsExternalResult);
    fetchMock.mockReset().mockResolvedValueOnce(page([], true));

    expect(await fetchNextEdition({ ...ended, slug: "fira-2024" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
