import { describe, it, expect } from "vitest";
import type { FormData } from "types/event";
import type { Option } from "types/common";
import {
  buildPublishContext,
  classifyPublishError,
  classifyUploadError,
} from "@utils/publica-analytics";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

function makeForm(overrides: Partial<FormData> = {}): FormData {
  return {
    title: "",
    description: "",
    type: "FREE",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    region: null,
    town: null,
    location: "",
    imageUrl: null,
    url: "",
    categories: [],
    email: "",
    ...overrides,
  };
}

describe("publica analytics helpers", () => {
  it("buildPublishContext returns privacy-safe booleans and counts", () => {
    const category: Option = { value: "1", label: "Test" };
    const town: Option = { value: "1", label: "Town" };
    const region: Option = { value: "2", label: "Region" };

    const form = makeForm({
      categories: [category],
      email: "a@b.com",
      url: "https://example.com",
      town,
      region,
      imageUrl: "https://img.example.com/x.jpg",
    });

    const ctx = buildPublishContext({
      form,
      imageFile: null,
      uploadedImageUrl: null,
    });

    expect(ctx.categories_count).toBe(1);
    expect(ctx.has_image_file).toBe(false);
    expect(ctx.has_email).toBe(true);
    expect(ctx.has_event_url).toBe(true);
    expect(ctx.has_town).toBe(true);
    expect(ctx.has_region).toBe(true);
    expect(ctx.has_uploaded_image).toBe(false);
  });

  it("classifyPublishError prioritizes categories correctly", () => {
    expect(
      classifyPublishError({
        isImageUploadLimit: true,
        isBodyLimit: true,
        isRequestTooLarge: true,
        isFormParsingError: true,
        isDuplicate: true,
      })
    ).toBe("image_too_large");

    expect(
      classifyPublishError({
        isImageUploadLimit: false,
        isBodyLimit: false,
        isRequestTooLarge: true,
        isFormParsingError: true,
        isDuplicate: true,
      })
    ).toBe("body_limit");

    expect(
      classifyPublishError({
        isImageUploadLimit: false,
        isBodyLimit: false,
        isRequestTooLarge: false,
        isFormParsingError: true,
        isDuplicate: true,
      })
    ).toBe("form_parsing");

    expect(
      classifyPublishError({
        isImageUploadLimit: false,
        isBodyLimit: false,
        isRequestTooLarge: false,
        isFormParsingError: false,
        isDuplicate: true,
      })
    ).toBe("duplicate");

    expect(
      classifyPublishError({
        isImageUploadLimit: false,
        isBodyLimit: false,
        isRequestTooLarge: false,
        isFormParsingError: false,
        isDuplicate: false,
      })
    ).toBe("generic");
  });

  it("classifyUploadError detects AbortError", () => {
    const err = new DOMException("Aborted", "AbortError");
    expect(classifyUploadError(err)).toBe("abort");
  });

  it("classifyUploadError detects too_large via known constant", () => {
    expect(classifyUploadError(new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR))).toBe(
      "too_large"
    );
  });

  it("classifyUploadError detects network-ish messages", () => {
    expect(classifyUploadError(new Error("Failed to fetch"))).toBe("network");
  });
});
