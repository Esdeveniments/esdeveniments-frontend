import type { Metadata } from "next";

import CardServer from "@components/ui/card/CardServer";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";
import HeadingLayout from "@components/ui/hybridEventsList/HeadingLayout";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchEventBySlugWithStatus } from "@lib/api/events";
import { listFavoriteEventsExternal } from "@lib/api/favorites-external";
import { captureException } from "@sentry/nextjs";
import { filterActiveEvents, isEventActive } from "@utils/event-helpers";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { MAX_FAVORITES } from "@utils/constants";
import { getFavoritesFromCookies } from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { getTranslations } from "next-intl/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import FavoritesAutoPrune from "./FavoritesAutoPrune";
import FavoritesPageTracker from "./FavoritesPageTracker";

const FETCH_CONCURRENCY = 5;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
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
): Promise<{ events: EventSummaryResponseDTO[]; notFoundSlugs: string[] }> {
  const uniqueSlugs = Array.from(new Set(slugs)).slice(0, MAX_FAVORITES);
  const results: EventSummaryResponseDTO[] = [];
  const notFoundSlugs: string[] = [];

  const reasonToString = (reason: unknown): string => {
    if (reason instanceof Error) return reason.message;
    if (typeof reason === "string") return reason;

    try {
      return JSON.stringify(reason);
    } catch {
      return "unknown";
    }
  };

  for (let i = 0; i < uniqueSlugs.length; i += FETCH_CONCURRENCY) {
    const chunk = uniqueSlugs.slice(i, i + FETCH_CONCURRENCY);
    const fetched = await Promise.allSettled(
      chunk.map((slug) => fetchEventBySlugWithStatus(slug))
    );

    const failedFetches: Array<{ slug: string | undefined; reason: unknown }> =
      [];

    for (let j = 0; j < fetched.length; j++) {
      const slug = chunk[j];
      const settled = fetched[j];
      if (settled.status !== "fulfilled") {
        failedFetches.push({ slug, reason: settled.reason });
        continue;
      }

      const { event, notFound } = settled.value;

      if (notFound && slug) {
        notFoundSlugs.push(slug);
      }

      if (event != null) {
        results.push(event);
      }
    }

    if (failedFetches.length > 0) {
      captureException(new Error("Favorites: fetch failures"), {
        tags: {
          feature: "favorites",
          page: "/preferits",
          phase: "fetch_event_by_slug",
        },
        extra: {
          failedCount: failedFetches.length,
          failedSlugs: failedFetches.map((f) => f.slug).filter(Boolean),
          failedReasons: failedFetches.map((f) => reasonToString(f.reason)),
        },
      });
    }
  }

  return { events: results, notFoundSlugs };
}

function collectExpiredEventKeys<K>(
  events: EventSummaryResponseDTO[],
  keyOf: (event: EventSummaryResponseDTO) => K | null | undefined
): K[] {
  return events.flatMap((event) => {
    const key = keyOf(event);
    if (!key) return [];
    if (isEventActive(event)) return [];
    return [key];
  });
}

export default async function PreferitsPage() {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  const authToken = await getAccessTokenFromCookies();

  let events: EventSummaryResponseDTO[];
  let uniqueFavoritesCount: number;
  let slugsToRemove: string[];
  let eventIdsToRemove: string[];
  let backendUnavailable = false;

  if (authToken) {
    // Authed: backend is the source of truth. Returns fully populated event
    // summaries, so we skip the slug-by-slug round trip the cookie path uses.
    const page = await listFavoriteEventsExternal(authToken, 0, MAX_FAVORITES);
    if (page === null) {
      // Backend is unreachable; refuse to render an empty list (which would
      // make the user think they have no favorites). Show an error state.
      events = [];
      uniqueFavoritesCount = 0;
      backendUnavailable = true;
    } else {
      events = page.content ?? [];
      uniqueFavoritesCount =
        page.totalElements ??
        new Set(events.map((e) => e?.slug).filter(Boolean)).size;
    }
    // No cookie slugs to prune, but expired favorites still linger in the
    // backend store forever unless we tell it to remove them. Only page 0
    // is fetched (MAX_FAVORITES-sized), so an account that already holds
    // more than MAX_FAVORITES rows (pre-existing data from before the cap
    // was enforced) can still have expired favorites beyond this page that
    // never get pruned — accepted gap, not reachable going forward since
    // the 409 cap blocks new accounts from ever exceeding MAX_FAVORITES.
    slugsToRemove = [];
    eventIdsToRemove = collectExpiredEventKeys(events, (e) => e.id);
  } else {
    const cookieSlugs = [...(await getFavoritesFromCookies())].reverse();
    uniqueFavoritesCount = new Set(cookieSlugs).size;
    const fetched = await fetchFavoritesEvents(cookieSlugs);
    events = fetched.events;

    const expiredSlugs = collectExpiredEventKeys(events, (e) => e.slug);
    slugsToRemove = Array.from(
      new Set([...expiredSlugs, ...fetched.notFoundSlugs])
    );
    eventIdsToRemove = [];
  }

  const activeEvents = filterActiveEvents(events);
  const favoriteSlugs = events.map((e) => e?.slug).filter(Boolean) as string[];

  if (backendUnavailable) {
    return (
      <div
        className="container py-section-y flex-col justify-center items-center"
        data-testid="favorites-page-error"
      >
        <NoEventsFound
          title={t("errorTitle")}
          description={t("errorDescription")}
        />
      </div>
    );
  }

  if (favoriteSlugs.length === 0 || activeEvents.length === 0) {
    return (
      <div className="container py-section-y flex-col justify-center items-center" data-testid="favorites-page-empty">
        <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={eventIdsToRemove} />
        <FavoritesPageTracker favoritesCount={uniqueFavoritesCount} activeCount={0} />
        <NoEventsFound title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="container py-section-y flex-col justify-center items-center" data-testid="favorites-page">
      <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={eventIdsToRemove} />
      <FavoritesPageTracker favoritesCount={uniqueFavoritesCount} activeCount={activeEvents.length} />
      <div className="w-full">
        <HeadingLayout
          title={t("heading")}
          subtitle={t("subtitle")}
          titleClass="heading-1"
          subtitleClass="body-large"
          cta={null}
        />
        <p className="body-small text-foreground/80 mb-element-gap">
          {t("countLabel", {
            count: uniqueFavoritesCount,
            max: MAX_FAVORITES,
          })}
        </p>
      </div>
      <List events={activeEvents}>
        {(event, index) => (
          <CardServer
            key={`${event.id}-${index}`}
            event={event}
            isPriority={index === 0}
            initialIsFavorite
          />
        )}
      </List>
    </div>
  );
}
