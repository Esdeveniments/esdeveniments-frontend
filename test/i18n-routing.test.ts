import { describe, it, expect } from "vitest";
import {
  stripLocalePrefix,
  normalizePathname,
  ensureLocale,
} from "../utils/i18n-routing";

describe("stripLocalePrefix", () => {
  it("returns null locale and original path when no locale prefix", () => {
    const result = stripLocalePrefix("/barcelona");
    expect(result).toEqual({
      locale: null,
      pathnameWithoutLocale: "/barcelona",
    });
  });

  it("strips /ca prefix", () => {
    const result = stripLocalePrefix("/ca/barcelona");
    expect(result).toEqual({
      locale: "ca",
      pathnameWithoutLocale: "/barcelona",
    });
  });

  it("strips /es prefix", () => {
    const result = stripLocalePrefix("/es/barcelona/avui");
    expect(result).toEqual({
      locale: "es",
      pathnameWithoutLocale: "/barcelona/avui",
    });
  });

  it("strips /en prefix", () => {
    const result = stripLocalePrefix("/en/catalunya");
    expect(result).toEqual({
      locale: "en",
      pathnameWithoutLocale: "/catalunya",
    });
  });

  it("returns / for locale-only path", () => {
    const result = stripLocalePrefix("/es");
    expect(result).toEqual({
      locale: "es",
      pathnameWithoutLocale: "/",
    });
  });

  it("returns / for root path", () => {
    const result = stripLocalePrefix("/");
    expect(result).toEqual({
      locale: null,
      pathnameWithoutLocale: "/",
    });
  });

  it("returns / for empty string", () => {
    const result = stripLocalePrefix("");
    expect(result).toEqual({
      locale: null,
      pathnameWithoutLocale: "/",
    });
  });

  it("does not strip unsupported locale prefix", () => {
    const result = stripLocalePrefix("/fr/barcelona");
    expect(result).toEqual({
      locale: null,
      pathnameWithoutLocale: "/fr/barcelona",
    });
  });

  it("handles deep paths with locale", () => {
    const result = stripLocalePrefix("/en/barcelona/avui/concerts");
    expect(result).toEqual({
      locale: "en",
      pathnameWithoutLocale: "/barcelona/avui/concerts",
    });
  });

  it("does not treat ca in middle of path as locale", () => {
    const result = stripLocalePrefix("/barcelona/ca/something");
    expect(result).toEqual({
      locale: null,
      pathnameWithoutLocale: "/barcelona/ca/something",
    });
  });
});

describe("normalizePathname", () => {
  it("strips locale and returns path", () => {
    expect(normalizePathname("/es/barcelona")).toBe("/barcelona");
  });

  it("returns / for root", () => {
    expect(normalizePathname("/")).toBe("/");
  });

  it("returns path as-is when no locale prefix", () => {
    expect(normalizePathname("/barcelona/avui")).toBe("/barcelona/avui");
  });
});

describe("ensureLocale", () => {
  it("returns valid locale as-is", () => {
    expect(ensureLocale("ca")).toBe("ca");
    expect(ensureLocale("es")).toBe("es");
    expect(ensureLocale("en")).toBe("en");
  });

  it("returns default locale for invalid locale", () => {
    expect(ensureLocale("fr")).toBe("ca");
    expect(ensureLocale("de")).toBe("ca");
  });

  it("returns default locale for null", () => {
    expect(ensureLocale(null)).toBe("ca");
  });

  it("returns default locale for undefined", () => {
    expect(ensureLocale(undefined)).toBe("ca");
  });

  it("returns default locale for empty string", () => {
    expect(ensureLocale("")).toBe("ca");
  });
});
