import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { parseNewsPagination } from "@utils/news-helpers";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import type { RouteSearchParams } from "types/common";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>;
}): Promise<Metadata> {
  const { place } = await params;
  const placeType = await getPlaceTypeAndLabelCached(place);
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.NewsPlace" });
  const base = buildPageMeta({
    title: t("metaTitle", { place: placeType.label }),
    description: t("metaDescription", { place: placeType.label }),
    canonical: `${siteUrl}/noticies/${place}`,
    locale,
  }) as unknown as Metadata;
  return {
    ...base,
    alternates: {
      ...(base.alternates || {}),
      types: {
        ...((base.alternates && base.alternates.types) || {}),
        "application/rss+xml": [
          {
            url: `/noticies/${place}/rss.xml`,
            title: t("rssTitle", { place: placeType.label }),
          },
        ],
      },
    },
  };
}

export default function Page({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ place: string }>;
  searchParams?: Promise<RouteSearchParams>;
}>) {
  return (
    <div className="w-full bg-background pb-10">
      <div className="container flex flex-col gap-section-y min-w-0">
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsPlacePageContent
            paramsPromise={params}
            searchParamsPromise={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function NewsPlacePageContent({
  paramsPromise,
  searchParamsPromise,
}: Readonly<{
  paramsPromise: Promise<{ place: string }>;
  searchParamsPromise?: Promise<RouteSearchParams>;
}>) {
  // Resolve independent inputs in parallel.
  const [{ place }, locale, query] = await Promise.all([
    paramsPromise,
    getLocaleSafely(),
    searchParamsPromise ?? Promise.resolve<RouteSearchParams>({}),
  ]);
  const t = await getTranslations({ locale, namespace: "App.NewsPlace" });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const { currentPage, pageSize } = parseNewsPagination(query);

  const newsPromise = fetchNews({ page: currentPage, size: pageSize, place });
  // Catch once on the shared promise so both this gate and <NewsList> below
  // receive a fulfilled promise (otherwise a rejection here propagates to
  // <NewsList> and breaks the streamed list).
  const placeTypePromise = getPlaceTypeAndLabelCached(place).catch(() => ({
    type: "" as const,
    label: place,
  }));
  const { label: placeLabel } = await placeTypePromise;

  const breadcrumbs = [
    { name: t("breadcrumbHome"), url: siteUrl },
    { name: t("breadcrumbNews"), url: `${siteUrl}/noticies` },
    { name: placeLabel, url: `${siteUrl}/noticies/${place}` },
  ];

  const webPageSchema = generateWebPageSchema({
    title: t("heading", { place: placeLabel }),
    description: t("metaDescription", { place: placeLabel }),
    url: `${siteUrl}/noticies/${place}`,
    breadcrumbs,
    locale,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);
  const agendaHref = place === "catalunya" ? "/catalunya" : `/${place}`;

  return (
    <>
      <JsonLdServer id="news-place-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-place-breadcrumbs" data={breadcrumbListSchema} />
      )}

      <Breadcrumbs
        items={[
          { label: t("breadcrumbHome"), href: "/" },
          { label: t("breadcrumbNews"), href: "/noticies" },
          { label: placeLabel },
        ]}
        className="px-section-x pt-4"
      />

      <header className="w-full mb-section-y-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-element-gap mb-element-gap">
          <h1 className="heading-1 uppercase text-foreground-strong flex-1">
            {t("heading", { place: placeLabel })}
          </h1>
          <nav
            aria-label="Page actions"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-0"
          >
            <PressableAnchor
              href={withLocale(agendaHref)}
              className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              prefetch={false}
              variant="inline"
            >
              {t("seeAgenda", { place: placeLabel })}
            </PressableAnchor>
            <span className="hidden sm:inline text-foreground-strong/30" aria-hidden="true">
              ·
            </span>
            <PressableAnchor
              href={withLocale(`/noticies`)}
              className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              prefetch={false}
              variant="inline"
            >
              {t("seeAll")}
            </PressableAnchor>
          </nav>
        </div>
      </header>

      <Suspense fallback={<NewsListSkeleton />}>
        <NewsList
          newsPromise={newsPromise}
          placeTypePromise={placeTypePromise}
          place={place}
          currentPage={currentPage}
          pageSize={pageSize}
        />
      </Suspense>
    </>
  );
}
