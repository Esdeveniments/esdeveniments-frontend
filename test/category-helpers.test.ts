import { describe, it, expect } from "vitest";
import {
  getCategoryFromDynamicData,
  getCategoryId,
  getCategoryDisplayName,
} from "../utils/category-helpers";
import type { CategorySummaryResponseDTO } from "../types/api/category";

const mockCategories: CategorySummaryResponseDTO[] = [
  { id: 1, name: "Concerts", slug: "concerts" },
  { id: 2, name: "Teatre", slug: "teatre" },
  { id: 3, name: "Festes Populars", slug: "festes-populars" },
];

describe("getCategoryFromDynamicData", () => {
  it("finds category by numeric ID", () => {
    const result = getCategoryFromDynamicData(mockCategories, 1);
    expect(result).toEqual(mockCategories[0]);
  });

  it("finds category by slug string", () => {
    const result = getCategoryFromDynamicData(mockCategories, "teatre");
    expect(result).toEqual(mockCategories[1]);
  });

  it("finds category by name (case-insensitive)", () => {
    const result = getCategoryFromDynamicData(mockCategories, "CONCERTS");
    expect(result).toEqual(mockCategories[0]);
  });

  it("returns null for unknown identifier", () => {
    expect(getCategoryFromDynamicData(mockCategories, "unknown")).toBeNull();
  });

  it("returns null for unknown numeric ID", () => {
    expect(getCategoryFromDynamicData(mockCategories, 999)).toBeNull();
  });

  it("returns null for null/undefined categories", () => {
    expect(getCategoryFromDynamicData(null as any, "test")).toBeNull();
  });

  it("returns null for non-array", () => {
    expect(getCategoryFromDynamicData("not-array" as any, "test")).toBeNull();
  });
});

describe("getCategoryId", () => {
  it("returns numeric ID directly", () => {
    expect(getCategoryId(mockCategories, 42)).toBe(42);
  });

  it("returns ID from category object", () => {
    expect(getCategoryId(mockCategories, mockCategories[0])).toBe(1);
  });

  it("looks up ID from slug string", () => {
    expect(getCategoryId(mockCategories, "teatre")).toBe(2);
  });

  it("returns null for unknown slug", () => {
    expect(getCategoryId(mockCategories, "nonexistent")).toBeNull();
  });
});

describe("getCategoryDisplayName", () => {
  it("returns category name", () => {
    expect(getCategoryDisplayName(mockCategories[0])).toBe("Concerts");
  });

  it("falls back to slug when no name", () => {
    const cat = { id: 1, name: "", slug: "concerts" };
    expect(getCategoryDisplayName(cat)).toBe("concerts");
  });

  it("falls back to Category ID when no name or slug", () => {
    const cat = { id: 5, name: "", slug: "" };
    expect(getCategoryDisplayName(cat)).toBe("Category 5");
  });

  it("returns empty string for null", () => {
    expect(getCategoryDisplayName(null)).toBe("");
  });
});
