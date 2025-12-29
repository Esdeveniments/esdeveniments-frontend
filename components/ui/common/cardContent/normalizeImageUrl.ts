export function normalizeImageUrl(raw: string | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Weather icons sometimes come as OpenWeather-like codes (e.g. "04d").
  // Convert those to our bundled static icons.
  if (/^\d{2}[dn]$/i.test(trimmed)) {
    return `/static/images/icons/${trimmed}.png`;
  }

  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return null;
}
