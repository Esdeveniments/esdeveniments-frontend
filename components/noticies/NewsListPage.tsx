import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import type { NewsListPageProps } from "types/props";
import type { AppLocale } from "types/i18n";
import { fetchNews, fetchNewsCities } from "@lib/api/news";
import {
  generateBreadcrumbList,
  generateWebPageSchema,
} from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import HeadingLayout from "@components/ui/hybridEventsList/HeadingLayout";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { getNewsBasePath } from "@utils/news-helpers";
import { NEWS_CITIES_LIMIT, NEWS_PAGE_SIZE } from "@utils/constants";

// Shared shell of /noticies and /noticies/[place]; the heading matches the
// event listings (HybridEventsList).
export default async function NewsListPage({
  place,
  placeLabel,
  placeType,
  title,
  subtitle,
  page,
  cta,
}: NewsListPageProps) {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.News" });
  const basePath = getNewsBasePath(place);
  const newsPromise = fetchNews({ page: page - 1, size: NEWS_PAGE_SIZE, place });
  const citiesPromise = fetchNewsCities({ page: 0, size: NEWS_CITIES_LIMIT });

  const crumbs = [
    { label: t("breadcrumbHome"), href: "/" },
    { label: t("breadcrumbCurrent"), href: place ? "/noticies" : undefined },
    ...(place ? [{ label: placeLabel }] : []),
  ];
  const breadcrumbs = crumbs.map((crumb) => ({
    name: crumb.label,
    url: toLocalizedUrl(crumb.href ?? basePath, locale),
  }));
  const webPageSchema = generateWebPageSchema({
    title,
    description: subtitle,
    url: toLocalizedUrl(basePath, locale),
    breadcrumbs,
    locale,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  return (
    <div className="w-full bg-background pb-section-y">
      <div className="container flex flex-col gap-element-gap min-w-0">
        <JsonLdServer id="news-list-webpage" data={webPageSchema} />
        {breadcrumbListSchema && (
          <JsonLdServer id="news-list-breadcrumbs" data={breadcrumbListSchema} />
        )}
        <Breadcrumbs items={crumbs} className="pt-4" />
        <div>
          <HeadingLayout
            title={title}
            subtitle={subtitle}
            titleClass={place ? "heading-2" : "heading-1"}
            subtitleClass={place ? "body-normal" : "body-large"}
            cta={cta}
          />
        </div>
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsList
            newsPromise={newsPromise}
            citiesPromise={citiesPromise}
            place={place}
            placeLabel={placeLabel}
            placeType={placeType}
            page={page}
            basePath={basePath}
          />
        </Suspense>
      </div>
    </div>
  );
}
