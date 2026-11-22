import { describe, it, expect } from "vitest";
import type { FormData } from "types/event";
import type { Option } from "types/common";
import {
  buildPublishContext,
  classifyPublishError,
  matchCreateEventFailureReason,
} from "@utils/publica-analytics";

function makeForm(overrides: Partial<FormData> = {}): FormData {
  return {
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    region: null,
    town: null,
    location: "",
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
    });

    const ctx = buildPublishContext({
      form,
      imageFile: null,
    });

    expect(ctx.categories_count).toBe(1);
    expect(ctx.has_image_file).toBe(false);
    expect(ctx.has_email).toBe(true);
    expect(ctx.has_event_url).toBe(true);
    expect(ctx.has_town).toBe(true);
    expect(ctx.has_region).toBe(true);
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

  it("matchCreateEventFailureReason maps status codes and messages consistently", () => {
    expect(
      matchCreateEventFailureReason("event_image_upload_too_large"),
    ).toBe("image-too-large");
    expect(matchCreateEventFailureReason("Request Entity Too Large")).toBe(
      "body-limit",
    );
    expect(matchCreateEventFailureReason("HTTP error", 413)).toBe("body-limit");
    expect(matchCreateEventFailureReason("duplicate key")).toBe("duplicate");
    expect(matchCreateEventFailureReason("conflict", 409)).toBe("duplicate");
    expect(matchCreateEventFailureReason("bad request", 400)).toBe("validation");
    expect(matchCreateEventFailureReason("unprocessable", 422)).toBe("validation");
    expect(matchCreateEventFailureReason("internal error", 500)).toBeNull();
  });
});
