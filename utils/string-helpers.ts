export const sanitize = (url: string): string => {
  const accents = [
    /[\u0300-\u030f]/g,
    /[\u1AB0-\u1AFF]/g,
    /[\u1DC0-\u1DFF]/g,
    /[\u1F00-\u1FFF]/g,
    /[\u2C80-\u2CFF]/g,
    /[\uFB00-\uFB06]/g,
  ];

  let sanitizedUrl = url.toLowerCase();
  sanitizedUrl = sanitizedUrl.replace(/\s+$/, "");

  accents.forEach((regex) => {
    sanitizedUrl = sanitizedUrl.normalize("NFD").replace(regex, "");
  });

  sanitizedUrl = sanitizedUrl.replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");
  sanitizedUrl = sanitizedUrl.replace(/[-\s]+/g, "-");

  return sanitizedUrl;
};

export const slug = (str: string, formattedStart: string, id: string): string =>
  `${sanitize(str)}-${formattedStart
    .toLowerCase()
    .replace(/ /g, "-")
    .replace("---", "-")
    .replace("ç", "c")
    .replace(/--/g, "-")}-${id}`;

/**
 * Extracts UUID from event slug, handling both formats:
 * - Standard UUID v4 with dashes (new events): f9d240c2-25ae-4690-a745-f6e76e598bf3
 * - Custom IDs without dashes (older events): ea962ni7nis5ga0ppcu7n12pcg
 *
 * @param slug - The event slug containing the UUID at the end
 * @returns The extracted UUID or ID
 *
 * @example
 * // New event with UUID v4
 * extractUuidFromSlug('concert-jazz-15-febrer-2025-f9d240c2-25ae-4690-a745-f6e76e598bf3')
 * // Returns: 'f9d240c2-25ae-4690-a745-f6e76e598bf3'
 *
 * // Older event with custom ID
 * extractUuidFromSlug('festa-de-la-gent-gran-16-juliol-2025-ea962ni7nis5ga0ppcu7n12pcg')
 * // Returns: 'ea962ni7nis5ga0ppcu7n12pcg'
 */
export const extractUuidFromSlug = (slug: string): string => {
  // Try to match standard UUID v4 pattern at the end of the slug
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidMatch = slug.match(uuidPattern);

  if (uuidMatch) {
    // Found a standard UUID with dashes - return the full UUID
    return uuidMatch[0];
  } else {
    // Fallback to old behavior for custom IDs without dashes
    const parts = slug.split("-");
    return parts[parts.length - 1];
  }
};

export const truncateString = (str: string, num: number): string => {
  if (str.length <= num) return str;
  return str.slice(0, num) + "...";
};

/**
 * Catalan contraction for the preposition "de" before vowels/"h".
 * Returns natural phrase like "d'exposicions" or "de teatre".
 * Defaults to lowercasing the noun for natural reading in CT.
 */
export function formatCatalanDe(
  name: string,
  lowercase: boolean = true
): string {
  const raw = (name || "").trim();
  const text = lowercase ? raw.toLowerCase() : raw;
  const startsWithVowelOrH = /^[aeiouàáèéíïòóúüh]/i.test(text);
  return `${startsWithVowelOrH ? "d'" : "de "}${text}`;
}
