import type { Metadata } from "next";

import CardServer from "@components/ui/card/CardServer";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchEventBySlug } from "@lib/api/events";
import { filterActiveEvents, isEventActive } from "@utils/event-helpers";
import { getLocaleSafely } from "@utils/i18n-seo";
import { getFavoritesFromCookies, MAX_FAVORITES } from "@utils/favorites";
import { getTranslations } from "next-intl/server";
import type { EventDetailResponseDTO, EventSummaryResponseDTO } from "types/api/event";
import FavoritesAutoPrune from "./FavoritesAutoPrune";

const FETCH_CONCURRENCY = 5;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  return {
    ...(buildPageMeta({
      title: t("title"),
      description: t("description"),
      canonical: `${siteUrl}/preferits`,
      locale,
    }) as Metadata),
    robots: "noindex, nofollow",
  };
}

async function fetchFavoritesEvents(
  slugs: string[]
): Promise<EventSummaryResponseDTO[]> {
  const uniqueSlugs = Array.from(new Set(slugs)).slice(0, MAX_FAVORITES);
  const results: EventSummaryResponseDTO[] = [];

  for (let i = 0; i < uniqueSlugs.length; i += FETCH_CONCURRENCY) {
    const chunk = uniqueSlugs.slice(i, i + FETCH_CONCURRENCY);
    const fetched = await Promise.all(chunk.map((slug) => fetchEventBySlug(slug)));
    results.push(
      ...fetched.filter(
        (event): event is EventDetailResponseDTO => event != null
      )
    );
  }

  return results;
}

export default async function FavoritsPage() {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  const favoriteSlugs = await getFavoritesFromCookies();
  const events = await fetchFavoritesEvents(favoriteSlugs);
  const activeEvents = filterActiveEvents(events);

  const expiredSlugs = events.flatMap((event) => {
    if (!event.slug) return [];
    if (isEventActive(event)) return [];
    return [event.slug];
  });

  if (favoriteSlugs.length === 0 || activeEvents.length === 0) {
    return (
      <div className="container flex-col justify-center items-center pt-[6rem]">
        <FavoritesAutoPrune slugsToRemove={expiredSlugs} />
        <NoEventsFound title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="container flex-col justify-center items-center pt-[6rem]" data-testid="favorites-page">
      <FavoritesAutoPrune slugsToRemove={expiredSlugs} />
      <div className="w-full px-element-gap mb-6">
        <h1 className="heading-1">{t("heading")}</h1>
        <p className="body-large text-foreground/80">{t("subtitle")}</p>
      </div>
      <List events={activeEvents}>
        {(event, index) => <CardServer key={`${event.id}-${index}`} event={event} isPriority={index === 0} />}
      </List>
    </div>
  );
}
