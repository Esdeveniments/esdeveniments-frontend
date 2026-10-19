import { describe, it, expect } from "vitest";
import { formDataToBackendDTO } from "@utils/form-helpers";
import type { FormData } from "types/event";

const form: FormData = {
  title: "Concert",
  description: "Desc",
  startDate: "2026-11-01T18:00",
  startTime: null,
  endDate: "2026-11-01T20:00",
  endTime: null,
  region: { value: "1", label: "Barcelonès" },
  town: { value: "2", label: "Barcelona" },
  location: "Plaça",
  url: "",
  categories: [{ value: "3", label: "Música" }],
};

describe("formDataToBackendDTO (backend v2)", () => {
  it("sends no type or imageUrl, which the backend rejects", () => {
    const dto = formDataToBackendDTO(form);
    expect(dto).not.toHaveProperty("type");
    expect(dto).not.toHaveProperty("imageUrl");
  });

  it("sends a missing event URL as null", () => {
    expect(formDataToBackendDTO(form).url).toBeNull();
  });

  it("maps ids and categories to numbers", () => {
    const dto = formDataToBackendDTO(form);
    expect([dto.regionId, dto.cityId, dto.categories]).toEqual([1, 2, [3]]);
  });
});
