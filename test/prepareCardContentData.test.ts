import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { AppLocale } from "types/i18n";
import type { CitySummaryResponseDTO } from "types/api/city";

const truncateStringMock =
  vi.fn<(value: string, maxLength: number) => string>();
const getFormattedDateMock = vi.fn<
  (
    startDate: string,
    endDate: string,
    locale: AppLocale
  ) => {
    formattedStart: string;
    formattedEnd: string | null;
    nameDay: string;
  }
>();

const buildDisplayLocationMock =
  vi.fn<
    (args: {
      location: string;
      cityName: string;
      regionName: string;
      hidePlaceSegments: boolean;
    }) => string
  >();

vi.mock("@utils/helpers", () => ({
  truncateString: (value: string, maxLength: number) =>
    truncateStringMock(value, maxLength),
  getFormattedDate: (startDate: string, endDate: string, locale: AppLocale) =>
    getFormattedDateMock(startDate, endDate, locale),
}));

vi.mock("@utils/location-helpers", () => ({
  buildDisplayLocation: (args: {
    location: string;
    cityName: string;
    regionName: string;
    hidePlaceSegments: boolean;
  }) => buildDisplayLocationMock(args),
}));

import { prepareCardContentData } from "@components/ui/common/cardContent/prepareCardContentData";

function makeEvent(
  overrides: Partial<EventSummaryResponseDTO> = {}
): EventSummaryResponseDTO {
  const city: CitySummaryResponseDTO = {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
    latitude: 41.3874,
    longitude: 2.1686,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  };

  return {
    id: "uuid-1",
    hash: "hash",
    slug: "event-slug",
    title: "Event Title",
    type: "FREE",
    url: "https://example.com",
    description: "desc",
    imageUrl: "https://img",
    startDate: "2025-01-01",
    startTime: null,
    endDate: "2025-01-02",
    endTime: null,
    location: "Location",
    visits: 10,
    origin: "SCRAPE",
    city,
    region: { id: 2, name: "Barcelonès", slug: "barcelones" },
    province: { id: 3, name: "Barcelona", slug: "barcelona" },
    categories: [{ id: 1, name: "Music", slug: "music" }],
    ...overrides,
  };
}

describe("prepareCardContentData", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    truncateStringMock.mockImplementation(
      (value: string, maxLength: number) => `${value}__${maxLength}`
    );

    buildDisplayLocationMock.mockImplementation(
      ({ location, cityName, regionName }) =>
        `LOC:${location}|${cityName}|${regionName}`
    );

    getFormattedDateMock.mockReturnValue({
      formattedStart: "FS",
      formattedEnd: null,
      nameDay: "ND",
    });
  });

  it("uses preformatted event dates when preferred and available", () => {
    const tCard = vi.fn((key: string, values?: Record<string, string>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent({
      formattedStart: "PRE_START",
      formattedEnd: null,
      nameDay: "PRE_DAY",
    });

    const result = prepareCardContentData({
      event,
      isHorizontal: true,
      locale: "ca",
      tCard,
      tTime,
      preferPreformattedDates: true,
    });

    expect(getFormattedDateMock).not.toHaveBeenCalled();

    expect(truncateStringMock).toHaveBeenCalledWith("Event Title", 30);
    expect(buildDisplayLocationMock).toHaveBeenCalledWith({
      location: "Location",
      cityName: "Barcelona",
      regionName: "Barcelonès",
      hidePlaceSegments: false,
    });
    expect(truncateStringMock).toHaveBeenCalledWith(
      "LOC:Location|Barcelona|Barcelonès",
      80
    );

    expect(tCard).toHaveBeenCalledWith("dateSingle", {
      nameDay: "PRE_DAY",
      start: "PRE_START",
    });

    expect(tTime).toHaveBeenCalledWith("consult");
    expect(tTime).toHaveBeenCalledWith("startsAt", { time: "{time}" });
    expect(tTime).toHaveBeenCalledWith("range", {
      start: "{start}",
      end: "{end}",
    });
    expect(tTime).toHaveBeenCalledWith("simpleRange", {
      start: "{start}",
      end: "{end}",
    });

    expect(result.shouldShowFavoriteButton).toBe(true);
    expect(result.favoriteLabels).toEqual({
      add: "favoriteAddAria",
      remove: "favoriteRemoveAria",
    });
  });

  it("falls back to getFormattedDate when preformatted dates are not preferred", () => {
    const tCard = vi.fn((key: string, values?: Record<string, string>) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
    const tTime = vi.fn((key: string) => `time:${key}`);

    getFormattedDateMock.mockReturnValue({
      formattedStart: "FROM_HELPER",
      formattedEnd: "TO_HELPER",
      nameDay: "DAY_HELPER",
    });

    const event = makeEvent({
      formattedStart: "PRE_START",
      formattedEnd: "PRE_END",
      nameDay: "PRE_DAY",
    });

    const result = prepareCardContentData({
      event,
      isHorizontal: false,
      locale: "ca",
      tCard,
      tTime,
      preferPreformattedDates: false,
    });

    expect(getFormattedDateMock).toHaveBeenCalledWith(
      "2025-01-01",
      "2025-01-02",
      "ca"
    );

    expect(truncateStringMock).toHaveBeenCalledWith("Event Title", 75);

    expect(tCard).toHaveBeenCalledWith("dateRange", {
      start: "FROM_HELPER",
      end: "TO_HELPER",
    });

    expect(result.eventDate).toContain("dateRange");
  });

  it("hides favorite button when slug is empty", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => key);

    const event = makeEvent({ slug: "" });

    const result = prepareCardContentData({
      event,
      isHorizontal: false,
      locale: "ca",
      tCard,
      tTime,
      preferPreformattedDates: true,
    });

    expect(result.shouldShowFavoriteButton).toBe(false);
  });
});
