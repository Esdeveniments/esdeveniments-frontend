import { describe, expect, it } from "vitest";
import { processDescription } from "@utils/text-processing";
import { sanitizeHtml } from "@utils/sanitize";

describe("processDescription", () => {
  it("turns markdown bold into <strong> and keeps it through the sanitizer", () => {
    const html = sanitizeHtml(
      processDescription("**Les coses excepcionals** – Teatre La Bòbila\n\nUna comèdia"),
    );
    expect(html).toContain("<strong>Les coses excepcionals</strong> – Teatre La Bòbila");
    expect(html).not.toContain("**");
  });

  it("still links URLs next to bold text and leaves lone asterisks alone", () => {
    expect(processDescription("**Entrades:** https://example.com/entrades")).toBe(
      '<strong>Entrades:</strong> <a href="https://example.com/entrades" target="_blank" rel="noopener noreferrer">https://example.com/entrades</a>',
    );
    expect(processDescription("Preu: 5 € * IVA ** inclòs")).toBe("Preu: 5 € * IVA ** inclòs");
  });

  it("still lets the sanitizer drop markup injected inside bold", () => {
    const html = sanitizeHtml(processDescription("**<img src=x onerror=alert(1)>hola**"));
    expect(html).not.toContain("onerror");
  });
});
