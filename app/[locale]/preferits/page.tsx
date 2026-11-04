import type { Metadata } from "next";
import { Suspense } from "react";

import CardServer from "@components/ui/card/CardServer";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";
import Tabs from "@components/ui/common/tabs";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import FavoritesEventsSection from "@components/partials/FavoritesEventsSection";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchEventBySlugWithStatus } from "@lib/api/events";
import { getFavoritePeriodCounts } from "@lib/api/favorites-external";
import { captureException } from "@sentry/nextjs";
import { filterActiveEvents, isEventActive } from "@utils/event-helpers";
import { locale as rootLocale } from "next/root-params";
import type { AppLocale } from "types/i18n";
import { MAX_FAVORITES } from "@utils/constants";
import { getFavoritesFromCookies } from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { getTranslations } from "next-intl/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import type { ProfileTranslator } from "types/props";
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
  const [t, authToken] = await Promise.all([
    getTranslations({ locale, namespace: "App.Favorites" }),
    getAccessTokenFromCookies(),
  ]);

  // Authenticated: backend is the source of truth, scoped by period. No more
  // client-side expiry filtering/pruning needed — period=active already
  // excludes expired events server-side, so there's nothing to prune.
  if (authToken) {
    const { activeCount, pastCount } = await getFavoritePeriodCounts(authToken);
    const tabItems = buildFavoritesTabItems(
      {
        activeCount: activeCount ?? undefined,
        pastCount: pastCount ?? undefined,
      },
      t
    );

    return (
      <>
        <Tabs items={tabItems} active="upcoming" ariaLabel={t("heading")} />
        {activeCount !== null && pastCount !== null && (
          <FavoritesPageTracker
            favoritesCount={activeCount + (pastCount ?? 0)}
            activeCount={activeCount}
          />
        )}
        <div className="w-full mt-section-y">
          <Suspense fallback={<EventsGridSkeleton count={3} />}>
            <FavoritesSectionOrError accessToken={authToken} t={t} />
          </Suspense>
        </div>
      </>
    );
  }

  // Guest: cookie store, keyed by slug — unchanged from before this feature.
  const cookieSlugs = [...(await getFavoritesFromCookies())].reverse();
  const fetched = await fetchFavoritesEvents(cookieSlugs);
  const expiredSlugs = collectExpiredEventKeys(fetched.events, (e) => e.slug);
  const slugsToRemove = Array.from(
    new Set([...expiredSlugs, ...fetched.notFoundSlugs])
  );
  const activeEvents = filterActiveEvents(fetched.events);
  const uniqueFavoritesCount = new Set(cookieSlugs).size;

  if (cookieSlugs.length === 0 || activeEvents.length === 0) {
    return (
      <div data-testid="favorites-page-empty">
        <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={[]} />
        <FavoritesPageTracker favoritesCount={uniqueFavoritesCount} activeCount={0} />
        <NoEventsFound title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div data-testid="favorites-page">
      <FavoritesAutoPrune slugsToRemove={slugsToRemove} eventIdsToRemove={[]} />
      <FavoritesPageTracker
        favoritesCount={uniqueFavoritesCount}
        activeCount={activeEvents.length}
      />
      <p className="body-small text-foreground/80 mb-element-gap">
        {t("subtitle")}
      </p>
      <p className="body-small text-foreground/80 mb-element-gap">
        {t("countLabel", { count: uniqueFavoritesCount, max: MAX_FAVORITES })}
      </p>
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

// Wraps FavoritesEventsSection so a backend failure renders the same
// backendUnavailable error state /preferits has always had, now sourced
// from the single-period fetch instead of the merged one.
async function FavoritesSectionOrError({
  accessToken,
  t,
}: {
  accessToken: string;
  t: ProfileTranslator;
}) {
  const section = await FavoritesEventsSection({
    accessToken,
    status: "upcoming",
  });

  if (section === null) {
    return (
      <div data-testid="favorites-page-error">
        <NoEventsFound
          title={t("errorTitle")}
          description={t("errorDescription")}
        />
      </div>
    );
  }

  return section;
}
