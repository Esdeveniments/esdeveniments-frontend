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

    // Should escape <, >, ", and other HTML entities
    expect(augmented).toContain("&lt;script&gt;");
    expect(augmented).toContain("&lt;/script&gt;");
    expect(augmented).toContain("&quot;");
    expect(augmented).not.toContain('<script>');
    expect(augmented).not.toContain('</script>');
  });

  it("escapes ampersands and quotes in search query", () => {
    const baseText = "No s'han trobat esdeveniments";
    const augmented = appendSearchQuery(baseText, 'test & "quotes"');

    // Should contain escaped versions
    expect(augmented).toContain("&amp;");
    expect(augmented).toContain("&quot;");
    // Should not contain unescaped versions (check for standalone & and " that aren't part of entities)
    // Note: &amp; contains &, so we check the full pattern
    expect(augmented).toMatch(/test &amp; &quot;quotes&quot;/);
    // Original unescaped quote should not appear
    expect(augmented).not.toMatch(/test & "quotes"/);
  });
});
