import { describe, expect, it } from "vitest";
import { isLongDescription, processDescription } from "@utils/text-processing";
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

  it("bolds text with a space before the closing asterisks", () => {
    expect(processDescription("**Casa de Cultura. **  \nEntrada gratuïta.")).toBe(
      "<strong>Casa de Cultura.</strong>  <br>Entrada gratuïta.",
    );
    expect(processDescription("**  **")).toBe("**  **");
  });

  it("never pairs an opening ** followed by a space", () => {
    expect(processDescription("text ** then **bold** end")).toBe(
      "text ** then <strong>bold</strong> end",
    );
    expect(processDescription("2 ** 3 = 8 and 4 ** 2")).toBe("2 ** 3 = 8 and 4 ** 2");
  });

  it("renders markdown links as one link with their text", () => {
    expect(
      processDescription(
        "Inscripcions a [www.entrapolis.com](https://www.entrapolis.com/) i al [**reglament**](https://a.cat/r.htm).",
      ),
    ).toBe(
      'Inscripcions a <a href="https://www.entrapolis.com/" target="_blank" rel="noopener noreferrer">www.entrapolis.com</a> i al <a href="https://a.cat/r.htm" target="_blank" rel="noopener noreferrer"><strong>reglament</strong></a>.',
    );
  });

  it("keeps sentence punctuation and closing parentheses out of bare URLs", () => {
    const link = (url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    expect(processDescription("Web (https://a.cat/x). Fi")).toBe(
      `Web (${link("https://a.cat/x")}). Fi`,
    );
    expect(processDescription("https://en.wikipedia.org/wiki/Foc_(festa)")).toBe(
      link("https://en.wikipedia.org/wiki/Foc_(festa)"),
    );
    expect(processDescription("Fi de frase www..")).toBe("Fi de frase www..");
  });

  it("still lets the sanitizer drop markup injected inside bold", () => {
    const html = sanitizeHtml(processDescription("**<img src=x onerror=alert(1)>hola**"));
    expect(html).not.toContain("onerror");
  });
});

describe("isLongDescription", () => {
  it("keeps a short paragraph unfolded", () => {
    expect(isLongDescription("Concert a la plaça.")).toBe(false);
  });

  it("folds long plain text", () => {
    expect(isLongDescription("a".repeat(401))).toBe(true);
  });

  it.each([
    ["plain-text lines", Array(10).fill("18 h: acte").join("\n")],
    ["HTML paragraphs", Array(10).fill("<p>18 h: acte</p>").join("")],
  ])("folds many short %s", (_, text) => {
    expect(isLongDescription(text)).toBe(true);
  });
});
