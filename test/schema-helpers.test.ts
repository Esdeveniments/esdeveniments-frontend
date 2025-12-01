import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateJsonData } from "@utils/schema-helpers";
import type { EventSummaryResponseDTO } from "types/api/event";

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash",
  slug: "test-event",
  title: "Test Event",
  type: "FREE",
  url: "https://example.com/event",
  description: "Event description",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2025-01-10",
  startTime: null,
  endDate: "2025-01-10",
  endTime: null,
  location: "Museu d'Art",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

const createEvent = (
  overrides: Partial<EventSummaryResponseDTO> = {}
): EventSummaryResponseDTO => ({
  ...baseEvent,
  ...overrides,
});

describe("generateJsonData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fills address, description, image and endDate fallbacks when missing", () => {
    const schema = generateJsonData(
      createEvent({
        description: "",
        location: "",
        imageUrl: "",
        endDate: null as unknown as string,
      })
    );

    expect(schema.location.address.addressLocality).toBe("Catalunya");
    expect(schema.description).toBe("Test Event a Catalunya");
    expect(schema.image[0]).toMatch(/logo-seo-meta\.webp$/);
    expect(schema.endDate).toBe(schema.startDate);
    expect(schema.offers).toBeDefined();
    expect(schema.offers!.price).toBe(0);
  });

  it("emits meaningful offers for paid events without price information", () => {
    const schema = generateJsonData(
      createEvent({
        type: "PAID",
        description: "Gran concert",
        location: "Palau de la Música",
      })
    );

    expect(schema.isAccessibleForFree).toBe(false);
    expect(schema.offers).toBeDefined();
    expect(schema.offers!.price).toBe("Consultar");
    expect(schema.performer.name).toBe("Palau de la Música");
    expect(schema.location.address.streetAddress).toBe("Palau de la Música");
  });

  it("normalizes endDate format even when backend omits it", () => {
    const schema = generateJsonData(
      createEvent({
        endDate: "" as unknown as string,
        startTime: "10:00",
        endTime: "12:00",
      })
    );

    expect(schema.endDate).toBe("2025-01-10T12:00");
    expect(schema.startDate).toBe("2025-01-10T10:00");
  });
});
