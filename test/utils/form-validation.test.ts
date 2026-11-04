import { describe, expect, it } from "vitest";
import { getZodValidationState } from "@utils/form-validation";
import type { EventFormSchemaType } from "types/event";

const validForm: EventFormSchemaType = {
  title: "Concert",
  description: "A concert",
  startDate: "2026-12-01",
  startTime: null,
  endDate: "2026-12-01",
  endTime: null,
  region: null,
  town: null,
  location: "Plaça Major",
  url: "",
  categories: [],
};

const image = new File(["x"], "a.png", { type: "image/png" });

describe("getZodValidationState image requirement", () => {
  it("blocks a dirty create form without an image", () => {
    const state = getZodValidationState(validForm, false, null, false);
    expect(state.isDisabled).toBe(true);
    expect(state.message).toBe("Image is required");
  });

  it("allows a dirty create form with an image", () => {
    const state = getZodValidationState(validForm, false, image, false);
    expect(state.isDisabled).toBe(false);
  });

  it("does not require an image in edit mode", () => {
    const state = getZodValidationState(validForm, false, null, true);
    expect(state.isDisabled).toBe(false);
  });

  it("does not report the missing image while the form is pristine", () => {
    const state = getZodValidationState(validForm, true, null, false);
    expect(state.isDisabled).toBe(false);
  });
});
