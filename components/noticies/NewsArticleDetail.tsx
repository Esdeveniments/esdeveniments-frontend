import { stripHtmlTags } from "@utils/sanitize";
import type {
  NewsArticleDetailProps,
} from "types/props";
import { siteUrl } from "@config/index";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import ViewCounter from "@components/ui/viewCounter";
import AdArticle from "@components/ui/adArticle";
import NewsEventsSection from "@components/noticies/NewsEventsSection";
import NewsCard from "@components/ui/newsCard";
import NewsShareButtons from "@components/noticies/NewsShareButtons";
import NewsBreadcrumb from "@components/noticies/NewsBreadcrumb";
import { getFormattedDate } from "@utils/date-helpers";
import JsonLdServer from "@components/partials/JsonLdServer";
import { notFound } from "next/navigation";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import {
  localeToHrefLang,
} from "types/i18n";
import Image from "@components/ui/common/image";

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
  const absolute = (path: string) =>
    path.startsWith("http")
      ? path
      : `${siteUrl}${withLocalePath(path, locale)}`;

  // Hero image from first event (if available)
  const heroImageUrl = detail.events?.[0]?.imageUrl;
  const heroCacheKey = detail.events?.[0]?.hash;

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
      <NewsBreadcrumb
        items={[
          { label: t("breadcrumbHome"), href: withLocalePath("/", locale) },
          {
            label: t("breadcrumbNews"),
            href: withLocalePath("/noticies", locale),
          },
          {
            label: placeType.label,
            href: withLocalePath(`/noticies/${place}`, locale),
          },
          { label: detail.title },
        ]}
      />

      {/* Hero Image */}
      {heroImageUrl && (
        <div className="mb-6 w-full px-2 lg:px-0">
          <div className="rounded-card overflow-hidden aspect-[16/9] bg-muted">
            <Image
              className="w-full h-full object-cover"
              title={detail.title}
              image={heroImageUrl}
              alt={detail.title}
              priority
              context="hero"
              cacheKey={heroCacheKey}
            />
          </div>
        </div>
      )}

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
              <ViewCounter visits={detail.visits} hideText={false} visitsLabel={t("visitsCount", { count: detail.visits })} />
            </div>
          </div>
          {plainDescription && (
            <p className="body-large text-foreground-strong/80">
              {plainDescription}
            </p>
          )}
        </div>

        <NewsShareButtons place={place} slug={article} label={t("shareArticle")} />

        <div className="my-2">
          <AdArticle slot="news_in_article" isDisplay={false} />
        </div>

        {detail.events && detail.events.length > 0 && (
          <NewsEventsSection
            title={t("mustSee")}
            events={detail.events.slice(0, Math.min(detail.events.length, 3))}
            showNumbered={true}
          />
        )}

        {detail.events && detail.events.length > 3 && (
          <NewsEventsSection
            title={t("moreProposals")}
            events={detail.events.slice(3)}
          />
        )}

        {/* Related Articles */}
        {detail.relatedNews && detail.relatedNews.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="heading-2 mb-6">{t("relatedArticles")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-element-gap">
              {detail.relatedNews.slice(0, 4).map((item) => (
                <NewsCard
                  key={item.id}
                  event={item}
                  placeSlug={item.city?.slug || item.region?.slug || place}
                  placeLabel={
                    item.city?.name || item.region?.name || placeType.label
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
