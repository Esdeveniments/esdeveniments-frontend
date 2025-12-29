import { describe, it, expect } from "vitest";
import { stripHtmlTags, sanitizeHtml } from "@utils/sanitize";

describe("stripHtmlTags", () => {
  describe("basic functionality", () => {
    it("returns empty string for falsy input", () => {
      expect(stripHtmlTags("")).toBe("");
      expect(stripHtmlTags(null as unknown as string)).toBe("");
      expect(stripHtmlTags(undefined as unknown as string)).toBe("");
    });

    it("strips all HTML tags", () => {
      expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
      expect(stripHtmlTags("<div><span>Nested</span></div>")).toBe("Nested");
      expect(stripHtmlTags("<a href='test'>Link</a>")).toBe("Link");
    });

    it("handles complex HTML", () => {
      const html = `
      <div class="container">
        <h1>Title</h1>
        <p>Some <strong>bold</strong> text</p>
      </div>
    `;
      expect(stripHtmlTags(html)).toBe("Title\n        Some bold text");
    });
  });

  describe("HTML entity decoding", () => {
    it("decodes common named entities", () => {
      expect(stripHtmlTags("Hello&nbsp;World")).toBe("Hello World");
      expect(stripHtmlTags("A &amp; B")).toBe("A & B");
      expect(stripHtmlTags("&lt;script&gt;")).toBe("<script>");
      expect(stripHtmlTags("&quot;quoted&quot;")).toBe('"quoted"');
      expect(stripHtmlTags("It&#39;s fine")).toBe("It's fine");
      expect(stripHtmlTags("&apos;apostrophe&apos;")).toBe("'apostrophe'");
    });

    it("decodes numeric entities", () => {
      expect(stripHtmlTags("&#60;")).toBe("<"); // <
      expect(stripHtmlTags("&#62;")).toBe(">"); // >
      expect(stripHtmlTags("&#38;")).toBe("&"); // &
    });

    it("decodes hex entities", () => {
      expect(stripHtmlTags("&#x3C;")).toBe("<"); // <
      expect(stripHtmlTags("&#x3E;")).toBe(">"); // >
      expect(stripHtmlTags("&#x26;")).toBe("&"); // &
    });

    it("decodes special typography entities", () => {
      expect(stripHtmlTags("&copy;")).toBe("©");
      expect(stripHtmlTags("&reg;")).toBe("®");
      expect(stripHtmlTags("&trade;")).toBe("™");
      expect(stripHtmlTags("&ndash;")).toBe("–");
      expect(stripHtmlTags("&mdash;")).toBe("—");
      expect(stripHtmlTags("&hellip;")).toBe("…");
    });
  });

  describe("edge cases", () => {
    it("removes HTML comments", () => {
      expect(stripHtmlTags("Hello<!-- comment -->World")).toBe("HelloWorld");
      expect(stripHtmlTags("<!-- start -->Text<!-- end -->")).toBe("Text");
    });

    it("handles self-closing tags", () => {
      expect(stripHtmlTags("<br/>")).toBe("");
      expect(stripHtmlTags("<br />")).toBe("");
      expect(stripHtmlTags("Line1<br/>Line2")).toBe("Line1Line2");
    });
  });
});

