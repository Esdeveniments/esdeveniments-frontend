import { stripHtmlTags } from "@utils/sanitize";
import type {
  NewsArticleDetailProps,
} from "types/props";
import { generateWebPageSchema } from "@components/partials/seo-meta";
import AdArticle from "@components/ui/adArticle";
import NewsEventsSection from "@components/noticies/NewsEventsSection";
import SectionHeading from "@components/ui/common/SectionHeading";
import List from "@components/ui/list";
import CategoryBadge from "@components/ui/common/cardContent/CategoryBadge";
import NewsCard from "@components/ui/newsCard";
import NewsShareButtons from "@components/noticies/NewsShareButtons";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import PwaBackButton from "@components/ui/common/PwaBackButton";
import { getFormattedDate } from "@utils/date-helpers";
import JsonLdServer from "@components/partials/JsonLdServer";
import { notFound } from "next/navigation";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { captureException } from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { resolveNewsItemPlace } from "@utils/news-helpers";
import {
  buildNewsArticleSchema,
  buildNewsEventsItemListSchema,
} from "@components/noticies/newsArticleSchema";


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
  const t = await getTranslations({ locale, namespace: "App.NewsArticleDetail" });

  const plainDescription = stripHtmlTags(detail.description || "");
  const dateRangeText = (() => {
    const f = getFormattedDate(detail.startDate, detail.endDate, locale);
    return f.formattedEnd
      ? `${f.formattedStart} – ${f.formattedEnd}`
      : f.formattedStart;
  })();
  const absolute = (path: string) =>
    path.startsWith("http") ? path : toLocalizedUrl(path, locale);

  const articleSchema = buildNewsArticleSchema({
    detail,
    placeLabel: placeType.label,
    url: absolute(`/noticies/${place}/${article}`),
    locale,
  });

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

  const events = detail.events ?? [];
  const eventsListSchema = buildNewsEventsItemListSchema({
    events,
    name: detail.title,
    url: absolute(`/noticies/${place}/${article}`),
    locale,
  });
  const relatedNews = (detail.relatedNews ?? []).slice(0, 3);

  return (
    <div className="w-full bg-background pb-section-y">
      <div className="container-article flex flex-col gap-section-y min-w-0">
        <JsonLdServer id="news-article-schema" data={articleSchema} />
        <JsonLdServer id="news-webpage-breadcrumbs" data={webPageSchema} />
        {eventsListSchema && (
          <JsonLdServer id="news-events-item-list" data={eventsListSchema} />
        )}

        <article className="w-full flex flex-col gap-section-y">
          {/* PWA back button — only renders in installed standalone mode */}
          <PwaBackButton fallbackHref="/noticies" />
          <Breadcrumbs
            items={[
              { label: t("breadcrumbHome"), href: "/" },
              { label: t("breadcrumbNews"), href: "/noticies" },
              { label: placeType.label, href: `/noticies/${place}` },
              { label: detail.title },
            ]}
            className="pt-4"
          />

          <header className="stack">
            <CategoryBadge
              label={detail.type === "WEEKEND" ? t("sectionWeekend") : t("sectionWeek")}
            />
            <h1 className="heading-1 text-balance break-words">{detail.title}</h1>
            <p className="body-small text-muted-foreground">
              {events.length > 0
                ? `${dateRangeText} · ${t("eventsCount", { count: events.length })}`
                : dateRangeText}
            </p>
            {plainDescription && <p className="body-large">{plainDescription}</p>}
            <NewsShareButtons place={place} slug={article} label={t("shareArticle")} />
          </header>

          <AdArticle slot="news_in_article" isDisplay={false} />

          {events.length > 0 && (
            <div
              className="flex flex-col gap-section-y"
              data-analytics-container="true"
              data-analytics-context="news_article"
            >
              <NewsEventsSection title={t("mustSee")} events={events.slice(0, 3)} />
              {events.length > 3 && (
                <NewsEventsSection
                  title={t("moreProposals")}
                  events={events.slice(3)}
                  startPosition={4}
                />
              )}
            </div>
          )}

          {relatedNews.length > 0 && (
            <section className="stack">
              <SectionHeading title={t("relatedArticles")} titleClassName="heading-2 text-foreground-strong" />
              <List events={relatedNews}>
                {(item) => {
                  const itemPlace = resolveNewsItemPlace(item, place, placeType.label);
                  return (
                    <NewsCard
                      key={item.id}
                      event={item}
                      placeSlug={itemPlace.slug}
                      placeLabel={itemPlace.label}
                    />
                  );
                }}
              </List>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
