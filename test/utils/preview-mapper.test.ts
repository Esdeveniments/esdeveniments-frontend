import { describe, expect, it } from "vitest";
import { mapDraftToPreviewEvent } from "@components/ui/EventForm/preview/mapper";
import type { FormData } from "types/event";

const baseForm: FormData = {
  title: "Nit de Música",
  description: "Concert al centre cívic",
  type: "FREE",
  startDate: "2025-05-01T09:00:00.000Z",
  startTime: null,
  endDate: "2025-05-02T10:00:00.000Z",
  endTime: null,
  region: { value: "1", label: "Barcelona" },
  town: { value: "2", label: "Barcelona", latitude: 41.38, longitude: 2.17 },
  location: "Plaça Catalunya",
  imageUrl: null,
  url: "example.com",
  categories: [{ value: "1", label: "Música" }],
  email: "",
};

describe("mapDraftToPreviewEvent", () => {
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
      imageUrl: null,
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



