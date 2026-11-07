import { describe, it, expect } from "vitest";
import compile from "icu-minify/compile";
import format from "icu-minify/format";
import ca from "../messages/ca.json";
import es from "../messages/es.json";
import en from "../messages/en.json";

// Formats with icu-minify, the precompiler next.config.js uses (precompile: true).
// The test/mocks next-intl stub doesn't run ICU `select`.
const formatters = {
  getDateTimeFormat: (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) =>
    new Intl.DateTimeFormat(...args),
  getNumberFormat: (...args: ConstructorParameters<typeof Intl.NumberFormat>) =>
    new Intl.NumberFormat(...args),
  getPluralRules: (...args: ConstructorParameters<typeof Intl.PluralRules>) =>
    new Intl.PluralRules(...args),
};
const until = (template: string, locale: string, day: number, date: string) =>
  format(compile(template), locale, { day: String(day), date }, { formatters });

describe("CardContent.until", () => {
  it("elides the Catalan article before 1 and 11", () => {
    const t = ca.Components.CardContent.until;
    expect(until(t, "ca", 1, "1 des.")).toBe("Fins a l'1 des.");
    expect(until(t, "ca", 11, "11 des.")).toBe("Fins a l'11 des.");
    expect(until(t, "ca", 30, "30 nov.")).toBe("Fins al 30 nov.");
  });

  it("formats es and en", () => {
    expect(until(es.Components.CardContent.until, "es", 1, "1 dic.")).toBe("Hasta el 1 dic.");
    expect(until(es.Components.CardContent.until, "es", 30, "30 nov.")).toBe("Hasta el 30 nov.");
    expect(until(en.Components.CardContent.until, "en", 30, "Nov 30")).toBe("Until Nov 30");
  });
});
