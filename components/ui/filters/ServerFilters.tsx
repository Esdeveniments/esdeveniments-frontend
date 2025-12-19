import { JSX } from "react";
import { getTranslations } from "next-intl/server";
import FiltersClient from "./FiltersClient";
import type { ServerFiltersProps } from "types/props";
import { CATEGORY_CONFIG } from "@config/categories";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";

const ServerFilters = async ({
  segments,
  queryParams,
  categories = [],
  placeTypeLabel,
  onOpenModal,
}: ServerFiltersProps): Promise<JSX.Element> => {
  const tFilters = await getTranslations("Config.Filters");
  const tFiltersUi = await getTranslations("Components.Filters");
  const tByDates = await getTranslations("Config.ByDates");
  const tCategories = await getTranslations("Config.Categories");
  const tSeoCategoryData = await getTranslations("Partials.GeneratePagesData");

  const getCategoryLabelBySlug = (
    slug: unknown,
    fallbackName?: string
  ): string | null => {
    const normalizedSlug = typeof slug === "string" ? slug.toLowerCase() : "";
    if (!normalizedSlug) return null;

    const config = CATEGORY_CONFIG[normalizedSlug];
    if (config?.labelKey) {
      return tCategories(config.labelKey);
    }

    const seoKey = `categories.${normalizedSlug}.titleSuffix` as Parameters<
      typeof tSeoCategoryData
    >[0];
    if (tSeoCategoryData.has(seoKey)) {
      return tSeoCategoryData(seoKey);
    }

    return fallbackName || normalizedSlug;
  };

  const baseCategoryEntries = Object.entries(CATEGORY_CONFIG)
    .map(([slug, config]) => {
      if (!config?.labelKey) return null;
      const normalizedSlug = slug.toLowerCase();
      return [normalizedSlug, tCategories(config.labelKey)] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  const dynamicCategoryEntries = categories
    .map((category) => {
      const normalizedSlug =
        typeof category.slug === "string" ? category.slug.toLowerCase() : "";
      if (!normalizedSlug) return null;
      const label = getCategoryLabelBySlug(normalizedSlug, category.name);
      if (!label) return null;
      return [normalizedSlug, label] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  const currentCategorySlugRaw = segments.category;
  const currentCategorySlug =
    typeof currentCategorySlugRaw === "string"
      ? currentCategorySlugRaw.toLowerCase()
      : "";
  const currentCategoryEntry: readonly [string, string] | null =
    currentCategorySlug && currentCategorySlug !== DEFAULT_FILTER_VALUE
      ? (() => {
          const label = getCategoryLabelBySlug(currentCategorySlug);
          return label ? ([currentCategorySlug, label] as const) : null;
        })()
      : null;

  const categoryLabelsBySlug = Object.fromEntries(
    new Map<string, string>([
      ...baseCategoryEntries,
      ...dynamicCategoryEntries,
      ...(currentCategoryEntry ? [currentCategoryEntry] : []),
    ])
  );

  const labels = {
    triggerLabel: tFiltersUi("triggerLabel"),
    displayNameMap: {
      place: tFilters("place"),
      category: tFilters("category"),
      byDate: tFilters("date"),
      distance: tFilters("distance"),
      searchTerm: tFilters("search"),
    },
    byDates: {
      avui: tByDates("today"),
      dema: tByDates("tomorrow"),
      setmana: tByDates("week"),
      "cap-de-setmana": tByDates("weekend"),
    },
    categoryLabelsBySlug,
  };

  return (
    <FiltersClient
      segments={segments}
      queryParams={queryParams}
      categories={categories}
      placeTypeLabel={placeTypeLabel}
      onOpenModal={onOpenModal}
      labels={labels}
    />
  );
};

export default ServerFilters;
