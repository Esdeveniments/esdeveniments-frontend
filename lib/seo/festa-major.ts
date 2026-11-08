import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { siteUrl } from "@config/index";
import {
  buildPageMeta,
  generateCollectionPageSchema,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { formatPlacePhrases } from "@utils/string-helpers";
import { FESTES_MAJORS_SEGMENT } from "@utils/constants";
import { festaMajorPath } from "@utils/festa-major-paths";
import type { FestaMajorPageData } from "types/festa-major";
import type { AppLocale } from "types/i18n";

const MAX_JSON_LD_ACTS = 50;

/** Title, description and breadcrumbs of a /festa-major/<place> page. */
export async function getFestaMajorCopy(
  data: FestaMajorPageData,
  locale: AppLocale,
) {
  const t = await getTranslations({ locale, namespace: "Pages.FestaMajor" });
  const { place, currentYear: year } = data;
  const { placeOf } = formatPlacePhrases(
    place.label,
    place.type,
    locale,
  );

  const { title, metaTitle, metaDescription } =
    place.type === "region"
      ? {
          title: t("regionTitle", { placeOf, year }),
          metaTitle: t("regionMetaTitle", { placeOf, year }),
          metaDescription: t("regionMetaDescription", { placeOf, year }),
        }
      : {
          title: t("title", { placeOf, year }),
          metaTitle: t("metaTitle", { placeOf, year }),
          metaDescription: t("metaDescription", { placeOf, year }),
        };

  const breadcrumbs = [
    { name: t("breadcrumbHome"), url: toLocalizedUrl("/", locale) },
    {
      name: t("breadcrumbAll"),
      url: toLocalizedUrl(`/${FESTES_MAJORS_SEGMENT}`, locale),
    },
    ...(place.regionSlug && place.regionLabel
      ? [
          {
            name: place.regionLabel,
            url: toLocalizedUrl(festaMajorPath(place.regionSlug), locale),
          },
        ]
      : []),
    {
      name: place.label,
      url: toLocalizedUrl(festaMajorPath(place.slug), locale),
    },
  ];

  return {
    t,
    title,
    metaTitle,
    metaDescription,
    breadcrumbs,
    placeOf,
  };
}

/**
 * Thin or unknown hubs are noindex. A backend failure keeps default robots so
 * a blip doesn't drop a good hub from the index.
 */
export async function buildFestaMajorMetadata(
  data: FestaMajorPageData,
  locale: AppLocale,
): Promise<Metadata> {
  const { metaTitle, metaDescription } = await getFestaMajorCopy(data, locale);
  return buildPageMeta({
    title: metaTitle,
    description: metaDescription,
    canonical: `${siteUrl}${data.canonicalPath}`,
    locale,
    robotsOverride:
      data.available && !data.indexable ? "noindex, follow" : undefined,
  });
}

/** CollectionPage (with breadcrumbs) and, when there are acts, an ItemList. */
export function buildFestaMajorSchemas({
  data,
  locale,
  title,
  description,
  breadcrumbs,
}: {
  data: FestaMajorPageData;
  locale: AppLocale;
  title: string;
  description: string;
  breadcrumbs: { name: string; url: string }[];
}) {
  const url = toLocalizedUrl(data.canonicalPath, locale);
  const acts = data.town?.acts ?? [];
  const itemList = generateItemListStructuredData(
    acts.slice(0, MAX_JSON_LD_ACTS),
    title,
    description,
    locale,
    url,
  );
  const collection = generateCollectionPageSchema({
    title,
    description,
    url,
    breadcrumbs,
    locale,
    numberOfItems: acts.length || data.region?.towns.length || undefined,
    mainEntity: itemList ? { "@id": itemList["@id"] } : undefined,
  });
  return { collection, itemList };
}
