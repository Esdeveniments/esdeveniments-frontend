import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import {
  buildPageMeta,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsList from "@components/noticies/NewsList";
import NewsListSkeleton from "@components/noticies/NewsListSkeleton";
export const revalidate = 600;

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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ place: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place } = await params;
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.NewsPlace" });
  const withLocale = (path: string) => withLocalePath(path, locale);
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
    <div className="container flex-col justify-center items-center mt-8 pb-section-y-lg">
      {/* Head links for prev/next are removed as they require data. 
          If critical, they should be in generateMetadata or we accept they load later? 
          Actually we can't inject into head from here easily if streaming. */}

      <JsonLdServer id="news-place-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-place-breadcrumbs" data={breadcrumbListSchema} />
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
          <li>
            <PressableAnchor
              href={withLocale("/noticies")}
              className="hover:underline hover:text-primary transition-colors"
              variant="inline"
              prefetch={false}
            >
              {t("breadcrumbNews")}
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1" aria-hidden="true">/</span>
          </li>
          <li className="text-foreground-strong font-medium" aria-current="page">
            {placeLabel}
          </li>
        </ol>
      </nav>

      {/* Page Header Section */}
      <header className="w-full px-2 lg:px-0 mb-section-y-sm">
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
            <span className="hidden sm:inline text-foreground-strong/30" aria-hidden="true">
              ·
            </span>
            <PressableAnchor
              href={withLocale(`/noticies/${place}/rss.xml`)}
              className="body-small text-primary hover:underline hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              prefetch={false}
              variant="inline"
            >
              {t("rssLabel")}
            </PressableAnchor>
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
  );
}
