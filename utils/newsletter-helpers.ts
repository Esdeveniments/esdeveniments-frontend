import { formatCatalanA } from "@utils/helpers";
import { BYDATES, DEFAULT_FILTER_VALUE, getCategoryDisplayName } from "@utils/constants";
import type { NewsletterFormProps } from "types/props";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { PlaceTypeAndLabel } from "types/common";

export function buildNewsletterContextMessage({
  categoryLabel,
  placeLabel,
  placeType,
  byDateLabel,
}: NewsletterFormProps): string {
  const phraseParts: string[] = [];

  const base =
    categoryLabel && categoryLabel.trim().length > 0
      ? `esdeveniments de ${categoryLabel.toLowerCase()}`
      : "els millors plans";
  phraseParts.push(base);

  const normalizedByDate = byDateLabel?.toLowerCase();
  if (normalizedByDate) {
    const timePhrase =
      normalizedByDate === "cap de setmana"
        ? "aquest cap de setmana"
        : normalizedByDate === "avui"
        ? "avui"
        : normalizedByDate === "demà" || normalizedByDate === "dema"
        ? "demà"
        : normalizedByDate;
    phraseParts.push(timePhrase);
  }

  if (placeLabel) {
    // Use "a" preposition for location
    const locationPhrase = formatCatalanA(
      placeLabel,
      placeType || "general",
      false
    );
    phraseParts.push(locationPhrase);
  }

  return phraseParts.join(" ");
}

export function buildNewsletterPropsFromContext({
  place,
  placeTypeLabel,
  category,
  date,
  categories,
}: {
  place: string;
  placeTypeLabel?: PlaceTypeAndLabel;
  category?: string;
  date?: string;
  categories?: CategorySummaryResponseDTO[];
}): NewsletterFormProps | undefined {
  const normalizeFilter = (value?: string) =>
    value && value !== DEFAULT_FILTER_VALUE ? value : undefined;

  const normalizedCategory = normalizeFilter(category);
  const normalizedDate = normalizeFilter(date);
  const placeLabel = placeTypeLabel?.label || place;
  const categoryLabel = normalizedCategory
    ? getCategoryDisplayName(normalizedCategory, categories)
    : undefined;
  const byDateLabel = normalizedDate
    ? BYDATES.find((option) => option.value === normalizedDate)?.label ??
      normalizedDate
    : undefined;
  const placeType =
    placeTypeLabel?.type === "region" || placeTypeLabel?.type === "town"
      ? placeTypeLabel.type
      : undefined;

  const hasNewsletterContext =
    Boolean(placeLabel) || Boolean(normalizedCategory) || Boolean(normalizedDate);

  if (!hasNewsletterContext) return undefined;

  return {
    place,
    placeLabel,
    placeType,
    category: normalizedCategory,
    categoryLabel,
    byDate: normalizedDate,
    byDateLabel,
  };
}
