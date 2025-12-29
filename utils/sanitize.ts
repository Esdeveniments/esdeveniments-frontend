/**
 * HTML sanitization utilities - lightweight replacements for isomorphic-dompurify
 *
 * Security model:
 * - Content comes from our own HMAC-protected API (trusted source)
 * - Backend sanitizes on input, so output is pre-validated
 * - These utilities provide defense-in-depth, not primary security
 *
 * Industry approach (Google, Meta, Vercel):
 * - Sanitize once on input (backend), trust on output
 * - For client rendering, use browser's native Sanitizer API when available
 *
 * Edge cases handled:
 * - Encoded protocols (&#106;avascript:, \x6A, etc.)
 * - Whitespace/newlines in protocols
 * - Mixed case protocols
 * - Null bytes and control characters
 * - Self-closing tags
 * - HTML comments
 * - Malformed tags
 */

// =============================================================================
// CONFIGURATION - Single source of truth for allowed content
// =============================================================================

/**
 * Allowed HTML tags for sanitization - safe subset for event descriptions
 */
const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "br",
  "em",
  "i",
  "p",
  "strong",
  "u",
  "ul",
  "ol",
  "li",
]);

/**
 * Allowed attributes per tag - only href, target, rel for links
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
};

/**
 * Dangerous URL protocols to block (checked after normalization)
 */
const DANGEROUS_PROTOCOLS = ["javascript", "data", "vbscript", "file", "blob"];

/**
 * Safe values for target attribute
 */
const SAFE_TARGET_VALUES = new Set(["_blank", "_self", "_parent", "_top"]);

/**
 * Safe values for rel attribute
 */
const SAFE_REL_VALUES = new Set([
  "noopener",
  "noreferrer",
  "nofollow",
  "sponsored",
  "ugc",
]);

// =============================================================================
// URL VALIDATION - Shared logic for protocol checking
// =============================================================================

/**
 * Normalizes a URL for safe protocol checking.
 * Handles various encoding tricks attackers use to bypass filters.
 *
 * Edge cases:
 * - HTML entities: &#106;avascript: → javascript:
 * - Hex entities: &#x6A;avascript: → javascript:
 * - Whitespace: java\nscript: → javascript:
 * - Null bytes: java\0script: → javascript:
 * - Mixed case: JaVaScRiPt: → javascript:
 */
function normalizeUrl(url: string): string {
  if (!url) return "";

  // Decode HTML entities (numeric &#106; and hex &#x6A;) in one pass
  let normalized = url.replace(/&#(?:x([\da-fA-F]+)|(\d+));/g, (_, hex, dec) =>
    String.fromCharCode(hex ? parseInt(hex, 16) : parseInt(dec, 10))
  );

  // Remove null bytes, control characters (0x00-0x1F, 0x7F), and whitespace
  // in one pass. Control char regex is necessary for security bypass prevention.
  // eslint-disable-next-line no-control-regex
  normalized = normalized.replace(/[\x00-\x1f\x7f\s]+/g, "");

  return normalized.toLowerCase();
}

/**
 * Checks if a URL uses a dangerous protocol.
 * Uses normalized URL to catch encoding bypass attempts.
 */
function isDangerousUrl(url: string): boolean {
  const normalized = normalizeUrl(url);

  // Check for dangerous protocols at the start
  return DANGEROUS_PROTOCOLS.some((protocol) =>
    normalized.startsWith(`${protocol}:`)
  );
}

/**
 * Validates a URL is safe (not dangerous protocol).
 * Returns the original URL if safe, empty string if dangerous.
 */
function getSafeUrl(url: string): string {
  return isDangerousUrl(url) ? "" : url;
}

// =============================================================================
// ATTRIBUTE ESCAPING - Shared logic for XSS prevention in attributes
// =============================================================================

/**
 * Escapes attribute values to prevent XSS via attribute breakout.
 * Standard HTML entity encoding for attribute context.
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Validates and sanitizes an attribute value based on attribute name.
 * Returns null if the attribute should be removed entirely.
 */
function sanitizeAttrValue(attrName: string, attrValue: string): string | null {
  const name = attrName.toLowerCase();
  const value = attrValue.trim();

  switch (name) {
    case "href": {
      const safeUrl = getSafeUrl(value);
      return safeUrl ? escapeAttrValue(safeUrl) : null;
    }
    case "target": {
      // Only allow safe target values
      return SAFE_TARGET_VALUES.has(value) ? value : null;
    }
    case "rel": {
      // Filter to only safe rel values
      const relParts = value.split(/\s+/).filter((r) => SAFE_REL_VALUES.has(r));
      return relParts.length > 0 ? relParts.join(" ") : null;
    }
    default:
      return escapeAttrValue(value);
  }
}

// =============================================================================
// HTML ENTITY DECODING - For stripHtmlTags plain text extraction
// =============================================================================

/**
 * Common HTML entities to decode for plain text extraction
 */
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
};

