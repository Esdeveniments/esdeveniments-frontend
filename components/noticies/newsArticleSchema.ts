import { siteUrl } from "@config/index";
import type { NewsDetailResponseDTO } from "types/api/news";
import type { EventSummaryResponseDTO } from "types/api/event";
import { localeToHrefLang, type AppLocale } from "types/i18n";
import { buildEventListItems } from "@utils/schema-helpers";

const ORGANIZATION = {
  "@type": "Organization",
  name: "Esdeveniments.cat",
  url: siteUrl,
  logo: `${siteUrl}/static/images/logo-seo-meta.webp`,
};

/** NewsArticle JSON-LD; keywords come from the events' categories and venues. */
export function buildNewsArticleSchema({
  detail,
  placeLabel,
  url,
  locale,
}: {
  detail: NewsDetailResponseDTO;
  placeLabel: string;
  url: string;
  locale: AppLocale;
}) {
  const events = detail.events || [];
  const categoryKeywords = Array.from(
    new Set(
      events.flatMap((e) => e.categories?.map((c) => c.name) || []).filter(Boolean),
    ),
  ).slice(0, 10);
  const locationKeywords = Array.from(
    new Set(events.map((e) => e.location).filter(Boolean)),
  ).slice(0, 5);
  const keywords = [...categoryKeywords, ...locationKeywords, placeLabel].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: detail.title,
    description: detail.description,
    datePublished: detail.createdAt,
    dateModified: detail.createdAt,
    image: events[0]?.imageUrl ?? undefined,
    inLanguage: localeToHrefLang[locale] ?? locale,
    isAccessibleForFree: true,
    articleSection: detail.type,
    ...(keywords.length > 0 ? { keywords } : {}),
    publisher: ORGANIZATION,
    author: ORGANIZATION,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

/**
 * ItemList of the article's events, in the order shown (links to `/e/<slug>`).
 * No `Event` markup: each event page carries its own.
 */
export function buildNewsEventsItemListSchema({
  events,
  name,
  url,
  locale,
}: {
  events: Pick<EventSummaryResponseDTO, "slug" | "title">[];
  name: string;
  url: string;
  locale: AppLocale;
}) {
  const listed = events.filter((event) => event.slug);
  if (listed.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#events`,
    name,
    numberOfItems: listed.length,
    itemListElement: buildEventListItems(listed, locale),
  };
}
