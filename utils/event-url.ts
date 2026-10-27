// Dependency-free so types/event.ts can use it without pulling in locale data.

/**
 * Normalizes a URL input by automatically adding https:// protocol if missing.
 * Handles common URL formats:
 * - "example.com" -> "https://example.com"
 * - "www.example.com" -> "https://www.example.com"
 * - "https://example.com" -> "https://example.com" (unchanged)
 * - "http://example.com" -> "http://example.com" (unchanged)
 * - "" -> "" (empty string preserved)
 *
 * @param url - The URL string to normalize
 * @returns Normalized URL with protocol, or empty string if input is empty/whitespace
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // If already has protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// protocol if missing, unless it's localhost (allow http)
  if (trimmed.startsWith("localhost") || trimmed.includes("://localhost")) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}

/**
 * True for a public web link such as "exemple.cat" or "https://www.x.com/a?b".
 * Rejects free text ("hola"), bare hosts ("https://x"), IPs, handles ("@insta")
 * and credentials or other schemes smuggled in as "user:pass@host".
 */
export function isValidEventUrl(url: string): boolean {
  const normalized = normalizeUrl(url);
  if (!normalized || /\s/.test(normalized)) return false;
  try {
    const { protocol, hostname, username, password } = new URL(normalized);
    if (protocol !== "https:" && protocol !== "http:") return false;
    if (username || password) return false;
    const labels = hostname.split(".");
    const tld = labels.at(-1) ?? "";
    return (
      labels.length > 1 &&
      labels.every((label) => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i.test(label)) &&
      /^([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(tld)
    );
  } catch {
    return false;
  }
}
