// No headers/nonce needed with relaxed CSP
import JsonLdServer from "@components/partials/JsonLdServer";
import {
  generateJsonData,
  getFormattedDate,
  formatPlacePreposition,
} from "@utils/helpers";
import { getTranslations } from "next-intl/server";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { getPlaceBySlug } from "@lib/api/places";
import {
  getHistoricDates,
  normalizeMonthParam,
  resolveMonthIndexFromSlug,
} from "@lib/dates";
import dynamic from "next/dynamic";
import { isValidPlace } from "@utils/route-validation";
import { notFound, permanentRedirect } from "next/navigation";
import type { MonthStaticPathParams } from "types/common";
import type { EventSummaryResponseDTO } from "types/api/event";
import {
  buildPageMeta,
  generateCollectionPageSchema,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import {
  toLocalizedUrl,
  withLocalePath,
} from "@utils/i18n-seo";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import {
  MONTHS_URL as DEFAULT_MONTHS_URL,
  MIN_VALID_YEAR,
  MAX_VALID_YEAR,
} from "@utils/constants";
import { connection } from "next/server";
import { cache } from "react";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound")
);

// React cache() keys on argument identity. generateMetadata and Page each
// create their own {place, from, to, size} object literal, so wrapping
// fetchEvents directly would NOT dedupe. This primitive-keyed wrapper solves
// it: identical (place, from, to) tuples produce a single cache entry.
const MAX_EVENTS_PER_PAGE = 100;
const fetchMonthEvents = cache(
  async (place: string, from: string, to: string) =>
    fetchEvents({ place, from, to, size: MAX_EVENTS_PER_PAGE })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Pages.SitemapMonth" });
  const tConstants = await getTranslations({
    locale,
    namespace: "Components.Constants",
  });
  const tNotFound = await getTranslations({ locale, namespace: "App.NotFound" });
  const { town, year, month } = await params;

  // Validate required params
  if (!town || !year || !month || !isValidPlace(town)) {
    return {
      title: tNotFound("title"),
      description: tNotFound("description"),
    };
  }

  // Validate year is numeric and reasonable
  const yearNum = Number(year);
  if (!Number.isFinite(yearNum) || yearNum < MIN_VALID_YEAR || yearNum > MAX_VALID_YEAR) {
    return {
      title: tNotFound("title"),
      description: tNotFound("description"),
    };
  }

  const monthLabels = (tConstants.raw("months") as string[]) || [];
  const monthIndex = resolveMonthIndexFromSlug(month);
  if (monthIndex === null) {
    return {
      title: tNotFound("title"),
      description: tNotFound("description"),
    };
  }
  const canonicalMonthSlug = DEFAULT_MONTHS_URL[monthIndex];
  const monthLabel =
    monthLabels[monthIndex] || normalizeMonthParam(canonicalMonthSlug).label;
  // Tolerate backend 5xx for place lookup (cosmetic; town slug is an acceptable
  // fallback). Prevents archive 500s from intermittent backend errors — the
  // main 5xx source per GSC on /sitemap/<town>/<year>/<month>.
  const place = await getPlaceBySlug(town).catch(() => null);
  const townLabel = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatPlacePreposition(
    townLabel,
    placeType,
    locale,
    false
  );

  // Probe events to set robots policy: noindex empty months so GSC stops
  // flagging them as soft 404 / "Crawled - currently not indexed". Uses the
  // primitive-keyed fetchMonthEvents wrapper so Page reuses the same response.
  const { from, until } = getHistoricDates(
    canonicalMonthSlug,
    Number(year),
    DEFAULT_MONTHS_URL
  );
  const fromStr = from.toISOString().split("T")[0];
  const toStr = until.toISOString().split("T")[0];
  const events = await fetchMonthEvents(town, fromStr, toStr);
  const realEventCount = Array.isArray(events.content)
    ? (events.content as EventSummaryResponseDTO[]).filter((e) => !e.isAd)
      .length
    : 0;
  const robotsOverride = realEventCount === 0 ? "noindex, follow" : undefined;

  return buildPageMeta({
    title: t("metaTitle", { town: townLabel, month: monthLabel, year }),
    description: t("metaDescription", {
      locationPhrase,
      month: monthLabel,
      year,
      town: townLabel,
    }),
    canonical: `${siteUrl}/sitemap/${town}/${year}/${canonicalMonthSlug}`,
    locale,
    robotsOverride,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  // Opt out of cacheComponents caching — conditional JsonLdServer rendering
  // below depends on event count (jsonData.length, eventsItemList). Without this,
  // cached tree shape can differ from replay → "Expected Fragment but got script".
  await connection();

  const { town, year, month } = await params;
  const locale: AppLocale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "Pages.SitemapMonth" });
  const tConstants = await getTranslations({
    locale,
    namespace: "Components.Constants",
  });
  const withLocale = (path: string) => withLocalePath(path, locale);

  // Validate required params
  if (!town || !year || !month || !isValidPlace(town)) {
    notFound();
  }

  // Validate year is numeric and reasonable
  const yearNum = Number(year);
  if (!Number.isFinite(yearNum) || yearNum < MIN_VALID_YEAR || yearNum > MAX_VALID_YEAR) {
    notFound();
  }

  const monthLabels = (tConstants.raw("months") as string[]) || [];
  const monthIndex = resolveMonthIndexFromSlug(month);
  if (monthIndex === null) {
    notFound();
  }
  const canonicalMonthSlug = DEFAULT_MONTHS_URL[monthIndex];
  const normalizedIncomingSlug = normalizeMonthParam(month).slug;
  if (normalizedIncomingSlug !== canonicalMonthSlug) {
    permanentRedirect(withLocale(`/sitemap/${town}/${year}/${canonicalMonthSlug}`));
  }
  const monthLabel =
    monthLabels[monthIndex] || normalizeMonthParam(canonicalMonthSlug).label;

  const { from, until } = getHistoricDates(
    canonicalMonthSlug,
    Number(year),
    DEFAULT_MONTHS_URL
  );

  // Limit JSON-LD to top 50 events to reduce payload size while maintaining SEO value
  const MAX_EVENTS_FOR_JSON_LD = 50;

  const fromStr = from.toISOString().split("T")[0];
  const toStr = until.toISOString().split("T")[0];
  const [events, place] = await Promise.all([
    fetchMonthEvents(town, fromStr, toStr),
    getPlaceBySlug(town).catch(() => null),
  ]);
  const townLabel = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatPlacePreposition(
    townLabel,
    placeType,
    locale,
    false
  );

  const filteredEvents = Array.isArray(events.content)
    ? (events.content as EventSummaryResponseDTO[]).filter(
      (event) => !event.isAd
    )
    : [];

  // Limit JSON-LD to first N events to reduce payload size
  // This still provides good SEO value while keeping response sizes manageable
  const eventsForJsonLd = filteredEvents.slice(0, MAX_EVENTS_FOR_JSON_LD);

  // Generate event JSON-LD data (limited to avoid payload overflow)
  const jsonData = eventsForJsonLd
    ? eventsForJsonLd
      .map((event) => generateJsonData(event, locale))
      .filter((data) => data !== null)
    : [];

  // Generate structured data for the month archive
  const breadcrumbs = [
    { name: t("breadcrumbs.home"), url: toLocalizedUrl("/", locale) },
    { name: t("breadcrumbs.archive"), url: toLocalizedUrl("/sitemap", locale) },
    { name: townLabel, url: toLocalizedUrl(`/sitemap/${town}`, locale) },
    {
      name: `${monthLabel} ${year}`,
      url: toLocalizedUrl(`/sitemap/${town}/${year}/${canonicalMonthSlug}`, locale),
    },
  ];

  // Generate ItemList for events if available (limited to reduce payload)
  const eventsItemList =
    eventsForJsonLd.length > 0
      ? generateItemListStructuredData(
        eventsForJsonLd,
        t("itemListTitle", { town: townLabel, month: monthLabel, year }),
        t("itemListDescription", { town: townLabel, month: monthLabel, year }),
        locale,
        toLocalizedUrl(`/sitemap/${town}/${year}/${canonicalMonthSlug}`, locale)
      )
      : null;

  // Generate collection page schema
  const collectionPageSchema = generateCollectionPageSchema({
    title: t("collectionTitle", { town: townLabel, month: monthLabel, year }),
    description: t("collectionDescription", {
      locationPhrase,
      month: monthLabel,
      year,
    }),
    url: toLocalizedUrl(`/sitemap/${town}/${year}/${canonicalMonthSlug}`, locale),
    breadcrumbs,
    locale,
    numberOfItems: filteredEvents.length,
    mainEntity: eventsItemList || {
      "@type": "Thing",
      name: t("itemListTitle", { town: townLabel, month: monthLabel, year }),
      description: t("collectionFallbackDescription"),
    },
  });

  return (
    <>
      {/* Individual Events JSON-LD - kept for backward compatibility */}
      {jsonData.length > 0 && (
        <JsonLdServer id={`${town}-${month}-${year}-events`} data={jsonData} />
      )}

      {/* Enhanced Collection Page Schema */}
      <JsonLdServer
        id={`${town}-${month}-${year}-collection`}
        data={collectionPageSchema}
      />

      {/* Enhanced Events ItemList Schema */}
      {eventsItemList && (
        <JsonLdServer
          id={`${town}-${month}-${year}-itemlist`}
          data={eventsItemList}
        />
      )}

      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />

        <header className="text-center">
          <h1 className="heading-2 mb-2">
            {t("headerTitle", { town: townLabel, month: monthLabel, year })}
          </h1>
          <p className="body-normal text-foreground/80">
            {filteredEvents.length > 0
              ? t("headerCount", { count: filteredEvents.length })
              : t("headerEmpty")}
          </p>
        </header>

        <section className="w-full">
          {filteredEvents.length > 0 ? (
            <div className="stack gap-4">
              <h2 className="sr-only">{t("srList")}</h2>
              {filteredEvents.map((event: EventSummaryResponseDTO) => {
                const { formattedStart, formattedEnd } = getFormattedDate(
                  event.startDate,
                  event.endDate
                );
                return (
                  <article
                    key={event.id}
                    className="border-b border-border/30 pb-4 w-full"
                  >
                    <PressableAnchor
                      href={withLocale(`/e/${event.slug}`)}
                      className="hover:text-primary block group"
                      variant="inline"
                      prefetch={false}
                    >
                      <h3 className="heading-4 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 body-small text-foreground/80 mt-1">
                        <time dateTime={event.startDate}>
                          {formattedEnd
                            ? `${formattedStart} - ${formattedEnd}`
                            : `${formattedStart}`}
                        </time>
                        {event.location && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>{event.location}</span>
                          </>
                        )}
                        {event.categories && event.categories.length > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-primary">
                              {event.categories[0].name}
                            </span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="body-small text-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </PressableAnchor>
                  </article>
                );
              })}
            </div>
          ) : (
            <NoEventsFound />
          )}
        </section>

        {filteredEvents.length > 0 && (
          <footer className="pt-8 border-t border-border text-center">
            <p className="body-small text-foreground/80 mb-4">
              {t("footerExplore", { town: townLabel })}
            </p>
            <div className="flex-center gap-4">
              <PressableAnchor
                href={withLocale(`/sitemap/${town}`)}
                className="text-primary hover:text-primary-dark body-small transition-colors"
                variant="inline"
                prefetch={false}
              >
                {t("footerViewArchives")}
              </PressableAnchor>
              <PressableAnchor
                href={withLocale(`/${town}`)}
                className="text-primary hover:text-primary-dark body-small transition-colors"
                variant="inline"
                prefetch={false}
              >
                {t("footerCurrentEvents")}
              </PressableAnchor>
            </div>
          </footer>
        )}
      </SitemapLayout>
    </>
  );
}
