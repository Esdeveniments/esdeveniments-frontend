import type { Metadata } from "next";
import { Suspense } from "react";

import Tabs from "@components/ui/common/tabs";
import NoEventsFound from "@components/ui/common/noEventsFound";
import EventsGridSkeleton from "@components/ui/common/skeletons/EventsGridSkeleton";
import { buildFavoritesTabItems } from "@components/partials/favorites-tabs";
import FavoritesEventsSection from "@components/partials/FavoritesEventsSection";
import { buildPageMeta } from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { getFavoritePeriodCounts } from "@lib/api/favorites-external";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "types/i18n";
import type { ProfileTranslator } from "types/props";
import FavoritesPageTracker from "../FavoritesPageTracker";
import PastFavoritesAuthGate from "./PastFavoritesAuthGate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "App.Favorites" });

  return {
    ...(buildPageMeta({
      title: t("pastTitle"),
      description: t("pastDescription"),
      canonical: `${siteUrl}/preferits/passats`,
      locale,
    }) as Metadata),
    // Past favourites are proof-of-activity for the user themselves, not a
    // page worth ranking — mirrors the profile Passats page's own noindex.
    robots: "noindex, nofollow",
  };
}

export default async function PreferitsPassatsPage() {
  const [t, authToken] = await Promise.all([
    getTranslations("App.Favorites"),
    getAccessTokenFromCookies(),
  ]);

  if (!authToken) {
    return <PastFavoritesAuthGate />;
  }

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
      <Tabs items={tabItems} active="past" ariaLabel={t("heading")} />
      {activeCount !== null && pastCount !== null && (
        <FavoritesPageTracker
          favoritesCount={activeCount + pastCount}
          activeCount={activeCount}
          period="past"
        />
      )}
      <div className="w-full mt-section-y">
        <Suspense fallback={<EventsGridSkeleton count={3} />}>
          <PastFavoritesSectionOrError accessToken={authToken} t={t} />
        </Suspense>
      </div>
    </>
  );
}

// Exported (not just used internally as JSX) so tests can call it directly:
// react-dom/server's renderToStaticMarkup can't resolve a nested async
// Server Component rendered as JSX inside <Suspense> the way Next.js's real
// RSC renderer does — it just falls back to the Suspense fallback instead.
// Calling this function directly and awaiting it, the same way the top-level
// page component itself is tested, sidesteps that renderer limitation.
export async function PastFavoritesSectionOrError({
  accessToken,
  t,
}: {
  accessToken: string;
  t: ProfileTranslator;
}) {
  const section = await FavoritesEventsSection({
    accessToken,
    status: "past",
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
