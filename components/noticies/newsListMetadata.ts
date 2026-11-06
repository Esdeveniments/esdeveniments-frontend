import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageMeta } from "@components/partials/seo-meta";
import { fetchNews } from "@lib/api/news";
import { siteUrl } from "@config/index";
import { NEWS_PAGE_SIZE } from "@utils/constants";
import { getNewsBasePath } from "@utils/news-helpers";
import type { AppLocale } from "types/i18n";

/**
 * Metadata for /noticies and /noticies/[place]. Each page is its own canonical
 * (`?page=N`) so crawlers index older articles; a page past the last one is
 * noindexed (the page already streamed its 200, so it can't 404).
 */
export async function buildNewsListMetadata({
  title,
  description,
  place,
  page,
  locale,
}: {
  title: string;
  description: string;
  place?: string;
  page: number;
  locale: AppLocale;
}): Promise<Metadata> {
  let pageTitle = title;
  let robotsOverride: string | undefined;
  if (page > 1) {
    const [t, { totalPages }] = await Promise.all([
      getTranslations({ locale, namespace: "Components.NewsList" }),
      fetchNews({ page: page - 1, size: NEWS_PAGE_SIZE, place }),
    ]);
    pageTitle = t("pageTitle", { title, page });
    if (page > totalPages) robotsOverride = "noindex, follow";
  }

  return buildPageMeta({
    title: pageTitle,
    description,
    canonical: `${siteUrl}${getNewsBasePath(place)}`,
    canonicalSearch: page > 1 ? `page=${page}` : undefined,
    locale,
    robotsOverride,
  }) as unknown as Metadata;
}
