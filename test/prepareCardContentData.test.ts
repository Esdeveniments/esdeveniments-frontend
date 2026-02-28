import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";

const truncateStringMock =
  vi.fn<(value: string, maxLength: number) => string>();

const formatCardDateMock = vi.fn<
  (start: string, end?: string, locale?: string) => { cardDate: string; isMultiDay: boolean }
>();

const buildEventPlaceLabelsMock = vi.fn<
  (args: {
    cityName?: string;
    regionName?: string;
    location?: string;
  }) => { primaryLabel: string; secondaryLabel: string; cityLabel: string; regionLabel: string }
>();

vi.mock("@utils/helpers", () => ({
  truncateString: (value: string, maxLength: number) =>
    truncateStringMock(value, maxLength),
}));

vi.mock("@utils/location-helpers", () => ({
  buildEventPlaceLabels: (args: {
    cityName?: string;
    regionName?: string;
    location?: string;
  }) => buildEventPlaceLabelsMock(args),
}));

vi.mock("@utils/date-helpers", () => ({
  formatCardDate: (start: string, end?: string, locale?: string) =>
    formatCardDateMock(start, end, locale),
  normalizeEndTime: (start: string | null, end: string | null) => {
    if (!end) return null;
    return start && start === end ? null : end;
  },
  formatTimeForAPI: (time: string) => {
    if (!time || !time.includes(":")) return "";
    const [hour, minute] = time.split(":");
    return `${hour}:${minute}`;
  },
}));

vi.mock("@utils/category-helpers", () => ({
  getLocalizedCategoryLabelFromConfig: (slug: string, fallback: string, _t: unknown) =>
    `localized:${slug || fallback}`,
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
      (value: string, _maxLength: number) => value
    );

    buildEventPlaceLabelsMock.mockImplementation(
      ({ cityName, regionName }) => ({
        primaryLabel: cityName || "",
        secondaryLabel: regionName || "",
        cityLabel: cityName || "",
        regionLabel: regionName || "",
      })
    );

    formatCardDateMock.mockReturnValue({
      cardDate: "Dj. 1 gen.",
      isMultiDay: false,
    });
  });

  it("uses abbreviated card date format", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent();

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(formatCardDateMock).toHaveBeenCalledWith(
      "2025-01-01",
      "2025-01-02",
      "ca"
    );
    expect(result.cardDate).toBe("Dj. 1 gen.");
  });

  it("uses buildEventPlaceLabels for location with city + region", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent();

    prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(buildEventPlaceLabelsMock).toHaveBeenCalledWith({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Location",
    });
  });

  it("passes through title without truncation (CSS line-clamp handles it)", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);
    const event = makeEvent({ title: "A very long event title that should not be truncated by data prep" });

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.title).toBe("A very long event title that should not be truncated by data prep");
  });

  it("omits time display when startTime is null (no 'Check schedules' filler)", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent({ startTime: null, endTime: null });

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.timeDisplay).toBe("");
  });

  it("shows time when startTime is valid", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent({ startTime: "14:30", endTime: "16:00" });

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.timeDisplay).toBe("14:30 – 16:00");
  });

  it("shows only start time when endTime equals startTime", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent({ startTime: "19:00", endTime: "19:00" });

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.timeDisplay).toBe("19:00");
  });

  it("localizes category when tCategories is provided", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);
    const tCategories = vi.fn((key: string) => `cat:${key}`);

    const event = makeEvent();

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
      tCategories,
    });

    expect(result.categoryLabel).toBe("localized:music");
  });

  it("falls back to raw category name without tCategories", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);

    const event = makeEvent();

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.categoryLabel).toBe("Music");
  });

  it("skips category resolution for compact variant", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);
    const tCategories = vi.fn((key: string) => `cat:${key}`);

    const event = makeEvent();

    const result = prepareCardContentData({
      event,
      variant: "compact",
      locale: "ca",
      tCard,
      tTime,
      tCategories,
    });

    expect(result.categoryLabel).toBeUndefined();
  });

  it("hides favorite button when slug is empty", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => key);

    const event = makeEvent({ slug: "" });

    const result = prepareCardContentData({
      event,
      variant: "standard",
      locale: "ca",
      tCard,
      tTime,
    });

    expect(result.shouldShowFavoriteButton).toBe(false);
  });

  it("returns the variant passed in", () => {
    const tCard = vi.fn((key: string) => key);
    const tTime = vi.fn((key: string) => `time:${key}`);
    const event = makeEvent();

    const standard = prepareCardContentData({ event, variant: "standard", locale: "ca", tCard, tTime });
    expect(standard.variant).toBe("standard");

    const carousel = prepareCardContentData({ event, variant: "carousel", locale: "ca", tCard, tTime });
    expect(carousel.variant).toBe("carousel");

    const compact = prepareCardContentData({ event, variant: "compact", locale: "ca", tCard, tTime });
    expect(compact.variant).toBe("compact");
  });
});
