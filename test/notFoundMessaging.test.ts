import { describe, it, expect } from "vitest";
import { appendSearchQuery } from "@utils/notFoundMessaging";

describe("appendSearchQuery", () => {
  it("avoids duplicating the search snippet when already present", () => {
    const baseText =
      "Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment.";
    const once = appendSearchQuery(baseText, "castellers");
    const twice = appendSearchQuery(once, "castellers");

    expect(twice).toBe(once);
  });

  it("appends snippet when the base text has no period", () => {
    const baseText = "Sense esdeveniments disponibles";
    const augmented = appendSearchQuery(baseText, "concerts");

    // Search query is HTML-escaped to prevent XSS
    expect(augmented).toBe(
      `Sense esdeveniments disponibles per a la cerca "concerts".`
    );
  });

  it("escapes HTML entities in search query to prevent XSS", () => {
    const baseText = "No s'han trobat esdeveniments";
    const augmented = appendSearchQuery(baseText, '<script>alert("XSS")</script>');

    // Should escape all HTML entities: <, >, &, ", and '
    expect(augmented).toContain("&lt;script&gt;");
    expect(augmented).toContain("&lt;/script&gt;");
    expect(augmented).toContain("alert(&#39;XSS&#39;)"); // Double quotes replaced with single quotes, then escaped
    expect(augmented).not.toContain('<script>');
    expect(augmented).not.toContain('</script>');
    expect(augmented).not.toContain('alert("XSS")'); // Original double quotes should not appear
    expect(augmented).not.toContain("alert('XSS')"); // Unescaped single quotes should not appear
  });

  it("escapes ampersands and replaces double quotes with single quotes", () => {
    const baseText = "No s'han trobat esdeveniments";
    const augmented = appendSearchQuery(baseText, 'test & "quotes"');

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
