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
import { getHistoricDates, normalizeMonthParam } from "@lib/dates";
import dynamic from "next/dynamic";
import { isValidPlace } from "@utils/route-validation";
import { notFound } from "next/navigation";
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
  getLocaleSafely,
  toLocalizedUrl,
  withLocalePath,
} from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound")
);

export async function generateMetadata({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Pages.SitemapMonth" });
  const tConstants = await getTranslations({
    locale,
    namespace: "Components.Constants",
  });
  const tNotFound = await getTranslations({ locale, namespace: "App.NotFound" });
  const { town, year, month } = await params;
  if (!isValidPlace(town)) {
    return {
      title: tNotFound("title"),
      description: tNotFound("description"),
    };
  }

  const monthLabels = (tConstants.raw("months") as string[]) || [];
  const monthSlugs = (tConstants.raw("monthsUrl") as string[]) || [];
  const { slug: normalizedMonthSlug, label: fallbackMonthLabel } =
    normalizeMonthParam(month);
  const monthIndex = monthSlugs.findIndex(
    (slug) => normalizeMonthParam(slug).slug === normalizedMonthSlug
  );
  const monthSlug =
    monthSlugs[monthIndex] && monthIndex >= 0
      ? monthSlugs[monthIndex]
      : normalizedMonthSlug;
  const monthLabel =
    (monthLabels[monthIndex] && monthIndex >= 0
      ? monthLabels[monthIndex]
      : undefined) || fallbackMonthLabel;
  const place = await getPlaceBySlug(town);
  const townLabel = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatPlacePreposition(
    townLabel,
    placeType,
    locale,
    false
  );

  return buildPageMeta({
    title: t("metaTitle", { town: townLabel, month: monthLabel, year }),
    description: t("metaDescription", {
      locationPhrase,
      month: monthLabel,
      year,
      town: townLabel,
    }),
    canonical: `${siteUrl}/sitemap/${town}/${year}/${monthSlug}`,
    locale,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  const locale: AppLocale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Pages.SitemapMonth" });
  const tConstants = await getTranslations({
    locale,
    namespace: "Components.Constants",
  });
  const withLocale = (path: string) => withLocalePath(path, locale);

  if (!isValidPlace(town)) {
    notFound();
  }

  const monthLabels = (tConstants.raw("months") as string[]) || [];
  const monthSlugs = (tConstants.raw("monthsUrl") as string[]) || [];
  const { slug: normalizedMonthSlug, label: fallbackMonthLabel } =
    normalizeMonthParam(month);
  const monthIndex = monthSlugs.findIndex(
    (slug) => normalizeMonthParam(slug).slug === normalizedMonthSlug
  );
  const monthSlug =
    monthSlugs[monthIndex] && monthIndex >= 0
      ? monthSlugs[monthIndex]
      : normalizedMonthSlug;
  const monthLabel =
    (monthLabels[monthIndex] && monthIndex >= 0
      ? monthLabels[monthIndex]
      : undefined) || fallbackMonthLabel;

  const { from, until } = getHistoricDates(
    monthSlug,
    Number(year),
    monthSlugs.length > 0 ? monthSlugs : undefined
  );

  const [events, place] = await Promise.all([
    fetchEvents({
      place: town,
      from: from.toISOString().split("T")[0],
      to: until.toISOString().split("T")[0],
      size: 2500,
    }),
    getPlaceBySlug(town),
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

  // Generate event JSON-LD data
  const jsonData = filteredEvents
    ? filteredEvents
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
      url: toLocalizedUrl(`/sitemap/${town}/${year}/${monthSlug}`, locale),
    },
  ];

  // Generate ItemList for events if available
  const eventsItemList =
    filteredEvents.length > 0
      ? generateItemListStructuredData(
        filteredEvents,
        t("itemListTitle", { town: townLabel, month: monthLabel, year }),
        t("itemListDescription", { town: townLabel, month: monthLabel, year }),
        locale,
        toLocalizedUrl(`/sitemap/${town}/${year}/${monthSlug}`, locale)
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
    url: toLocalizedUrl(`/sitemap/${town}/${year}/${monthSlug}`, locale),
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
