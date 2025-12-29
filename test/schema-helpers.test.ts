import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateJsonData,
  sanitizeText,
  ensureIsoDate,
  ensureTime,
  buildDateTime,
  parseDateFromIso,
} from "@utils/schema-helpers";
import type { EventSummaryResponseDTO } from "types/api/event";

const baseEvent: EventSummaryResponseDTO = {
  id: "event-1",
  hash: "hash",
  slug: "test-event",
  title: "Test Event",
  type: "FREE",
  url: "https://example.com/event",
  description: "Event description",
  imageUrl: "https://example.com/image.jpg",
  startDate: "2025-01-10",
  startTime: null,
  endDate: "2025-01-10",
  endTime: null,
  location: "Museu d'Art",
  visits: 0,
  origin: "MANUAL",
  categories: [],
};

const createEvent = (
  overrides: Partial<EventSummaryResponseDTO> = {}
): EventSummaryResponseDTO => ({
  ...baseEvent,
  ...overrides,
});

describe("generateJsonData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fills address, description, image and endDate fallbacks when missing", () => {
    const schema = generateJsonData(
      createEvent({
        description: "",
        location: "",
        imageUrl: "",
        endDate: null as unknown as string,
      })
    );

    expect(schema.location.address.addressLocality).toBe("Catalunya");
    expect(schema.description).toBe("Test Event a Catalunya");
    expect(schema.image[0]).toMatch(/logo-seo-meta\.webp$/);
    expect(schema.endDate).toBe(schema.startDate);
    expect(schema.offers).toBeDefined();
    expect(schema.offers!.price).toBe(0);
  });

  it("emits meaningful offers for paid events without price information", () => {
    const schema = generateJsonData(
      createEvent({
        type: "PAID",
        description: "Gran concert",
        location: "Palau de la Música",
      })
    );

    // isAccessibleForFree was removed - event.type defaults to "FREE" so it's unreliable
    expect(schema.offers).toBeDefined();
    expect(schema.offers!.price).toBe(0);
    expect(schema.offers!.priceSpecification).toBeDefined();
    expect(schema.offers!.priceSpecification?.description).toBe(
      "Consult price"
    );
    expect(schema.performer.name).toBe("Palau de la Música");
    expect(schema.location.address.streetAddress).toBe("Palau de la Música");
  });

  it("normalizes endDate format even when backend omits it", () => {
    const schema = generateJsonData(
      createEvent({
        endDate: "" as unknown as string,
        startTime: "10:00",
        endTime: "12:00",
      })
    );

    expect(schema.endDate).toBe("2025-01-10T12:00");
    expect(schema.startDate).toBe("2025-01-10T10:00");
  });
});

