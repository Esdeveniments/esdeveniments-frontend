import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { siteUrl } from "@config/index";
import { buildPageMeta } from "@components/partials/seo-meta";
import { fetchFestivityPage } from "@lib/api/festivities";
import { festivityPath, getFestivityType } from "@utils/festivity";
import { toLocalizedUrl } from "@utils/i18n-seo";
import type { FestivityPageData, FestivitySlug } from "types/festivity";
import type { AppLocale } from "types/i18n";

/** Title, description and breadcrumbs of a /<festivity> page. */
export async function getFestivityCopy(
  data: FestivityPageData,
  locale: AppLocale,
) {
  const [t, tHub] = await Promise.all([
    getTranslations({ locale, namespace: "Pages.Festivity" }),
    getTranslations({ locale, namespace: "Pages.FestaMajor" }),
  ]);
  const key = getFestivityType(data.slug).messageKey;
  const { year } = data;
  const path = festivityPath(data.slug);
  return {
    t,
    tHub,
    path,
    title: t(`types.${key}.title`, { year }),
    lead: t(`types.${key}.lead`),
    metaTitle: t(`types.${key}.metaTitle`, { year }),
    metaDescription: t(`types.${key}.metaDescription`, { year }),
    breadcrumbs: [
      {
        name: tHub("breadcrumbHome"),
        url: toLocalizedUrl("/", locale),
      },
      {
        name: t(`types.${key}.name`),
        url: toLocalizedUrl(path, locale),
      },
    ],
  };
}

export async function buildFestivityMetadata(
  slug: FestivitySlug,
): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const data = await fetchFestivityPage(slug);
  const { metaTitle, metaDescription, path } = await getFestivityCopy(
    data,
    locale,
  );
  return buildPageMeta({
    title: metaTitle,
    description: metaDescription,
    canonical: `${siteUrl}${path}`,
    locale,
    // A backend failure keeps the default robots, like the festa major pages.
    robotsOverride:
      data.available && !data.indexable ? "noindex, follow" : undefined,
  });
}
