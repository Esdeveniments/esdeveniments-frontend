import { formatCatalanDe } from "@utils/helpers";
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
  const parts: string[] = [];

  if (categoryLabel) {
    parts.push(categoryLabel);
  } else {
    parts.push("els millors plans");
  }

  if (placeLabel && placeLabel !== "Catalunya") {
    const preposition = formatCatalanDe(
      placeLabel,
      false,
      false,
      placeType || "general"
    );
    parts.push(preposition);
  }

  if (byDateLabel) {
    parts.push(`(${byDateLabel.toLowerCase()})`);
  }

  return parts.join(" ");
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
