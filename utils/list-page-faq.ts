import type { CategorySummaryResponseDTO } from "types/api/category";
import type { PlaceTypeAndLabel } from "types/common";
import type { DateContextLabels, FaqItem, ListPageFaqLabels } from "types/faq";
import type { DateContext, ListPageFaqParams } from "types/props";
import { capitalizeFirstLetter, formatPlacePreposition } from "@utils/helpers";

const fillTemplate = (
  template: string,
  replacements: Record<string, string>
): string =>
  Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    template
  );

function getDateContext(
  dateLabels: DateContextLabels,
  date?: string
): DateContext {
  const inline = date ? dateLabels.inline[date] : undefined;
  const capitalized = date ? dateLabels.capitalized[date] : undefined;
  return {
    inline: inline || dateLabels.fallbackInline,
    capitalized: capitalized || dateLabels.fallbackCapitalized,
  };
}

function getScopePhrase(
  place: string,
  placeTypeLabel?: PlaceTypeAndLabel,
  locale?: ListPageFaqParams["locale"]
): string {
  if (placeTypeLabel?.label) {
    return formatPlacePreposition(
      placeTypeLabel.label,
      placeTypeLabel.type ?? "general",
      locale,
      false
    );
  }

  if (place === "catalunya" || !place) {
    if (locale === "en") return "in Catalonia";
    if (locale === "es") return "en Cataluña";
    return "a Catalunya";
  }

  return formatPlacePreposition(place, "general", locale, false);
}

function composeContext(...parts: (string | undefined)[]): string {
  return parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCategoryName(
  category?: string,
  categories?: CategorySummaryResponseDTO[]
): string | undefined {
  if (!category || category === "tots") return undefined;
  const match = categories?.find((cat) => cat.slug === category);
  if (match?.name) return match.name;
  return capitalizeFirstLetter(category.replace(/-/g, " "));
}


export function buildListPageFaqItems({
  place,
  date,
  category,
  placeTypeLabel,
  categories,
  locale,
  labels,
  dateLabels,
}: ListPageFaqParams & {
  labels: ListPageFaqLabels;
  dateLabels: DateContextLabels;
}): FaqItem[] {
  const dateContext = getDateContext(dateLabels, date);
  const scopePhrase = getScopePhrase(place, placeTypeLabel, locale);
  const contextInline = composeContext(dateContext.inline, scopePhrase);
  const capitalizedContext = capitalizeFirstLetter(
    composeContext(dateContext.capitalized, scopePhrase)
  );
  const categoryName = resolveCategoryName(category, categories);

  const items: FaqItem[] = [
    {
      q: fillTemplate(labels.q1, { contextInline }),
      a: fillTemplate(labels.a1, { capitalizedContext }),
    },
    {
      q: fillTemplate(labels.q2, { contextInline }),
      a: fillTemplate(labels.a2, { contextInline }),
    },
  ];

  if (categoryName) {
    items.push({
      q: fillTemplate(labels.q3, {
        categoryName: categoryName.toLowerCase(),
        contextInline,
      }),
      a: fillTemplate(labels.a3, {
        categoryName,
        contextInline,
      }),
    });
  }

  return items;
}

