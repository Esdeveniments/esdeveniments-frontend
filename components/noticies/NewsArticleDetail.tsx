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
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import { getFormattedDate } from "@utils/date-helpers";
import JsonLdServer from "@components/partials/JsonLdServer";
import { notFound } from "next/navigation";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import {
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
  const absolute = (path: string) =>
    path.startsWith("http") ? path : toLocalizedUrl(path, locale);

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
    <div className="w-full bg-background pb-10">
      <div className="container flex flex-col gap-section-y min-w-0">
        <JsonLdServer id="news-article-schema" data={articleSchema} />
        <JsonLdServer id="news-webpage-breadcrumbs" data={webPageSchema} />

        <article className="w-full flex flex-col gap-section-y">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: t("breadcrumbHome"), href: "/" },
              {
                label: t("breadcrumbNews"),
                href: "/noticies",
              },
              {
                label: placeType.label,
                href: `/noticies/${place}`,
              },
              { label: detail.title },
            ]}
            className="px-section-x pt-4"
          />

          {/* Article header */}
          <div className="w-full">
            <h1 className="heading-1 mb-6 text-balance break-words">{detail.title}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 text-sm text-foreground-strong/70">
              <span className="text-primary font-semibold uppercase text-xs tracking-wide">
                {detail.type === "WEEKEND"
                  ? t("sectionWeekend")
                  : t("sectionWeek")}{" "}
                · {dateRangeText}
              </span>
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

          {/* Content */}
          <div className="w-full">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-element-gap">
                  {detail.relatedNews.slice(0, 3).map((item) => {
                    const itemPlace = resolveNewsItemPlace(item, place, placeType.label);
                    return (
                      <NewsCard
                        key={item.id}
                        event={item}
                        placeSlug={itemPlace.slug}
                        placeLabel={itemPlace.label}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
