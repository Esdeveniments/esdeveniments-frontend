import { describe, it, expect } from "vitest";
import { appendSearchQuery } from "@utils/notFoundMessaging";

describe("appendSearchQuery", () => {
  it("avoids duplicating the search snippet when already present", () => {
    const baseText =
      "Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment.";
    const once = appendSearchQuery(baseText, "castellers", "ca");
    const twice = appendSearchQuery(once, "castellers", "ca");

    expect(twice).toBe(once);
  });

  it("appends snippet when the base text has no period (Catalan)", () => {
    const baseText = "Sense esdeveniments disponibles";
    const augmented = appendSearchQuery(baseText, "concerts", "ca");

    // Search query is HTML-escaped to prevent XSS
    expect(augmented).toBe(
      `Sense esdeveniments disponibles per a la cerca "concerts".`
    );
  });

  it("appends snippet with English locale", () => {
    const baseText = "No events available";
    const augmented = appendSearchQuery(baseText, "concerts", "en");

    expect(augmented).toBe(`No events available for the search "concerts".`);
  });

  it("appends snippet with Spanish locale", () => {
    const baseText = "No hay eventos disponibles";
    const augmented = appendSearchQuery(baseText, "conciertos", "es");

    expect(augmented).toBe(
      `No hay eventos disponibles para la búsqueda "conciertos".`
    );
  });

  it("escapes HTML entities in search query to prevent XSS", () => {
    const baseText = "No s'han trobat esdeveniments";
    const augmented = appendSearchQuery(
      baseText,
      '<script>alert("XSS")</script>',
      "ca"
    );

    // Should escape all HTML entities: <, >, &, ", and '
    expect(augmented).toContain("&lt;script&gt;");
    expect(augmented).toContain("&lt;/script&gt;");
    expect(augmented).toContain("alert(&#39;XSS&#39;)"); // Double quotes replaced with single quotes, then escaped
    expect(augmented).not.toContain("<script>");
    expect(augmented).not.toContain("</script>");
    expect(augmented).not.toContain('alert("XSS")'); // Original double quotes should not appear
    expect(augmented).not.toContain("alert('XSS')"); // Unescaped single quotes should not appear
  });

  it("escapes ampersands and replaces double quotes with single quotes", () => {
    const baseText = "No s'han trobat esdeveniments";
    const augmented = appendSearchQuery(baseText, 'test & "quotes"', "ca");

    // Should escape & and replace " with ', then escape the single quotes
    expect(augmented).toContain("&amp;");
    expect(augmented).toContain("&#39;quotes&#39;"); // Double quotes replaced with single quotes, then escaped
    // Should not contain unescaped versions
    expect(augmented).toMatch(/test &amp; &#39;quotes&#39;/);
    // Original unescaped double quotes should not appear
    expect(augmented).not.toMatch(/test & "quotes"/);
    // Unescaped single quotes should not appear
    expect(augmented).not.toMatch(/test &amp; 'quotes'/);
  });
});
