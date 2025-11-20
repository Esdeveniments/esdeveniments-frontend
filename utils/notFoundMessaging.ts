import { escapeXml } from "@utils/xml-escape";

/**
 * Appends a search query to base text, properly escaping HTML entities
 * to prevent XSS attacks. The search query is escaped before being
 * inserted into the text.
 *
 * @param baseText - Base text to append to
 * @param searchQuery - User-provided search query (will be escaped)
 * @returns Text with escaped search query appended
 */
export function appendSearchQuery(
  baseText: string,
  searchQuery?: string
): string {
  const normalizedBase = baseText || "";
  const normalizedSearch = searchQuery?.trim();

  if (!normalizedBase || !normalizedSearch) {
    return normalizedBase;
  }

  // Escape HTML entities in user-provided search query to prevent XSS
  const escapedSearch = escapeXml(normalizedSearch);
  const snippet = ` per a la cerca "${escapedSearch}"`;

  if (normalizedBase.includes(snippet)) {
    return normalizedBase;
  }

  const firstPeriodIndex = normalizedBase.indexOf(".");

  if (firstPeriodIndex === -1) {
    return `${normalizedBase}${snippet}.`;
  }

  return `${normalizedBase.slice(
    0,
    firstPeriodIndex
  )}${snippet}${normalizedBase.slice(firstPeriodIndex)}`;
}

export function splitNotFoundText(
  fullText: string,
  searchQuery?: string
): { title: string; description: string } {
  const firstPeriodIndex = fullText.indexOf(".");

  if (firstPeriodIndex === -1) {
    return {
      title: appendSearchQuery(fullText, searchQuery),
      description: "",
    };
  }

  const title = fullText.slice(0, firstPeriodIndex + 1);
  const description = fullText.slice(firstPeriodIndex + 1).trim();

  return {
    title: appendSearchQuery(title, searchQuery),
    description,
  };
}
