import { isExactWeekendRange, isExactWeekRange, getValidRangeType, assertValidNewsRange } from "@utils/news-date";

describe("news date validation", () => {
  it("validates exact weekend (Sat-Sun)", () => {
    expect(isExactWeekendRange("2025-08-02", "2025-08-03")).toBe(true); // 2025-08-02 is Saturday
    expect(getValidRangeType("2025-08-02", "2025-08-03")).toBe("WEEKEND");
  });

  it("validates exact week (Mon-Fri)", () => {
    expect(isExactWeekRange("2025-08-04", "2025-08-08")).toBe(true); // Mon-Fri
    expect(getValidRangeType("2025-08-04", "2025-08-08")).toBe("WEEKLY");
  });

  it("throws on invalid range", () => {
    expect(() => assertValidNewsRange("2025-08-05", "2025-08-06")).toThrow(); // Tue-Wed
    expect(() => assertValidNewsRange("2025-08-02", "2025-08-04")).toThrow(); // Sat-Mon (3 days)
  });
});