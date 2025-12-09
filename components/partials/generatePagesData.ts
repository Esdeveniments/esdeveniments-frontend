import { siteUrl } from "@config/index";
import { headers } from "next/headers";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { getTranslations } from "next-intl/server";
import {
  PageData,
  GeneratePagesDataProps,
  PlaceTypeAndLabel,
} from "types/common";
import { formatCatalanA } from "@utils/helpers";
import { splitNotFoundText } from "@utils/notFoundMessaging";
import {
  applyLocaleToCanonical,
  resolveLocaleFromHeaders,
} from "@utils/i18n-seo";
import { DEFAULT_LOCALE } from "types/i18n";

// Normalize subtitles for LLM/AI SEO extractability:
// - Remove HTML
// - Replace multiple spaces
// - Replace exclamations with periods
// - Limit to at most two sentences
// - Cap length to ~200 chars, cutting at last space
function normalizeSubTitle(input: string): string {
  let s = (input || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return s;
  s = s.replace(/!/g, ".");

  // Limit to two sentences (., ?, !)
  const ends: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "." || ch === "?" || ch === "!") ends.push(i);
    if (ends.length === 2) break;
  }
  if (ends.length === 2) {
    s = s.slice(0, ends[1] + 1);
  }

  // Cap length to 200 chars
  const MAX_LEN = 200;
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const lastSpace = cut.lastIndexOf(" ");
    s = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
    if (!/[.!?]$/.test(s)) s += ".";
  }

  return s;
}

const baseCreatePageData = (
  title: string,
  subTitle: string,
  metaTitle: string,
  metaDescription: string,
  canonical: string,
  notFoundText: string,
  searchQuery?: string
): PageData => {
  const { title: notFoundTitle, description: notFoundDescription } =
    splitNotFoundText(notFoundText, searchQuery);
  return {
    title,
    subTitle: normalizeSubTitle(subTitle),
    metaTitle,
    metaDescription,
    canonical,
    notFoundTitle,
    notFoundDescription,
  };
};