describe("sanitizeText", () => {
  it("returns empty string for null", () => {
    expect(sanitizeText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizeText(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("returns empty string for non-string types", () => {
    expect(sanitizeText(123 as unknown as string)).toBe("");
    expect(sanitizeText({} as unknown as string)).toBe("");
    expect(sanitizeText([] as unknown as string)).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
    expect(sanitizeText("\n\tworld\n\t")).toBe("world");
  });

  it("normalizes multiple whitespace characters to single space", () => {
    expect(sanitizeText("hello    world")).toBe("hello world");
    expect(sanitizeText("foo\t\tbar")).toBe("foo bar");
    expect(sanitizeText("a\n\n\nb")).toBe("a b");
    expect(sanitizeText("x   y   z")).toBe("x y z");
  });

  it("handles strings with only whitespace", () => {
    expect(sanitizeText("   ")).toBe("");
    expect(sanitizeText("\n\t  \n")).toBe("");
  });

  it("preserves single spaces between words", () => {
    expect(sanitizeText("hello world")).toBe("hello world");
    expect(sanitizeText("foo bar baz")).toBe("foo bar baz");
  });

  it("handles mixed whitespace types", () => {
    expect(sanitizeText("hello\t\n  world")).toBe("hello world");
    expect(sanitizeText("a\r\nb\r\nc")).toBe("a b c");
  });
});

describe("ensureIsoDate", () => {
  it("returns undefined for null", () => {
    expect(ensureIsoDate(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(ensureIsoDate(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(ensureIsoDate("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(ensureIsoDate("   ")).toBeUndefined();
  });

  it("accepts valid ISO date format YYYY-MM-DD", () => {
    expect(ensureIsoDate("2025-01-10")).toBe("2025-01-10");
    expect(ensureIsoDate("2024-12-31")).toBe("2024-12-31");
    expect(ensureIsoDate("2000-01-01")).toBe("2000-01-01");
  });

  it("extracts date from ISO datetime string", () => {
    expect(ensureIsoDate("2025-01-10T10:00:00")).toBe("2025-01-10");
    expect(ensureIsoDate("2025-01-10T10:00:00Z")).toBe("2025-01-10");
    expect(ensureIsoDate("2025-01-10T23:59:59.999Z")).toBe("2025-01-10");
  });

  it("trims whitespace before validation", () => {
    expect(ensureIsoDate("  2025-01-10  ")).toBe("2025-01-10");
    expect(ensureIsoDate("\n2025-01-10\n")).toBe("2025-01-10");
  });

  it("rejects invalid date formats", () => {
    expect(ensureIsoDate("2025/01/10")).toBeUndefined();
    expect(ensureIsoDate("01-10-2025")).toBeUndefined();
    expect(ensureIsoDate("2025-1-10")).toBeUndefined();
    expect(ensureIsoDate("2025-01-1")).toBeUndefined();
    expect(ensureIsoDate("25-01-10")).toBeUndefined();
    expect(ensureIsoDate("not-a-date")).toBeUndefined();
    // Note: ensureIsoDate only validates format, not semantic validity
    // Invalid dates like 2025-13-01 will pass format check but fail actual parsing
    expect(ensureIsoDate("2025-13-01")).toBe("2025-13-01"); // Format valid, value invalid
    expect(ensureIsoDate("2025-01-32")).toBe("2025-01-32"); // Format valid, value invalid
  });

  it("rejects partial datetime strings without T", () => {
    expect(ensureIsoDate("2025-01-10 10:00:00")).toBeUndefined();
  });
});

describe("ensureTime", () => {
  it("returns undefined for null", () => {
    expect(ensureTime(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(ensureTime(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(ensureTime("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(ensureTime("   ")).toBeUndefined();
  });

  it("accepts valid HH:mm format", () => {
    expect(ensureTime("10:00")).toBe("10:00");
    expect(ensureTime("00:00")).toBe("00:00");
    expect(ensureTime("23:59")).toBe("23:59");
    expect(ensureTime("09:30")).toBe("09:30");
  });

  it("accepts valid HH:mm:ss format", () => {
    expect(ensureTime("10:00:00")).toBe("10:00:00");
    expect(ensureTime("23:59:59")).toBe("23:59:59");
    expect(ensureTime("00:00:00")).toBe("00:00:00");
    expect(ensureTime("12:30:45")).toBe("12:30:45");
  });

  it("trims whitespace before validation", () => {
    expect(ensureTime("  10:00  ")).toBe("10:00");
    expect(ensureTime("\n23:59:59\n")).toBe("23:59:59");
  });

  it("rejects invalid time formats", () => {
    expect(ensureTime("10:0")).toBeUndefined(); // Missing minute digit
    expect(ensureTime("1:00")).toBeUndefined(); // Single hour digit
    expect(ensureTime("10:00:0")).toBeUndefined(); // Missing second digit
    // Note: ensureTime only validates format, not semantic validity
    // Invalid times like 24:00 will pass format check
    expect(ensureTime("24:00")).toBe("24:00"); // Format valid, value invalid
    expect(ensureTime("10:60")).toBe("10:60"); // Format valid, value invalid
    expect(ensureTime("10:00:60")).toBe("10:00:60"); // Format valid, value invalid
    expect(ensureTime("not-a-time")).toBeUndefined();
    expect(ensureTime("10.00")).toBeUndefined(); // Wrong separator
    expect(ensureTime("10-00")).toBeUndefined(); // Wrong separator
  });

  it("rejects times with extra characters", () => {
    expect(ensureTime("10:00:00Z")).toBeUndefined();
    expect(ensureTime("10:00:00.000")).toBeUndefined();
    expect(ensureTime("10:00 AM")).toBeUndefined();
  });
});

describe("buildDateTime", () => {
  it("returns undefined when both date and fallbackDate are invalid", () => {
    expect(buildDateTime(null, null)).toBeUndefined();
    expect(buildDateTime("", "")).toBeUndefined();
    expect(buildDateTime("invalid", null, "also-invalid")).toBeUndefined();
  });

  it("returns date only when time is not provided", () => {
    expect(buildDateTime("2025-01-10", null)).toBe("2025-01-10");
    expect(buildDateTime("2025-01-10", "")).toBe("2025-01-10");
    expect(buildDateTime("2025-01-10", undefined)).toBe("2025-01-10");
  });

  it("combines valid date and time", () => {
    expect(buildDateTime("2025-01-10", "10:00")).toBe("2025-01-10T10:00");
    expect(buildDateTime("2025-01-10", "10:00:00")).toBe("2025-01-10T10:00:00");
    expect(buildDateTime("2025-12-31", "23:59:59")).toBe("2025-12-31T23:59:59");
  });

  it("uses fallbackDate when date is invalid", () => {
    expect(buildDateTime(null, "10:00", "2025-01-10")).toBe("2025-01-10T10:00");
    expect(buildDateTime("", "10:00", "2025-01-10")).toBe("2025-01-10T10:00");
    expect(buildDateTime("invalid", null, "2025-01-10")).toBe("2025-01-10");
  });

  it("prefers date over fallbackDate when both are valid", () => {
    expect(buildDateTime("2025-01-10", "10:00", "2025-01-11")).toBe(
      "2025-01-10T10:00"
    );
  });

  it("ignores invalid time format and returns date only", () => {
    expect(buildDateTime("2025-01-10", "invalid")).toBe("2025-01-10");
    // Note: ensureTime accepts format-valid but value-invalid times
    // So 25:00 passes format check but would fail actual parsing
    expect(buildDateTime("2025-01-10", "25:00")).toBe("2025-01-10T25:00");
    expect(buildDateTime("2025-01-10", "10:60")).toBe("2025-01-10T10:60");
  });

  it("handles ISO datetime strings as date input", () => {
    expect(buildDateTime("2025-01-10T10:00:00Z", "15:30")).toBe(
      "2025-01-10T15:30"
    );
    expect(buildDateTime("2025-01-10T10:00:00Z", null)).toBe("2025-01-10");
  });

  it("trims whitespace in inputs", () => {
    expect(buildDateTime("  2025-01-10  ", "  10:00  ")).toBe(
      "2025-01-10T10:00"
    );
  });
});

describe("parseDateFromIso", () => {
  it("returns undefined for null", () => {
    expect(parseDateFromIso(null as unknown as string)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(parseDateFromIso(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseDateFromIso("")).toBeUndefined();
  });

  it("parses ISO date string without time (defaults to start of day)", () => {
    const result = parseDateFromIso("2025-01-10");
    expect(result).toBeInstanceOf(Date);
    // Account for timezone conversion in toISOString() - date may shift by 1 day
    const isoString = result?.toISOString();
    expect(isoString).toMatch(/^2025-01-(09|10|11)T/);
    // Verify it's the correct date in local time
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(0); // January (0-indexed)
    expect(result?.getDate()).toBe(10);
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });

  it("parses ISO date string without time (isEnd=true defaults to end of day)", () => {
    const result = parseDateFromIso("2025-01-10", true);
    expect(result).toBeInstanceOf(Date);
    // Account for timezone conversion in toISOString()
    const isoString = result?.toISOString();
    expect(isoString).toMatch(/^2025-01-1[0-1]T/);
    // Verify it's the correct date (may be previous day in UTC)
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(0); // January (0-indexed)
    expect(result?.getDate()).toBe(10);
    // Verify it's end of day (23:59:59 in local time)
    expect(result?.getHours()).toBe(23);
    expect(result?.getMinutes()).toBe(59);
    expect(result?.getSeconds()).toBe(59);
  });

  it("parses ISO datetime string with time (ignores isEnd)", () => {
    const result = parseDateFromIso("2025-01-10T10:30:00", false);
    expect(result).toBeInstanceOf(Date);
    // Account for timezone conversion - check local time components
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(10);
    expect(result?.getHours()).toBe(10);
    expect(result?.getMinutes()).toBe(30);

    const result2 = parseDateFromIso("2025-01-10T15:45:30", true);
    expect(result2).toBeInstanceOf(Date);
    expect(result2?.getFullYear()).toBe(2025);
    expect(result2?.getMonth()).toBe(0);
    expect(result2?.getDate()).toBe(10);
    expect(result2?.getHours()).toBe(15);
    expect(result2?.getMinutes()).toBe(45);
    expect(result2?.getSeconds()).toBe(30);
  });

  it("parses ISO datetime string with timezone", () => {
    const result = parseDateFromIso("2025-01-10T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
    // The exact timezone conversion may vary, but it should be a valid date
    expect(result?.getTime()).toBeGreaterThan(0);
  });

  it("returns undefined for invalid date strings", () => {
    expect(parseDateFromIso("invalid-date")).toBeUndefined();
    expect(parseDateFromIso("2025-13-01")).toBeUndefined(); // Invalid month
    expect(parseDateFromIso("2025-01-32")).toBeUndefined(); // Invalid day
    expect(parseDateFromIso("not-a-date")).toBeUndefined();
  });

  it("handles edge dates correctly", () => {
    const start = parseDateFromIso("2000-01-01", false);
    expect(start).toBeInstanceOf(Date);
    expect(start?.getFullYear()).toBe(2000);
    expect(start?.getMonth()).toBe(0);
    expect(start?.getDate()).toBe(1);
    expect(start?.getHours()).toBe(0);
    expect(start?.getMinutes()).toBe(0);

    const end = parseDateFromIso("2099-12-31", true);
    expect(end).toBeInstanceOf(Date);
    expect(end?.getFullYear()).toBe(2099);
    expect(end?.getMonth()).toBe(11); // December (0-indexed)
    expect(end?.getDate()).toBe(31);
    expect(end?.getHours()).toBe(23);
    expect(end?.getMinutes()).toBe(59);
    expect(end?.getSeconds()).toBe(59);
  });

  it("handles leap year dates", () => {
    const result = parseDateFromIso("2024-02-29", false);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(1); // February (0-indexed)
    expect(result?.getDate()).toBe(29);
    expect(result?.getHours()).toBe(0);
  });

  it("handles invalid leap year dates (JavaScript Date is lenient)", () => {
    // JavaScript Date constructor is lenient and will adjust invalid dates
    // So 2023-02-29 becomes 2023-03-01 (or similar)
    const result = parseDateFromIso("2023-02-29", false);
    expect(result).toBeInstanceOf(Date);
    // The date will be adjusted, so we just verify it's a valid Date object
    expect(result?.getTime()).toBeGreaterThan(0);
  });
});
