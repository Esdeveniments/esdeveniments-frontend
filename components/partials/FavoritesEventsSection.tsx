import { getTranslations } from "next-intl/server";
import { listFavoriteEventsByPeriodExternal } from "@lib/api/favorites-external";
import { MAX_FAVORITES_AUTHENTICATED } from "@utils/constants";
import EventsSection from "./EventsSection";
import type { ReactElement } from "react";

// Authenticated-only: fetches one favourites period and renders it via the
// shared EventsSection, matching ProfileEventsSection's shape. Returns null
// on backend failure so the caller page can render its own
// backendUnavailable error state (consistent with how /preferits already
// handles that today).
export default async function FavoritesEventsSection({
  accessToken,
  status,
}: {
  accessToken: string;
  status: "upcoming" | "past";
}): Promise<ReactElement | null> {
  const period = status === "past" ? "past" : "active";
  const [t, page] = await Promise.all([
    getTranslations("App.Favorites"),
    listFavoriteEventsByPeriodExternal(
      accessToken,
      period,
      0,
      MAX_FAVORITES_AUTHENTICATED
    ),
  ]);

  if (page === null) return null;

  return (
    <EventsSection
      events={page.content}
      emptyTitle={t(status === "past" ? "pastEmptyTitle" : "emptyTitle")}
      sectionLabel={t(status === "past" ? "tabPast" : "tabUpcoming")}
      testId={status === "past" ? "favorites-past-events" : "favorites-events"}
      initialIsFavorite
    />
  );
}
