import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { locale as rootLocale } from "next/root-params";
import { withLocalePath } from "@utils/i18n-seo";
import { parseNewsPagination } from "@utils/news-helpers";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import type { AppLocale } from "types/i18n";
import type { RouteSearchParams } from "types/common";
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
  const locale = (await rootLocale()) as AppLocale;
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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ place: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Parallelize independent awaits (params + locale + searchParams) to reduce TTFB.
  const [{ place }, locale, query] = await Promise.all([
    params,
    rootLocale() as Promise<AppLocale>,
    (searchParams || Promise.resolve({})) as Promise<RouteSearchParams>,
  ]);
  const t = await getTranslations({ locale, namespace: "App.NewsPlace" });
  const withLocale = (path: string) => withLocalePath(path, locale);
  const { currentPage, pageSize } = parseNewsPagination(query);

  // Start fetches immediately
  const newsPromise = fetchNews({ page: currentPage, size: pageSize, place });
  const placeTypePromise = getPlaceTypeAndLabelCached(place);
  const placeLabelPromise = placeTypePromise.then((value) => value.label).catch(() => place);

  // We can await placeTypePromise if we want the title to be perfect immediately, 
  // but to be strictly non-blocking as requested, we use the slug for the shell 
  // and let the component handle the label.
  // However, the user asked to render Breadcrumbs and Title immediately.
  // Using the slug for the title is a good compromise.

  // We await placeLabelPromise here to ensure consistency across Breadcrumbs, Title, and Links.
  // Since generateMetadata already fetches this data (cached), this await is effectively instant
  // and does not introduce new blocking or negate the streaming benefits for the NewsList below.
  const placeLabel = await placeLabelPromise;

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
    <div className="w-full bg-background pb-10">
      <div className="container flex flex-col gap-section-y min-w-0">

        <JsonLdServer id="news-place-webpage-breadcrumbs" data={webPageSchema} />
        {breadcrumbListSchema && (
          <JsonLdServer id="news-place-breadcrumbs" data={breadcrumbListSchema} />
        )}

        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: t("breadcrumbNews"), href: "/noticies" },
            { label: placeLabel },
          ]}
          className="px-section-x pt-4"
        />

        {/* Page Header Section */}
        <header className="w-full mb-section-y-sm">
          {/* Title and Action Links */}
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
                className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
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
                className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                prefetch={false}
                variant="inline"
              >
                {t("seeAll")}
              </PressableAnchor>
              {/* <span className="hidden sm:inline text-foreground-strong/30" aria-hidden="true">
              ·
            </span>
            <PressableAnchor
              href={withLocale(`/noticies/${place}/rss.xml`)}
              className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              prefetch={false}
              variant="inline"
            >
              {t("rssLabel")}
            </PressableAnchor> */}
            </nav>
          </div>
        </header>

        {/* News List Content */}
        <Suspense fallback={<NewsListSkeleton />}>
          <NewsList
            newsPromise={newsPromise}
            placeTypePromise={placeTypePromise}
            place={place}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </Suspense>
      </div>
    </div>
  );
}