describe("sanitizeHtml", () => {
  describe("basic functionality", () => {
    it("returns empty string for falsy input", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml(null as unknown as string)).toBe("");
    });

    it("preserves allowed tags", () => {
      expect(sanitizeHtml("<p>Hello</p>")).toBe("<p>Hello</p>");
      expect(sanitizeHtml("<strong>Bold</strong>")).toBe(
        "<strong>Bold</strong>"
      );
      expect(sanitizeHtml("<em>Italic</em>")).toBe("<em>Italic</em>");
      expect(sanitizeHtml("<br>")).toBe("<br>");
      expect(sanitizeHtml("<ul><li>Item</li></ul>")).toBe(
        "<ul><li>Item</li></ul>"
      );
    });

    it("strips disallowed tags but keeps content", () => {
      expect(sanitizeHtml("<script>alert(1)</script>")).toBe("alert(1)");
      expect(sanitizeHtml("<div>Content</div>")).toBe("Content");
      expect(sanitizeHtml("<iframe src='evil.com'></iframe>")).toBe("");
      expect(sanitizeHtml("<style>.red{}</style>")).toBe(".red{}");
    });

    it("handles nested content", () => {
      const nested =
        "<p>Some <strong>bold and <em>italic</em></strong> text</p>";
      expect(sanitizeHtml(nested)).toBe(
        "<p>Some <strong>bold and <em>italic</em></strong> text</p>"
      );
    });
  });

  describe("link sanitization", () => {
    it("preserves safe link attributes", () => {
      const link =
        '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
      expect(sanitizeHtml(link)).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener">Link</a>'
      );
    });

    it("strips dangerous attributes like onclick", () => {
      const onclick = '<a href="test" onclick="alert(1)">Link</a>';
      expect(sanitizeHtml(onclick)).toBe('<a href="test">Link</a>');
    });

    it("allows safe URLs", () => {
      expect(sanitizeHtml('<a href="https://example.com">Safe</a>')).toBe(
        '<a href="https://example.com">Safe</a>'
      );
      expect(sanitizeHtml('<a href="/relative/path">Safe</a>')).toBe(
        '<a href="/relative/path">Safe</a>'
      );
      expect(sanitizeHtml('<a href="mailto:test@example.com">Email</a>')).toBe(
        '<a href="mailto:test@example.com">Email</a>'
      );
      expect(stripHtmlTags('<a href="tel:+1234567890">Phone</a>')).toBe(
        "Phone"
      );
    });

    it("filters unsafe target values", () => {
      expect(sanitizeHtml('<a href="test" target="_blank">Link</a>')).toBe(
        '<a href="test" target="_blank">Link</a>'
      );
      expect(sanitizeHtml('<a href="test" target="_self">Link</a>')).toBe(
        '<a href="test" target="_self">Link</a>'
      );
      expect(sanitizeHtml('<a href="test" target="evil">Link</a>')).toBe(
        '<a href="test">Link</a>'
      );
    });

    it("filters unsafe rel values", () => {
      expect(
        sanitizeHtml('<a href="test" rel="noopener noreferrer">Link</a>')
      ).toBe('<a href="test" rel="noopener noreferrer">Link</a>');
      expect(sanitizeHtml('<a href="test" rel="nofollow ugc">Link</a>')).toBe(
        '<a href="test" rel="nofollow ugc">Link</a>'
      );
      // Invalid rel values are filtered out
      expect(sanitizeHtml('<a href="test" rel="evil noopener">Link</a>')).toBe(
        '<a href="test" rel="noopener">Link</a>'
      );
    });
  });

  describe("protocol blocking - basic", () => {
    it("blocks javascript: URLs", () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks data: URLs", () => {
      expect(sanitizeHtml('<a href="data:text/html,test">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks vbscript: URLs", () => {
      expect(sanitizeHtml('<a href="vbscript:msgbox(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks file: URLs", () => {
      expect(sanitizeHtml('<a href="file:///etc/passwd">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks blob: URLs", () => {
      expect(sanitizeHtml('<a href="blob:http://evil.com/uuid">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });
  });

  describe("protocol blocking - encoding bypass attempts", () => {
    it("blocks mixed case protocols", () => {
      expect(sanitizeHtml('<a href="JaVaScRiPt:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
      expect(sanitizeHtml('<a href="JAVASCRIPT:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks protocols with leading/trailing whitespace", () => {
      expect(sanitizeHtml('<a href="  javascript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
      expect(sanitizeHtml('<a href="javascript:alert(1)  ">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks HTML entity encoded protocols", () => {
      // &#106; = j, &#97; = a, etc.
      expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
      expect(sanitizeHtml('<a href="java&#115;cript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks hex entity encoded protocols", () => {
      // &#x6A; = j
      expect(sanitizeHtml('<a href="&#x6A;avascript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks protocols with embedded whitespace", () => {
      expect(sanitizeHtml('<a href="java\nscript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
      expect(sanitizeHtml('<a href="java\tscript:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });

    it("blocks protocols with null bytes", () => {
      expect(sanitizeHtml('<a href="java\0script:alert(1)">XSS</a>')).toBe(
        "<a>XSS</a>"
      );
    });
  });

  describe("attribute escaping", () => {
    it("escapes ampersands in attribute values", () => {
      expect(sanitizeHtml('<a href="test&value">Link</a>')).toBe(
        '<a href="test&amp;value">Link</a>'
      );
    });

    it("escapes less-than in attribute values", () => {
      expect(sanitizeHtml('<a href="test<value">Link</a>')).toBe(
        '<a href="test&lt;value">Link</a>'
      );
    });

    it("handles malformed attributes with > gracefully", () => {
      // A > in an attribute value breaks HTML parsing - this is expected
      // The parser sees the > as the end of the tag
      // This tests that we don't crash and handle it gracefully
      const result = sanitizeHtml('<a href="test>value">Link</a>');
      expect(result).not.toContain("javascript:");
      expect(result).toContain("Link");
    });

    it("prevents attribute breakout attacks", () => {
      // The & in &quot; gets escaped to &amp; preventing breakout
      expect(sanitizeHtml('<a href="test&quot;onclick=alert(1)">XSS</a>')).toBe(
        '<a href="test&amp;quot;onclick=alert(1)">XSS</a>'
      );
    });
  });

  describe("edge cases", () => {
    it("handles malformed tags gracefully", () => {
      expect(sanitizeHtml("<p>Unclosed")).toBe("<p>Unclosed");
      expect(sanitizeHtml("Text < more text")).toBe("Text &lt; more text");
      expect(sanitizeHtml("<>Empty tag")).toBe("Empty tag");
    });

    it("handles self-closing tags", () => {
      expect(sanitizeHtml("<br/>")).toBe("<br />");
      expect(sanitizeHtml("<br />")).toBe("<br />");
    });

    it("removes HTML comments", () => {
      expect(sanitizeHtml("Hello<!-- evil -->World")).toBe("HelloWorld");
      expect(sanitizeHtml("<!-- start --><p>Safe</p><!-- end -->")).toBe(
        "<p>Safe</p>"
      );
    });

    it("handles empty tags", () => {
      expect(sanitizeHtml("<p></p>")).toBe("<p></p>");
      expect(sanitizeHtml("<a href='test'></a>")).toBe('<a href="test"></a>');
    });

    it("normalizes attribute quotes to double quotes", () => {
      expect(sanitizeHtml("<a href='test'>Link</a>")).toBe(
        '<a href="test">Link</a>'
      );
    });
  });

  describe("real-world scenarios", () => {
    it("handles real-world event descriptions", () => {
      const description = `
      Vine a gaudir d'un concert increïble!<br>
      <a href="https://example.com/entrades" target="_blank" rel="noopener noreferrer">Compra entrades</a><br>
      <strong>Data:</strong> 15 de gener
    `;
      const result = sanitizeHtml(description);
      expect(result).toContain("<br>");
      expect(result).toContain('<a href="https://example.com/entrades"');
      expect(result).toContain("<strong>Data:</strong>");
    });

    it("sanitizes user-submitted content with multiple attack vectors", () => {
      const malicious = `
        <script>alert('xss')</script>
        <p onclick="alert(1)">Text</p>
        <a href="javascript:void(0)" onclick="steal()">Click</a>
        <img src="x" onerror="alert(1)">
        <style>body{display:none}</style>
      `;
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("<img");
      expect(result).not.toContain("<style>");
      expect(result).toContain("<p>Text</p>");
      expect(result).toContain("<a>Click</a>");
    });
  });
});
