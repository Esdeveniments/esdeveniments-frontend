import { describe, it, expect } from "vitest";
import {
  isValidPlace,
  validatePlaceForMetadata,
} from "../utils/route-validation";

describe("route-validation: isValidPlace", () => {
  it("accepts lowercase ASCII slugs with hyphens or numbers", () => {
    const validSlugs = [
      "barcelona",
      "maresme",
      "valles-occidental",
      "l-hospitalet-de-llobregat",
      "sant-boi-2025",
    ];

    validSlugs.forEach((slug) => {
      expect(isValidPlace(slug)).toBe(true);
    });
  });

  it("rejects uppercase characters, spaces, or forbidden symbols", () => {
    const invalidSlugs = [
      "",
      "Barcelona",
      "barcelona ",
      "barcelona$",
      "foo_bar",
      "girona%20",
    ];

    invalidSlugs.forEach((slug) => {
      expect(isValidPlace(slug)).toBe(false);
    });
  });

  it("rejects system paths and dot-prefixed values", () => {
    const invalidSystemSlugs = [
      ".well-known",
      "favicon.ico",
      ".hidden",
      "_next",
      "api",
      "robots.txt",
    ];

    invalidSystemSlugs.forEach((slug) => {
      expect(isValidPlace(slug)).toBe(false);
    });
  });
});

describe("route-validation: validatePlaceForMetadata", () => {
  it("returns fallback metadata when slug is invalid", () => {
    const result = validatePlaceForMetadata("$");

    expect(result).toEqual({
      isValid: false,
      fallbackMetadata: {
        title: "Not Found",
        description: "Page not found",
      },
    });
  });

  it("passes through valid slugs without fallback metadata", () => {
    const result = validatePlaceForMetadata("barcelona");

    expect(result).toEqual({ isValid: true });
  });
});

