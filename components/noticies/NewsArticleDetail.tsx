import DOMPurify from "isomorphic-dompurify";
import type {
  NewsEventsSectionProps,
  NewsArticleDetailProps,
} from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import ViewCounter from "@components/ui/viewCounter";
import AdArticle from "@components/ui/adArticle";
import NewsHeroEvent from "@components/ui/newsHeroEvent";
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

  const plainDescription = DOMPurify.sanitize(detail.description || "", {
    ALLOWED_TAGS: [],
  });
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
    <div className="w-full min-h-screen bg-background mt-4">
      {/* Breadcrumbs */}
      <div className="w-full bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav
            className="text-sm text-foreground-strong/70"
            aria-label="Breadcrumb"
          >
            <PressableAnchor
              href={withLocalePath("/")}
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              {t("breadcrumbHome")}
            </PressableAnchor>{" "}
            /{" "}
            <PressableAnchor
              href={withLocalePath("/noticies")}
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              {t("breadcrumbNews")}
            </PressableAnchor>{" "}
            /{" "}
            <PressableAnchor
              href={withLocalePath(`/noticies/${place}`)}
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              {placeType.label}
            </PressableAnchor>{" "}
            /{" "}
            <span className="text-foreground-strong font-medium">
              {detail.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="heading-1 mb-6">{detail.title}</h1>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 text-sm text-foreground-strong/70">
            <div className="flex items-center gap-4">
              <span className="bg-primary text-background px-4 py-2 rounded-full font-medium uppercase whitespace-nowrap">
                {detail.type === "WEEKEND"
                  ? t("sectionWeekend")
                  : t("sectionWeek")}{" "}
                {dateRangeText}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span>{t("readingTime", { minutes: detail.readingTime })}</span>
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
            showHero={true}
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

      <JsonLdServer id="news-article-schema" data={articleSchema} />
      <JsonLdServer id="news-webpage-breadcrumbs" data={webPageSchema} />
    </div>
  );
}

function EventsSection({
  title,
  events,
  showHero = false,
  showNumbered = false,
}: NewsEventsSectionProps) {
  const [heroEvent, ...otherEvents] = events;

  return (
    <section className="mb-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground-strong mb-3 md:text-4xl">
          {title}
        </h2>
        <div className="w-20 h-1.5 bg-primary rounded-full"></div>
      </div>

      {showHero && heroEvent && (
        <div className="mb-12">
          <NewsHeroEvent event={heroEvent} />
        </div>
      )}

      {showNumbered ? (
        <div className="space-y-8">
          {(showHero ? otherEvents : events).map((event, index) => (
            <div key={event.id} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                {showHero ? index + 2 : index + 1}
              </div>
              <div className="flex-1">
                <NewsRichCard event={event} variant="horizontal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {(showHero ? otherEvents : events).map((event) => (
            <NewsRichCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
