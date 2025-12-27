import { describe, expect, it } from "vitest";
import { isSuspiciousPlaceSlug } from "@app/api/places/[slug]/route";

describe("isSuspiciousPlaceSlug", () => {
  it("rejects empty/whitespace", () => {
    expect(isSuspiciousPlaceSlug("")).toBe(true);
    expect(isSuspiciousPlaceSlug("   ")).toBe(true);
  });

  it("rejects non-canonical characters", () => {
    expect(isSuspiciousPlaceSlug("l%27escala")).toBe(true);
    expect(isSuspiciousPlaceSlug("l'escala")).toBe(true);
    expect(isSuspiciousPlaceSlug("&")).toBe(true);
  });

  it("rejects overly long slugs", () => {
    expect(isSuspiciousPlaceSlug("a".repeat(81))).toBe(true);
  });

  it("rejects long hyphen-less concatenations", () => {
    expect(isSuspiciousPlaceSlug("santcugatsesgarrigues")).toBe(true);
  });

  it("allows normal canonical slugs", () => {
    expect(isSuspiciousPlaceSlug("barcelona")).toBe(false);
    expect(isSuspiciousPlaceSlug("sant-cugat-sesgarrigues")).toBe(false);
    expect(isSuspiciousPlaceSlug("baix-llobregat")).toBe(false);
  });
});
