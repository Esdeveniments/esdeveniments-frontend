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
import type { Href } from "types/common";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchNewsCities } from "@lib/api/news";

// Lazy load server component (below the fold, cities section)
// No client wrapper needed - it's a server component
const NewsCitiesSection = dynamic(() => import("@components/noticies/NewsCitiesSection"), {
  // No ssr: false needed - it's a server component
  loading: () => null, // Cities section is below the fold
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

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.News" });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;

  // Option A: /noticies shows latest Catalunya news.
  const query = (await (searchParams || Promise.resolve({}))) as {
    [key: string]: string | string[] | undefined;
  };
  const pageParam =
    typeof query.page === "string"
      ? query.page
      : Array.isArray(query.page)
        ? query.page[0]
        : undefined;
  const sizeParam =
    typeof query.size === "string"
      ? query.size
      : Array.isArray(query.size)
        ? query.size[0]
        : undefined;
  const parsedPage = Number.isFinite(Number(pageParam))
    ? Number(pageParam)
    : 0;
  const currentPage = parsedPage >= 0 ? parsedPage : 0;
  const parsedSize = Number.isFinite(Number(sizeParam))
    ? Number(sizeParam)
    : 10;
  const pageSize = parsedSize > 0 ? parsedSize : 10;

  const citiesParam =
    typeof query.cities === "string"
      ? query.cities
      : Array.isArray(query.cities)
        ? query.cities[0]
        : undefined;
  const showAllCities = citiesParam === "all";
  const citiesSize = showAllCities ? 200 : 30;

  // NOTE: Backend expects a city/region name for `place`.
  // Swagger shows `place` is optional; using "catalunya" can yield 0 results.
  // For the main /noticies feed, fetch without place to get global latest.
  // We still use "catalunya" as the URL segment when linking to articles.
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
    <div className="container flex-col justify-center items-center mt-8 pb-section-y-lg">
      <JsonLdServer id="news-list-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-list-breadcrumbs" data={breadcrumbListSchema} />
      )}

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 w-full px-2 lg:px-0 body-small text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <PressableAnchor
              href={withLocale("/")}
              className="hover:underline hover:text-primary transition-colors"
              variant="inline"
              prefetch={false}
            >
              {t("breadcrumbHome")}
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1" aria-hidden="true">/</span>
          </li>
          <li className="text-foreground-strong font-medium" aria-current="page">
            {t("breadcrumbCurrent")}
          </li>
        </ol>
      </nav>

      {/* Page Header Section */}
      <header className="w-full px-2 lg:px-0 mb-section-y-sm">
        <h1 className="heading-1 uppercase text-foreground-strong mb-element-gap">
          {t("heading")}
        </h1>
        <p className="body-large text-foreground-strong/80 text-left">
          {t("intro")}
        </p>
      </header>

      {/* Latest News List (Catalunya) */}
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

      {/* Featured places section temporarily disabled. */}
    </div>
  );
}
