import { normalizeForSearch } from "@utils/string-helpers";
import { priceToFormFields } from "@utils/event-price";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { Option } from "types/common";
import type { FormData } from "types/event";
import type {
  PosterAutofillApplyOptions,
  PosterAutofillApplyResult,
  PosterAutofillFieldKey,
  PosterAutofillUndoRecord,
} from "types/api/poster";

const CATALAN_LEADING_ARTICLE = /^(?:(?:el|la|els|les|es|sa)\s+|l['’]\s*)/i;
const INVERTED_ARTICLE = /^(.+?),\s*(el|la|els|les|es|sa|l['’])$/i;
const PAREN_HINT_RE = /\(([^)]+)\)/;

function canonicalizeArticleOrder(value: string): string {
  const match = INVERTED_ARTICLE.exec(value.trim());
  if (!match) return value.trim();
  const [, name, article] = match;
  return article.endsWith("'") || article.endsWith("’")
    ? `${article}${name}`
    : `${article} ${name}`;
}

function stripLeadingArticle(normalized: string): string {
  return normalized.replace(CATALAN_LEADING_ARTICLE, "").trim();
}

function extractTownAndComarcaHint(rawTown: string): {
  candidates: string[];
  comarcaHint: string | null;
} {
  const candidates: string[] = [];
  const push = (value: string) => {
    const normalized = normalizeForSearch(canonicalizeArticleOrder(value));
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  const parenMatch = PAREN_HINT_RE.exec(rawTown);
  const comarcaHint = parenMatch?.[1]
    ? normalizeForSearch(parenMatch[1])
    : null;

  push(rawTown);
  const withoutParens = rawTown.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (withoutParens) push(withoutParens);

  // Preserve inverted article ("Masnou, el") before comma-splitting comarcas.
  if (!INVERTED_ARTICLE.test(withoutParens)) {
    const firstSegment = withoutParens.split(",")[0]?.trim();
    if (firstSegment) push(firstSegment);
  }

  return { candidates, comarcaHint };
}

function disambiguateByComarca(
  matches: Option[],
  comarcaHint: string | null,
  cityToRegionOptionMap?: Record<string, Option>,
): Option | null {
  if (matches.length === 1) return matches[0];
  if (!comarcaHint || !cityToRegionOptionMap || matches.length === 0) return null;
  const narrowed = matches.filter((option) => {
    const region = cityToRegionOptionMap[option.value];
    return region && normalizeForSearch(region.label) === comarcaHint;
  });
  return narrowed.length === 1 ? narrowed[0] : null;
}

/**
 * Matches a municipality name read from a poster against the real backend
 * `cityOptions`, handling accents, Catalan apostrophes, leading/inverted
 * articles ("El Masnou" / "Masnou, el" / "L'Escala"), parenthetical comarca
 * hints ("Vic (Osona)"), and unambiguous prefixes. Never guesses ambiguously.
 */
export function matchCityOption(
  rawTown: string | null | undefined,
  cityOptions: Option[],
  cityToRegionOptionMap?: Record<string, Option>,
): Option | null {
  if (!rawTown || cityOptions.length === 0) return null;

  const { candidates, comarcaHint } = extractTownAndComarcaHint(rawTown);
  if (candidates.length === 0) return null;

  const indexed = cityOptions.map((option) => {
    const normalized = normalizeForSearch(canonicalizeArticleOrder(option.label));
    return {
      option,
      normalized,
      bare: stripLeadingArticle(normalized),
    };
  });

  // 1. Exact accent-insensitive match.
  for (const candidate of candidates) {
    const matches = indexed
      .filter((item) => item.normalized === candidate)
      .map((item) => item.option);
    const resolved = disambiguateByComarca(
      matches,
      comarcaHint,
      cityToRegionOptionMap,
    );
    if (resolved) return resolved;
  }

  // 2. Match ignoring leading Catalan article on either side.
  for (const candidate of candidates) {
    const bareCandidate = stripLeadingArticle(candidate);
    if (!bareCandidate) continue;
    const matches = indexed
      .filter((item) => item.bare === bareCandidate)
      .map((item) => item.option);
    const resolved = disambiguateByComarca(
      matches,
      comarcaHint,
      cityToRegionOptionMap,
    );
    if (resolved) return resolved;
  }

  // 3. Unambiguous prefix match (e.g. "L'Hospitalet" -> "L'Hospitalet de Llobregat").
  for (const candidate of candidates) {
    const bareCandidate = stripLeadingArticle(candidate);
    if (bareCandidate.length < 4) continue;
    const matches = indexed
      .filter(
        (item) =>
          item.normalized.startsWith(`${candidate} `) ||
          item.bare.startsWith(`${bareCandidate} `),
      )
      .map((item) => item.option);
    const resolved = disambiguateByComarca(
      matches,
      comarcaHint,
      cityToRegionOptionMap,
    );
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Maps extracted category slugs or labels to `Option[]` matching the live
 * Esdeveniments.cat categories, deduped and preserving extraction order.
 */
export function matchCategoryOptions(
  extractedCategories: string[],
  categories: CategorySummaryResponseDTO[],
): Option[] {
  if (extractedCategories.length === 0 || categories.length === 0) return [];

  const lookup = new Map<string, CategorySummaryResponseDTO>();
  for (const category of categories) {
    lookup.set(normalizeForSearch(category.slug), category);
    lookup.set(normalizeForSearch(category.name), category);
  }

  const seenIds = new Set<number>();
  const matched: Option[] = [];
  for (const item of extractedCategories) {
    const key = normalizeForSearch(item);
    const category = key ? lookup.get(key) : undefined;
    if (category && !seenIds.has(category.id)) {
      seenIds.add(category.id);
      matched.push({
        value: category.id.toString(),
        label: category.name,
      });
    }
  }
  return matched;
}

/**
 * Pure merge of AI-extracted poster fields into `FormData`.
 * Protects user authorship via both existing field content (including
 * `originalPrice`) and explicit `userOwnedFields` tracking so fields the user
 * edited are never overwritten.
 */
export function applyPosterExtractionToForm(
  options: PosterAutofillApplyOptions,
): PosterAutofillApplyResult {
  const {
    currentForm,
    extracted,
    cityOptions,
    cityToRegionOptionMap,
    categories,
    autoDates,
    userOwnedFields,
    preserveUserValues = true,
  } = options;

  const isUserOwned = (field: PosterAutofillFieldKey) =>
    Boolean(userOwnedFields?.has(field));

  const nextForm = { ...currentForm };
  const filledFields: PosterAutofillFieldKey[] = [];
  const skippedFields: PosterAutofillFieldKey[] = [];
  let unmatchedTown: string | null = null;
  let appliedDates = false;

  if (extracted.title) {
    if (!isUserOwned("title") && (!preserveUserValues || !currentForm.title.trim())) {
      nextForm.title = extracted.title;
      filledFields.push("title");
    } else {
      skippedFields.push("title");
    }
  }

  if (extracted.description) {
    if (
      !isUserOwned("description") &&
      (!preserveUserValues || !currentForm.description.trim())
    ) {
      nextForm.description = extracted.description;
      filledFields.push("description");
    } else {
      skippedFields.push("description");
    }
  }

  if (extracted.url) {
    if (!isUserOwned("url") && (!preserveUserValues || !currentForm.url.trim())) {
      nextForm.url = extracted.url;
      filledFields.push("url");
    } else {
      skippedFields.push("url");
    }
  }

  if (extracted.town) {
    const matchedTown = matchCityOption(
      extracted.town,
      cityOptions,
      cityToRegionOptionMap,
    );
    if (matchedTown) {
      if (!isUserOwned("town") && (!preserveUserValues || !currentForm.town)) {
        nextForm.town = matchedTown;
        nextForm.region = cityToRegionOptionMap[matchedTown.value] ?? null;
        filledFields.push("town");
      } else {
        skippedFields.push("town");
      }
    } else if (!currentForm.town && !isUserOwned("town")) {
      unmatchedTown = extracted.town;
    }
  }

  if (extracted.location) {
    if (
      !isUserOwned("location") &&
      (!preserveUserValues || !currentForm.location.trim())
    ) {
      nextForm.location = extracted.location;
      filledFields.push("location");
    } else {
      skippedFields.push("location");
    }
  }

  if (extracted.categories.length > 0) {
    const matchedCategories = matchCategoryOptions(
      extracted.categories,
      categories,
    );
    if (matchedCategories.length > 0) {
      if (
        !isUserOwned("categories") &&
        (!preserveUserValues || currentForm.categories.length === 0)
      ) {
        nextForm.categories = matchedCategories;
        filledFields.push("categories");
      } else {
        skippedFields.push("categories");
      }
    }
  }

  if (extracted.startDate && extracted.endDate) {
    if (
      !isUserOwned("dates") &&
      (!preserveUserValues || autoDates || !currentForm.startDate)
    ) {
      nextForm.startDate = extracted.startDate;
      nextForm.endDate = extracted.endDate;
      nextForm.isAllDay = extracted.isAllDay;
      appliedDates = true;
      filledFields.push("dates");
    } else {
      skippedFields.push("dates");
    }
  }

  const resolvedPrice =
    extracted.priceResolution ??
    (extracted.price
      ? { ...priceToFormFields(extracted.price), needsReview: false }
      : null);

  if (resolvedPrice) {
    const hasPriceInfo =
      resolvedPrice.priceType !== "unknown" ||
      Boolean(resolvedPrice.originalPrice);
    const currentHasPrice =
      Boolean(currentForm.priceType && currentForm.priceType !== "unknown") ||
      Boolean(currentForm.priceAmount?.trim()) ||
      Boolean(currentForm.originalPrice?.trim());

    if (hasPriceInfo) {
      if (!isUserOwned("price") && (!preserveUserValues || !currentHasPrice)) {
        nextForm.priceType = resolvedPrice.priceType;
        nextForm.priceAmount = resolvedPrice.priceAmount;
        nextForm.originalPrice = resolvedPrice.originalPrice;
        filledFields.push("price");
      } else {
        skippedFields.push("price");
      }
    }
  }

  return {
    nextForm,
    filledFields,
    skippedFields,
    unmatchedTown,
    appliedDates,
  };
}

/**
 * Surgically undoes ONLY fields still owned by the autofill record. Any field
 * the user edited after autofill (even edited away and back) was removed from
 * `ownedFields` and is left untouched.
 */
export function undoPosterAutofill(
  currentForm: FormData,
  record: PosterAutofillUndoRecord,
): { nextForm: FormData; restoredAutoDates: boolean } {
  const nextForm = { ...currentForm };
  const { ownedFields, previousForm, previousAutoDates } = record;
  let restoredAutoDates = false;

  if (ownedFields.has("title")) nextForm.title = previousForm.title;
  if (ownedFields.has("description")) nextForm.description = previousForm.description;
  if (ownedFields.has("url")) nextForm.url = previousForm.url;
  if (ownedFields.has("town")) {
    nextForm.town = previousForm.town;
    nextForm.region = previousForm.region;
  }
  if (ownedFields.has("location")) nextForm.location = previousForm.location;
  if (ownedFields.has("categories")) nextForm.categories = previousForm.categories;
  if (ownedFields.has("dates")) {
    nextForm.startDate = previousForm.startDate;
    nextForm.endDate = previousForm.endDate;
    nextForm.isAllDay = previousForm.isAllDay;
    restoredAutoDates = previousAutoDates;
  }
  if (ownedFields.has("price")) {
    nextForm.priceType = previousForm.priceType;
    nextForm.priceAmount = previousForm.priceAmount;
    nextForm.originalPrice = previousForm.originalPrice;
  }

  return { nextForm, restoredAutoDates };
}
