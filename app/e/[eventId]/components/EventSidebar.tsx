import { Suspense } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import EventCalendar from "./EventCalendar";
import EventLocation from "./EventLocation";
import Weather from "components/ui/weather";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { EventSidebarProps } from "types/props";

/**
 * Sticky sidebar for the event detail page (desktop only).
 * Contains: Date/Time, Location, More Info, Duration, Sponsor.
 *
 * Rendered inside a card with sticky positioning.
 * Hidden on mobile (lg:hidden) — mobile uses inline versions of these components.
 */
export default async function EventSidebar({
  event,
  cityName,
  regionName,
  primaryPlaceSlug,
  sponsorFallbackPlaces,
}: EventSidebarProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.EventPage" });

  return (
    <aside
      className="hidden lg:block w-[340px] xl:w-[380px] flex-shrink-0"
      aria-label={t("sidebarAriaLabel")}
    >
      <div className="sticky top-20 flex flex-col gap-4">
        {/* Main sidebar card */}
        <div className="card-bordered">
          <div className="card-body flex flex-col gap-4">
            {/* Date & Time */}
            <EventCalendar event={event} compact />

            <hr className="border-border" />

            {/* Location */}
            <EventLocation
              location={event.location}
              cityName={cityName}
              regionName={regionName}
              citySlug={event.city?.slug}
              regionSlug={event.region?.slug}
              compact
            />

            {/* Weather (only when data available — not shown for past events) */}
            {event.weather && (
              <>
                <hr className="border-border" />
                <Weather weather={event.weather} />
              </>
            )}

            {/* Duration (from EventDetailsSection) */}
            {event.duration && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2 body-small text-foreground-strong/70">
                  <ClockIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{t("durationLabel", { duration: event.duration })}</span>
                </div>
              </>
            )}

            {/* More Info link (from EventDetailsSection) */}
            {event.url && /^https?:\/\//i.test(event.url) && (
              <>
                <hr className="border-border" />
                <div className="flex flex-col gap-1">
                  <h3 className="label font-semibold text-foreground-strong">
                    {t("sidebarMoreInfo")}
                  </h3>
                  <PressableAnchor
                    href={event.url}
                    className="inline-flex items-center gap-1 body-small font-semibold text-primary hover:text-primary-dark transition-colors"
                    target="_blank"
                    rel="noreferrer"
                    variant="inline"
                    data-analytics-link-type="sidebar_visit_website"
                    data-analytics-context="event_sidebar"
                    data-analytics-event-id={event.id ? String(event.id) : ""}
                    data-analytics-event-slug={event.slug || ""}
                    disableNavigationSignal
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    {t("sidebarVisitWebsite")}
                  </PressableAnchor>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Sponsor card (outside main card for visual separation) */}
        <Suspense fallback={null}>
          <SponsorBannerSlot
            place={primaryPlaceSlug}
            fallbackPlaces={sponsorFallbackPlaces}
          />
        </Suspense>
      </div>
    </aside>
  );
}
