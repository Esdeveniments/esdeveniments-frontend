import type { PlaceAliasIndex, PlaceResponseDTO } from "types/api/place";
import { fetchPlaces } from "@lib/api/places";

const STOP_WORDS = new Set(["de", "del", "dels", "d"]);
const LEADING_ARTICLE_PREFIXES = [
  "els-",
  "les-",
  "era-",
  "el-",
  "la-",
  "es-",
  "l-",
] as const;

// Official Catalan municipal renames, short forms used by Gencat Open Data,
// and common comarca/town variants that differ by more than articles or stop words.
const HISTORICAL_PLACE_ALIASES: Readonly<Record<string, string>> = {
  "val-d-aran": "aran",
  "vall-d-aran": "aran",
  "la-val-d-aran": "aran",
  "la-vall-d-aran": "aran",
  "bordes-es": "es-bordes",
  "las-bordas": "es-bordes",
  torrebeses: "torrebesses",
  "sant-carles-de-la-rapita": "la-rapita",
  "castell-platja-d-aro": "castell-d-aro-platja-d-aro-i-s-agaro",
  "platja-d-aro": "castell-d-aro-platja-d-aro-i-s-agaro",
  calonge: "calonge-i-sant-antoni",
  brunyola: "brunyola-i-sant-marti-sapresa",
  "la-bisbal-de-falset": "la-bisbal-de-montsant",
  "bisbal-de-falset": "la-bisbal-de-montsant",
  cruilles: "cruilles-monells-i-sant-sadurni-de-l-heura",
  saus: "saus-camallera-i-llampaies",
  medinya: "sant-julia-de-ramis",
  "bigues-i-riells-del-fai": "bigues-i-riells",
  "palamos-i-sant-joan": "palamos",
  "roda-de-bara": "roda-de-bera",
  "santa-maria-de-corco": "l-esquirol",
  "figuero-i-montmany": "figaro-montmany",
  "el-figuero-i-montmany": "figaro-montmany",
  "terrassola-i-lavit": "torrelavit",
};

function collapseSlug(slug: string): string {
  return slug.replace(/-/g, "");
}

function collapseWithoutStopWords(slug: string): string {
  return slug
    .split("-")
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .join("");
}

function stripLeadingArticle(slug: string): string {
  for (const prefix of LEADING_ARTICLE_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) {
      return slug.slice(prefix.length);
    }
  }
  return slug;
}

function buildAliasKeys(slug: string): string[] {
  const stripped = stripLeadingArticle(slug);
  return Array.from(
    new Set([
      collapseSlug(slug),
      collapseWithoutStopWords(slug),
      collapseSlug(stripped),
      collapseWithoutStopWords(stripped),
    ])
  ).filter((key) => key.length > 0);
}

const aliasIndexCache = new WeakMap<
  readonly PlaceResponseDTO[],
  PlaceAliasIndex
>();

function getPlaceAliasIndex(
  places: readonly PlaceResponseDTO[]
): PlaceAliasIndex {
  const cached = aliasIndexCache.get(places);
  if (cached) return cached;

  const canonicalSlugs = new Set<string>();
  const keyToSlugOrNull = new Map<string, string | null>();
  for (const place of places) {
    const slug = place.slug?.trim().toLowerCase();
    if (!slug) continue;
    canonicalSlugs.add(slug);

    for (const key of buildAliasKeys(slug)) {
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

  const built: PlaceAliasIndex = { canonicalSlugs, keyToSlugOrNull };
  aliasIndexCache.set(places, built);
  return built;
}

export function resolvePlaceSlugAliasFromPlaces(
  inputSlug: string,
  places: readonly PlaceResponseDTO[]
): string | null {
  const candidate = inputSlug.trim().toLowerCase();
  if (candidate.length === 0) return null;

  const { canonicalSlugs, keyToSlugOrNull } = getPlaceAliasIndex(places);
  if (canonicalSlugs.has(candidate)) return null;

  const explicitTarget = HISTORICAL_PLACE_ALIASES[candidate];
  if (
    explicitTarget &&
    explicitTarget !== candidate &&
    canonicalSlugs.has(explicitTarget)
  ) {
    return explicitTarget;
  }

  for (const key of buildAliasKeys(candidate)) {
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