export async function generatePagesData({
  currentYear,
  place = "",
  byDate = "",
  placeTypeLabel,
  category,
  categoryName,
  search,
}: GeneratePagesDataProps & {
  placeTypeLabel?: PlaceTypeAndLabel;
}): Promise<PageData> {
  const t = await getTranslations("Partials.GeneratePagesData");
  const tConstants = await getTranslations("Components.Constants");
  const months = (tConstants.raw("months") as string[]) || [];
  const month = months[new Date().getMonth()] || "";
  let resolvedLocale = DEFAULT_LOCALE;
  try {
    const headersList = await headers();
    resolvedLocale =
      resolveLocaleFromHeaders(headersList) || DEFAULT_LOCALE;
  } catch {
    resolvedLocale = DEFAULT_LOCALE;
  }
  const categoryTemplates = (t.raw("categories") || {}) as Record<
    string,
    {
      titleSuffix: string;
      description: string;
      context: string;
      noEvents: string;
    }
  >;
  const getCategorySEO = (categorySlug?: string) => {
    if (!categorySlug) return null;
    return categoryTemplates[categorySlug] || null;
  };
  if (
    typeof currentYear === "number" &&
    (currentYear < 2000 || currentYear > 3000)
  ) {
    throw new Error("Invalid year range");
  }

  const { type, label }: PlaceTypeAndLabel =
    placeTypeLabel || (await getPlaceTypeAndLabel(place));
  // keep legacy naming compatibility without unused var warnings
  const labelWithArticle = formatCatalanA(label, type, false);

  // Get category-specific SEO data
  const categorySEO = getCategorySEO(category);
  const createPageData = (
    title: string,
    subTitle: string,
    metaTitle: string,
    metaDescription: string,
    canonical: string,
    notFoundText: string
  ) =>
    baseCreatePageData(
      title,
      subTitle,
      metaTitle,
      metaDescription,
      applyLocaleToCanonical(canonical, resolvedLocale),
      notFoundText,
      search
    );

  if (!place && !byDate) {
    return createPageData(
      t("root.title", { year: currentYear }),
      t("root.subTitle", { month }),
      t("root.metaTitle", { month }),
      t("root.metaDescription", { month }),
      siteUrl,
      t("root.notFound")
    );
  }

  // Category-specific pages with enhanced SEO
  if (category && categorySEO && place) {
    const categoryTitle = categoryName || categorySEO.titleSuffix;
    const baseCanonical = `${siteUrl}/${place}${
      byDate ? `/${byDate}` : ""
    }/${category}`;

    if (byDate === "avui") {
      return createPageData(
        t("categoryWithDate.avui.title", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.avui.subTitle", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.avui.metaTitle", {
          categoryTitle,
          label: labelWithArticle,
        }),
        t("categoryWithDate.avui.metaDescription", {
          context: categorySEO.context,
          label: labelWithArticle,
        }),
        baseCanonical,
        t("categoryWithDate.avui.notFound", {
          noEventsText:
            categorySEO.noEvents || categorySEO.description.split(",")[0],
          label: labelWithArticle,
        })
      );
    } else if (byDate === "dema") {
      return createPageData(
        t("categoryWithDate.dema.title", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.dema.subTitle", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.dema.metaTitle", {
          categoryTitle,
          label: labelWithArticle,
        }),
        t("categoryWithDate.dema.metaDescription", {
          context: categorySEO.context,
          label: labelWithArticle,
        }),
        baseCanonical,
        t("categoryWithDate.dema.notFound", {
          noEventsText:
            categorySEO.noEvents || categorySEO.description.split(",")[0],
          label: labelWithArticle,
        })
      );
    } else if (byDate === "setmana") {
      return createPageData(
        t("categoryWithDate.setmana.title", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.setmana.subTitle", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.setmana.metaTitle", {
          categoryTitle,
          label: labelWithArticle,
        }),
        t("categoryWithDate.setmana.metaDescription", {
          context: categorySEO.context,
          label: labelWithArticle,
        }),
        baseCanonical,
        t("categoryWithDate.setmana.notFound", {
          noEventsText:
            categorySEO.noEvents || categorySEO.description.split(",")[0],
          label: labelWithArticle,
        })
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        t("categoryWithDate.capDeSetmana.title", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.capDeSetmana.subTitle", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryWithDate.capDeSetmana.metaTitle", {
          categoryTitle,
          label: labelWithArticle,
        }),
        t("categoryWithDate.capDeSetmana.metaDescription", {
          context: categorySEO.context,
          label: labelWithArticle,
        }),
        baseCanonical,
        t("categoryWithDate.capDeSetmana.notFound", {
          noEventsText:
            categorySEO.noEvents || categorySEO.description.split(",")[0],
          label: labelWithArticle,
        })
      );
    } else {
      // General category page without date filter
      return createPageData(
        t("categoryNoDate.title", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryNoDate.subTitle", {
          titleSuffix: categorySEO.titleSuffix,
          label: labelWithArticle,
        }),
        t("categoryNoDate.metaTitle", {
          categoryTitle,
          label: labelWithArticle,
        }),
        t("categoryNoDate.metaDescription", {
          context: categorySEO.context,
          label: labelWithArticle,
        }),
        baseCanonical,
        t("categoryNoDate.notFound", {
          noEventsText:
            categorySEO.noEvents || categorySEO.description.split(",")[0],
          label: labelWithArticle,
        })
      );
    }
  }

  if (type === "region" && !byDate) {
    return createPageData(
      t("regionNoDate.title", { label: labelWithArticle, year: currentYear }),
      t("regionNoDate.subTitle", { label: labelWithArticle, month }),
      t("regionNoDate.metaTitle", {
        label: labelWithArticle,
        year: currentYear,
      }),
      t("regionNoDate.metaDescription", { label: labelWithArticle, month }),
      `${siteUrl}/${place}`,
      t("regionNoDate.notFound", { label: labelWithArticle })
    );
  }

  if (type === "town" && !byDate) {
    // Special handling for Barcelona: include "Esdeveniments" with natural phrasing
    const isBarcelona = place === "barcelona";
    const title = isBarcelona
      ? t("townNoDate.barcelona.title", { year: currentYear })
      : t("townNoDate.default.title", {
          label: labelWithArticle,
          year: currentYear,
        });
    const metaTitle = isBarcelona
      ? t("townNoDate.barcelona.metaTitle", { year: currentYear })
      : t("townNoDate.default.metaTitle", { label: labelWithArticle, month });
    const metaDescription = isBarcelona
      ? t("townNoDate.barcelona.metaDescription", { month })
      : t("townNoDate.default.metaDescription", {
          label: labelWithArticle,
          month,
        });

    return createPageData(
      title,
      t("townNoDate.subTitle", { label: labelWithArticle, month }),
      metaTitle,
      metaDescription,
      `${siteUrl}/${place}`,
      t("townNoDate.notFound", { label: labelWithArticle })
    );
  }

  if (byDate && place) {
    if (byDate === "avui") {
      return createPageData(
        t("byDatePlace.avui.title", { label: labelWithArticle }),
        t("byDatePlace.avui.subTitle", { label: labelWithArticle }),
        t("byDatePlace.avui.metaTitle", { label: labelWithArticle }),
        t("byDatePlace.avui.metaDescription", { label: labelWithArticle }),
        `${siteUrl}/${place}/${byDate}`,
        t("byDatePlace.avui.notFound", { label: labelWithArticle })
      );
    } else if (byDate === "dema") {
      return createPageData(
        t("byDatePlace.dema.title", { label: labelWithArticle }),
        t("byDatePlace.dema.subTitle", { label: labelWithArticle }),
        t("byDatePlace.dema.metaTitle", { label: labelWithArticle }),
        t("byDatePlace.dema.metaDescription", { label: labelWithArticle }),
        `${siteUrl}/${place}/${byDate}`,
        t("byDatePlace.dema.notFound", { label: labelWithArticle })
      );
    } else if (byDate === "setmana") {
      return createPageData(
        t("byDatePlace.setmana.title", { label: labelWithArticle }),
        t("byDatePlace.setmana.subTitle", { label: labelWithArticle }),
        t("byDatePlace.setmana.metaTitle", { label: labelWithArticle }),
        t("byDatePlace.setmana.metaDescription", { label: labelWithArticle }),
        `${siteUrl}/${place}/${byDate}`,
        t("byDatePlace.setmana.notFound", { label: labelWithArticle })
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        t("byDatePlace.capDeSetmana.title", { label: labelWithArticle }),
        t("byDatePlace.capDeSetmana.subTitle", { label: labelWithArticle }),
        t("byDatePlace.capDeSetmana.metaTitle", { label: labelWithArticle }),
        t("byDatePlace.capDeSetmana.metaDescription", {
          label: labelWithArticle,
        }),
        `${siteUrl}/${place}/${byDate}`,
        t("byDatePlace.capDeSetmana.notFound", { label: labelWithArticle })
      );
    }
  }

  if (byDate && !place) {
    if (byDate === "avui") {
      return createPageData(
        t("byDateNoPlace.avui.title"),
        t("byDateNoPlace.avui.subTitle"),
        t("byDateNoPlace.avui.metaTitle"),
        t("byDateNoPlace.avui.metaDescription"),
        t("byDateNoPlace.avui.canonical", { siteUrl, byDate }),
        t("byDateNoPlace.avui.notFound")
      );
    } else if (byDate === "dema") {
      return createPageData(
        t("byDateNoPlace.dema.title"),
        t("byDateNoPlace.dema.subTitle"),
        t("byDateNoPlace.dema.metaTitle"),
        t("byDateNoPlace.dema.metaDescription"),
        t("byDateNoPlace.dema.canonical", { siteUrl, byDate }),
        t("byDateNoPlace.dema.notFound")
      );
    } else if (byDate === "setmana") {
      return createPageData(
        t("byDateNoPlace.setmana.title"),
        t("byDateNoPlace.setmana.subTitle"),
        t("byDateNoPlace.setmana.metaTitle"),
        t("byDateNoPlace.setmana.metaDescription"),
        t("byDateNoPlace.setmana.canonical", { siteUrl, byDate }),
        t("byDateNoPlace.setmana.notFound")
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        t("byDateNoPlace.capDeSetmana.title"),
        t("byDateNoPlace.capDeSetmana.subTitle"),
        t("byDateNoPlace.capDeSetmana.metaTitle"),
        t("byDateNoPlace.capDeSetmana.metaDescription"),
        t("byDateNoPlace.capDeSetmana.canonical", { siteUrl, byDate }),
        t("byDateNoPlace.capDeSetmana.notFound")
      );
    }
  }

  // Default fallback
  return createPageData(
    t("fallback.title", { year: currentYear }),
    t("fallback.subTitle", { month }),
    t("fallback.metaTitle", { year: currentYear }),
    t("fallback.metaDescription", { year: currentYear }),
    siteUrl,
    t("fallback.notFound")
  );
}
