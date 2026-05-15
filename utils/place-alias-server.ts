import type { PlaceResponseDTO } from "types/api/place";
import { fetchPlaces } from "@lib/api/places";

const STOP_WORDS = new Set(["de", "del", "dels"]);

function collapseSlug(slug: string): string {
  return slug.replace(/-/g, "");
}

function collapseWithoutStopWords(slug: string): string {
  return slug
    .split("-")
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .join("");
}

export function resolvePlaceSlugAliasFromPlaces(
  inputSlug: string,
  places: PlaceResponseDTO[]
): string | null {
  const candidate = inputSlug.trim().toLowerCase();
  if (candidate.length === 0) return null;

  const candidateKeys = [
    collapseSlug(candidate),
    collapseWithoutStopWords(candidate),
  ];

  const keyToSlugOrNull = new Map<string, string | null>();
  for (const place of places) {
    const slug = place.slug?.trim().toLowerCase();
    if (!slug) continue;

    const keys = [collapseSlug(slug), collapseWithoutStopWords(slug)];
    for (const key of keys) {
      if (key.length === 0) continue;

      const existing = keyToSlugOrNull.get(key);
      if (existing === undefined) {
        keyToSlugOrNull.set(key, slug);
        continue;
      }
      if (existing !== slug) {
        // Collision: multiple canonical slugs map to same key.
        // Treat as ambiguous to avoid wrong redirects.
        keyToSlugOrNull.set(key, null);
      }
    }
  }

  for (const key of candidateKeys) {
    const resolved = keyToSlugOrNull.get(key);
    if (resolved === null || resolved === undefined) continue;
    if (resolved !== candidate) return resolved;
  }

  return null;
}

export async function resolvePlaceSlugAlias(
  inputSlug: string
): Promise<string | null> {
  const places = await fetchPlaces();
  return resolvePlaceSlugAliasFromPlaces(inputSlug, places);
}
