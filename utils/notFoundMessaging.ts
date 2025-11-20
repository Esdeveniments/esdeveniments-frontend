export function appendSearchQuery(
  baseText: string,
  searchQuery?: string
): string {
  const normalizedBase = baseText || "";
  const normalizedSearch = searchQuery?.trim();

  if (!normalizedBase || !normalizedSearch) {
    return normalizedBase;
  }

  const sanitizedSearch = normalizedSearch.replace(/"/g, "'");
  const snippet = ` per a la cerca "${sanitizedSearch}"`;

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