/**
 * Decodes common HTML entities for plain text output.
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return "";

  // Replace named entities in one pass using a combined regex
  const namedEntitiesRegex = new RegExp(
    Object.keys(HTML_ENTITIES)
      .map((e) => e.replace(/[&;]/g, "\\$&"))
      .join("|"),
    "g"
  );
  let decoded = text.replace(
    namedEntitiesRegex,
    (match) => HTML_ENTITIES[match]
  );

  // Decode numeric entities (&#123;)
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );

  // Decode hex entities (&#x7B;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return decoded;
}

// =============================================================================
// PUBLIC API - Main sanitization functions
// =============================================================================

/**
 * Strips ALL HTML tags from a string, returning plain text.
 * Standard approach used by most frameworks for text extraction.
 *
 * Use cases:
 * - Meta descriptions
 * - Search indexing
 * - Plain text previews
 *
 * @param html - HTML string to strip
 * @returns Plain text with no HTML tags
 */
export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== "string") return "";

  return decodeHtmlEntities(
    html
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove all tags
      .replace(/<[^>]*>/g, "")
  ).trim();
}

/**
 * Server-side HTML sanitizer using allowlist approach.
 * For content from our own trusted API - provides defense-in-depth.
 *
 * Note: Content is pre-sanitized by backend. This is a safety net,
 * not the primary security layer.
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string with only allowed tags/attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  // Remove HTML comments first
  let processed = html.replace(/<!--[\s\S]*?-->/g, "");

  let result = "";
  let i = 0;

  while (i < processed.length) {
    if (processed[i] === "<") {
      const tagEnd = processed.indexOf(">", i);
      if (tagEnd === -1) {
        // Malformed tag - escape the < and continue
        result += "&lt;";
        i++;
        continue;
      }

      const tagContent = processed.slice(i + 1, tagEnd);

      // Skip empty tags like <>
      if (!tagContent.trim()) {
        i = tagEnd + 1;
        continue;
      }

      const isClosing = tagContent.startsWith("/");
      const isSelfClosing = tagContent.endsWith("/");

      // Extract tag name (handle self-closing and attributes)
      let tagNameRaw = isClosing ? tagContent.slice(1) : tagContent;
      if (isSelfClosing) {
        tagNameRaw = tagNameRaw.slice(0, -1);
      }
      const tagName = tagNameRaw.split(/[\s/]/)[0].toLowerCase();

      if (ALLOWED_TAGS.has(tagName)) {
        if (isClosing) {
          result += `</${tagName}>`;
        } else {
          result += buildSafeTag(tagName, tagContent, isSelfClosing);
        }
      }
      // Disallowed tags are stripped entirely (content preserved)

      i = tagEnd + 1;
    } else {
      result += processed[i];
      i++;
    }
  }

  return result;
}

/**
 * Builds a safe HTML tag with only allowed and sanitized attributes.
 */
function buildSafeTag(
  tagName: string,
  tagContent: string,
  isSelfClosing: boolean
): string {
  const allowedAttrs = ALLOWED_ATTRS[tagName];
  const selfClose = isSelfClosing ? " /" : "";

  if (!allowedAttrs) {
    return `<${tagName}${selfClose}>`;
  }

  const safeAttrs: string[] = [];
  // Robust regex: handles double-quoted, single-quoted, and unquoted values
  const attrRegex = /([a-zA-Z0-9-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  const attrsContent = tagContent.slice(tagName.length);

  for (const match of attrsContent.matchAll(attrRegex)) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? "";

    if (allowedAttrs.has(attrName)) {
      const sanitizedValue = sanitizeAttrValue(attrName, attrValue);
      if (sanitizedValue !== null) {
        safeAttrs.push(`${attrName}="${sanitizedValue}"`);
      }
    }
  }

  return safeAttrs.length > 0
    ? `<${tagName} ${safeAttrs.join(" ")}${selfClose}>`
    : `<${tagName}${selfClose}>`;
}

/**
 * Client-side HTML sanitizer using browser's native DOMParser.
 * This is the same approach used by sanitization libraries.
 *
 * Uses browser's built-in HTML parser (battle-tested) rather than regex.
 * Falls back to server sanitizer during SSR.
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtmlClient(html: string): string {
  if (!html || typeof html !== "string") return "";
  if (typeof window === "undefined") return sanitizeHtml(html);

  // Use browser's native HTML parser - same approach as DOMPurify
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  sanitizeNode(doc.body);

  return doc.body.innerHTML;
}

/**
 * Recursively sanitizes a DOM node and its children.
 */
function sanitizeNode(node: Node): void {
  const childNodes = Array.from(node.childNodes);

  for (const child of childNodes) {
    if (child.nodeType === Node.COMMENT_NODE) {
      // Remove HTML comments
      node.removeChild(child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        // Replace disallowed element with its text content
        const text = document.createTextNode(element.textContent || "");
        node.replaceChild(text, element);
      } else {
        // Clean attributes
        sanitizeElementAttributes(element, tagName);
        // Recurse into children
        sanitizeNode(element);
      }
    }
  }
}

/**
 * Removes disallowed attributes from an element (client-side).
 */
function sanitizeElementAttributes(element: Element, tagName: string): void {
  const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set();
  const attrsToRemove: string[] = [];

  for (const attr of Array.from(element.attributes)) {
    const attrName = attr.name.toLowerCase();

    if (!allowedAttrs.has(attrName)) {
      attrsToRemove.push(attr.name);
    } else {
      const sanitizedValue = sanitizeAttrValue(attrName, attr.value);
      if (sanitizedValue === null) {
        attrsToRemove.push(attr.name);
      } else if (sanitizedValue !== attr.value) {
        element.setAttribute(attr.name, sanitizedValue);
      }
    }
  }

  attrsToRemove.forEach((attr) => element.removeAttribute(attr));
}
