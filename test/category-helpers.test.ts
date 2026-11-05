import { describe, it, expect } from "vitest";
import {
  getCategoryFromDynamicData,
  getCategoryId,
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
