import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import { NEWS_HUBS } from "@utils/constants";
import { siteUrl } from "@config/index";
import {
  generateWebPageSchema,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsHubsGrid from "@components/noticies/NewsHubsGrid";
import NewsGridSkeleton from "@components/noticies/NewsGridSkeleton";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App.News");
  const locale = resolveLocaleFromHeaders(await headers());
  return buildPageMeta({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonical: `${siteUrl}/noticies`,
    locale,
  }) as unknown as Metadata;
}

export default async function Page() {
  const t = await getTranslations("App.News");
  const headersList = await headers();
  const locale = (resolveLocaleFromHeaders(headersList) ||
    DEFAULT_LOCALE) as AppLocale;
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix || "/";
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocale(path)}`;
  // Start fetching, don't wait
  const hubResultsPromise = Promise.all(
    NEWS_HUBS.map(async (hub) => {
      const res = await fetchNews({ page: 0, size: 1, place: hub.slug });
      return { hub, items: res.content };
    })
  );

  const breadcrumbs = [
    { name: t("breadcrumbHome"), url: absolute("/") },
    { name: t("breadcrumbCurrent"), url: absolute("/noticies") },
  ];
  const webPageSchema = generateWebPageSchema({
    title: t("heading"),
    description: t("metaDescription"),
    url: absolute("/noticies"),
    breadcrumbs,
  });
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  return (
    <div className="container flex-col justify-center items-center mt-8">
      <JsonLdServer id="news-list-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-list-breadcrumbs" data={breadcrumbListSchema} />
      )}

      <h1 className="uppercase mb-2 px-2 lg:px-0">{t("heading")}</h1>
      <p className="text-[16px] font-normal text-foreground-strong text-left mb-8 px-2 font-barlow">
        {t("intro")}
      </p>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-4 text-sm">
        <PressableAnchor
          href={withLocale(`/noticies/rss.xml`)}
          className="text-primary underline text-sm"
          prefetch={false}
          variant="inline"
        >
          RSS
        </PressableAnchor>
      </div>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 px-2 lg:px-0 text-sm text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <PressableAnchor
              href={withLocale("/")}
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              {t("breadcrumbHome")}
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-foreground-strong">{t("breadcrumbCurrent")}</li>
        </ol>
      </nav>

      <Suspense fallback={<NewsGridSkeleton />}>
        <NewsHubsGrid promise={hubResultsPromise} />
      </Suspense>
    </div>
  );
}
