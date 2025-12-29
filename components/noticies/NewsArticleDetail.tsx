import { stripHtmlTags } from "@utils/sanitize";
import type {
  NewsEventsSectionProps,
  NewsArticleDetailProps,
} from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import ViewCounter from "@components/ui/viewCounter";
import AdArticle from "@components/ui/adArticle";
import NewsRichCard from "@components/ui/newsRichCard";
import { getFormattedDate } from "@utils/date-helpers";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { notFound } from "next/navigation";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import {
  DEFAULT_LOCALE,
  localeToHrefLang,
} from "types/i18n";

export default async function NewsArticleDetail({
  detailPromise,
  placeTypePromise,
  place,
  article,
}: NewsArticleDetailProps) {
  const [detailResult, placeTypeResult] = await Promise.allSettled([
    detailPromise,
    placeTypePromise,
  ]);

  const detail =
    detailResult.status === "fulfilled" ? detailResult.value : null;
  if (detailResult.status === "rejected") {
    console.error(
      "NewsArticleDetail: Error fetching article detail",
      detailResult.reason
    );
    captureException(detailResult.reason);
  }

  let placeType =
    placeTypeResult.status === "fulfilled" ? placeTypeResult.value : null;
  if (placeTypeResult.status === "rejected") {
    console.error(
      "NewsArticleDetail: Error fetching place label",
      placeTypeResult.reason
    );
    captureException(placeTypeResult.reason);
  }

  if (!placeType) {
    try {
      placeType = await getPlaceTypeAndLabelCached(place);
    } catch (error) {
      console.error(
        "NewsArticleDetail: Unable to resolve place label fallback",
        error
      );
      captureException(error);
      placeType = { label: place, type: "" };
    }
  }

  if (!detail) {
    return notFound();
  }

  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "App.NewsArticleDetail",
  });

  const plainDescription = stripHtmlTags(detail.description || "");
  const dateRangeText = (() => {
    const f = getFormattedDate(detail.startDate, detail.endDate, locale);
    return f.formattedEnd
      ? `${f.formattedStart} – ${f.formattedEnd}`
      : f.formattedStart;
  })();
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocalePath = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!localePrefix) return path;
    if (path === "/") return localePrefix || "/";
    if (path.startsWith(localePrefix)) return path;
    return `${localePrefix}${path}`;
  };
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${withLocalePath(path)}`;

  // Build keywords from available data (categories and locations)
  const categoryKeywords = Array.from(
    new Set(
      (detail.events || [])
        .flatMap((e) => e.categories?.map((c) => c.name) || [])
        .filter(Boolean)
    )
  ).slice(0, 10);
  const locationKeywords = Array.from(
    new Set((detail.events || []).map((e) => e.location).filter(Boolean))
  ).slice(0, 5);
  const keywords = [
    ...categoryKeywords,
    ...locationKeywords,
    placeType.label,
  ].filter(Boolean);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: detail.title,
    description: detail.description,
    datePublished: detail.createdAt,
    dateModified: detail.createdAt,
    image: detail.events?.[0]?.imageUrl,
    inLanguage: localeToHrefLang[locale] ?? locale,
    isAccessibleForFree: true,
    articleSection: detail.type,
    ...(keywords.length > 0 ? { keywords } : {}),
    publisher: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    author: {
      "@type": "Organization",
      name: "Esdeveniments.cat",
      url: siteUrl,
      logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
    },
    url: absolute(`/noticies/${place}/${article}`),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absolute(`/noticies/${place}/${article}`),
    },
  };

  const breadcrumbs = [
    { name: t("breadcrumbHome"), url: absolute("/") },
    { name: t("breadcrumbNews"), url: absolute("/noticies") },
    { name: placeType.label, url: absolute(`/noticies/${place}`) },
    { name: detail.title, url: absolute(`/noticies/${place}/${article}`) },
  ];
  const webPageSchema = generateWebPageSchema({
    title: detail.title,
    description: detail.description,
    url: absolute(`/noticies/${place}/${article}`),
    breadcrumbs,
    locale,
  });

  return (
    <div className="container flex-col justify-center items-center mt-8 pb-section-y-lg">
      <JsonLdServer id="news-article-schema" data={articleSchema} />
      <JsonLdServer id="news-webpage-breadcrumbs" data={webPageSchema} />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 w-full px-2 lg:px-0 body-small text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2 flex-wrap">
          <li>
            <PressableAnchor
              href={withLocalePath("/")}
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
              href={withLocalePath("/noticies")}
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
          <li>
            <PressableAnchor
              href={withLocalePath(`/noticies/${place}`)}
              className="hover:underline hover:text-primary transition-colors"
              variant="inline"
              prefetch={false}
            >
              {placeType.label}
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1" aria-hidden="true">/</span>
          </li>
          <li className="text-foreground-strong font-medium truncate max-w-[200px] sm:max-w-none" aria-current="page">
            {detail.title}
          </li>
        </ol>
      </nav>

      {/* Main Content */}
      <div className="w-full px-2 lg:px-0">
        <div className="mb-6">
          <h1 className="heading-1 mb-6 text-balance break-words">{detail.title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 text-sm text-foreground-strong/70">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <span className="bg-primary text-background px-3 sm:px-4 py-2 rounded-full font-medium uppercase text-xs sm:text-sm break-words">
                {detail.type === "WEEKEND"
                  ? t("sectionWeekend")
                  : t("sectionWeek")}{" "}
                {dateRangeText}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="whitespace-nowrap">{t("readingTime", { minutes: detail.readingTime })}</span>
              <ViewCounter visits={detail.visits} hideText={false} />
            </div>
          </div>
          {plainDescription && (
            <p className="body-large text-foreground-strong/80">
              {plainDescription}
            </p>
          )}
        </div>

        <div className="my-2">
          <AdArticle slot="news_in_article" isDisplay={false} />
        </div>

        {detail.events && detail.events.length > 0 && (
          <EventsSection
            title={t("mustSee")}
            events={detail.events.slice(0, Math.min(detail.events.length, 3))}
            showNumbered={true}
          />
        )}

        {detail.events && detail.events.length > 3 && (
          <EventsSection
            title={t("moreProposals")}
            events={detail.events.slice(3)}
          />
        )}
      </div>
    </div>
  );
}

function EventsSection({
  title,
  events,
  showNumbered = false,
}: NewsEventsSectionProps) {
  return (
    <section className="mb-12 sm:mb-16">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground-strong mb-3">
          {title}
        </h2>
        <div className="w-20 h-1.5 bg-primary rounded-full"></div>
      </div>

      {showNumbered ? (
        <div className="space-y-6 sm:space-y-8">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <NewsRichCard event={event} variant="horizontal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <NewsRichCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
