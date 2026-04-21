import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateWebPageSchema,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { parseNewsPagination } from "@utils/news-helpers";
import type { Href, RouteSearchParams } from "types/common";
import JsonLdServer from "@components/partials/JsonLdServer";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchNewsCities } from "@lib/api/news";

// Lazy load server component (below the fold, cities section)
const NewsCitiesSection = dynamic(() => import("@components/noticies/NewsCitiesSection"), {
  loading: () => null,
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.News" });
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/noticies`,
    locale,
  }) as unknown as Metadata;
}

export default function Page({
  searchParams,
}: Readonly<{
  searchParams?: Promise<RouteSearchParams>;
}>) {
  return (
    <div className="w-full bg-background pb-10">
      <div className="container flex flex-col gap-section-y min-w-0">
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsPageContent searchParamsPromise={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NewsPageContent({
  searchParamsPromise,
}: Readonly<{
  searchParamsPromise?: Promise<RouteSearchParams>;
}>) {
  const localePromise = getLocaleSafely();
  const tPromise = localePromise.then((locale) =>
    getTranslations({ locale, namespace: "App.News" })
  );
  const [locale, query, t] = await Promise.all([
    localePromise,
    searchParamsPromise ?? Promise.resolve<RouteSearchParams>({}),
    tPromise,
  ]);
  const withLocale = (path: string) => withLocalePath(path, locale);
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;
  const { currentPage, pageSize } = parseNewsPagination(query);

  const citiesParam =
    typeof query.cities === "string"
      ? query.cities
      : Array.isArray(query.cities)
        ? query.cities[0]
        : undefined;
  const showAllCities = citiesParam === "all";
  const citiesSize = showAllCities ? 200 : 30;

  // NOTE: Backend expects a city/region name for `place`.
  // For the main /noticies feed, fetch without place to get global latest.
  const articlePlaceSlug = "catalunya";
  const newsPromise = fetchNews({ page: currentPage, size: pageSize });
  const placeTypePromise = getPlaceTypeAndLabelCached(articlePlaceSlug);
  const citiesPromise = fetchNewsCities({ page: 0, size: citiesSize });

  const noticiesBasePath = withLocale("/noticies");
  const showMoreParams = new URLSearchParams();
  if (currentPage) showMoreParams.set("page", String(currentPage));
  if (pageSize !== 10) showMoreParams.set("size", String(pageSize));
  showMoreParams.set("cities", "all");
  const showMoreHref = `${noticiesBasePath}?${showMoreParams.toString()}` as Href;

  const showLessParams = new URLSearchParams();
  if (currentPage) showLessParams.set("page", String(currentPage));
  if (pageSize !== 10) showLessParams.set("size", String(pageSize));
  const showLessHref = (showLessParams.toString()
    ? `${noticiesBasePath}?${showLessParams.toString()}`
    : noticiesBasePath) as Href;

  const breadcrumbs = [
    { name: t("breadcrumbHome"), url: absolute("/") },
    { name: t("breadcrumbCurrent"), url: absolute("/noticies") },
  ];
  const webPageSchema = generateWebPageSchema({
    title: t("heading"),
    description: t("metaDescription"),
    url: absolute("/noticies"),
    breadcrumbs,
    locale,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  return (
    <>
      <JsonLdServer id="news-list-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-list-breadcrumbs" data={breadcrumbListSchema} />
      )}

      <Breadcrumbs
        items={[
          { label: t("breadcrumbHome"), href: "/" },
          { label: t("breadcrumbCurrent") },
        ]}
        className="px-section-x pt-4"
      />

      <header className="w-full mb-section-y-sm">
        <h1 className="heading-1 uppercase text-foreground-strong mb-element-gap">
          {t("heading")}
        </h1>
        <p className="body-large text-foreground-strong/80 text-left">
          {t("intro")}
        </p>
      </header>

      <Suspense fallback={<NewsListSkeleton />}>
        <NewsList
          newsPromise={newsPromise}
          placeTypePromise={placeTypePromise}
          place={articlePlaceSlug}
          currentPage={currentPage}
          pageSize={pageSize}
          basePath="/noticies"
        />
      </Suspense>

      <Suspense fallback={null}>
        <NewsCitiesSection
          citiesPromise={citiesPromise}
          showAll={showAllCities}
          showMoreHref={showMoreHref}
          showLessHref={showLessHref}
        />
      </Suspense>
    </>
  );
}
