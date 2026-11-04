import { afterEach, describe, expect, it } from "vitest";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import type { FormData } from "types/event";

const baseForm: FormData = {
  title: "Nit de Música",
  description: "Concert al centre cívic",
  // The form only ever holds local "YYYY-MM-DDTHH:mm" (toLocalDateTimeString).
  startDate: "2025-05-01T09:00",
  startTime: null,
  endDate: "2025-05-02T10:00",
  endTime: null,
  region: { value: "1", label: "Barcelona" },
  town: { value: "2", label: "Barcelona", latitude: 41.38, longitude: 2.17 },
  location: "Plaça Catalunya",
  url: "example.com",
  categories: [{ value: "1", label: "Música" }],
  email: "",
};

describe("mapDraftToPreviewEvent", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("previews a time inside the spring-forward gap as typed, like publishing", () => {
    process.env.TZ = "Europe/Madrid";
    const result = mapDraftToPreviewEvent({
      form: { ...baseForm, startDate: "2027-03-28T02:30", endDate: "2027-03-28T04:00" },
      imageUrl: null,
    });

    expect([result.startDate, result.startTime]).toEqual(["2027-03-28", "02:30"]);
  });

  it("maps draft form into preview event with normalized values", () => {
    const result = mapDraftToPreviewEvent({
      form: baseForm,
      imageUrl: "data:image/png;base64,preview",
    });

    expect(result.slug).toBe("nit-de-musica");
    expect(result.url).toBe("https://example.com");
    expect(result.imageUrl).toContain("data:image/png;base64,preview");
    expect(result.city?.slug).toBe("barcelona");
    expect(result.region?.slug).toBe("barcelona");
    expect(result.categories[0]).toMatchObject({
      id: 1,
      name: "Música",
    });
  });

  it("provides safe fallbacks when optional fields are missing", () => {
    const minimalForm: FormData = {
      ...baseForm,
      title: "",
      description: "",
      url: "",
      categories: [],
    };

    const result = mapDraftToPreviewEvent({
      form: minimalForm,
      imageUrl: null,
    });

    expect(result.title).toBe("Esdeveniment");
    expect(result.url).toBe("");
    expect(result.categories).toHaveLength(0);
    expect(result.startDate).toBeDefined();
    expect(result.location).toBe(minimalForm.location);
  });
});



