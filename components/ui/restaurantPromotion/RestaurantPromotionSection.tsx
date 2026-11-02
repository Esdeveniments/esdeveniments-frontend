"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { parseISO, isValid, differenceInCalendarDays, format } from "date-fns";
import { useTranslations } from "next-intl";
import { computeTemporalStatus, buildEventStatusLabels } from "@utils/event-status";
import { sendGoogleEvent } from "@utils/analytics";
import {
  RestaurantPromotionSectionProps,
  PlacesResponse,
  // ActivePromotion,
} from "types/api/restaurant";
import WhereToEatSection from "./WhereToEatSection";
import WhereToEatSkeleton from "./WhereToEatSkeleton";
import SectionHeading from "@components/ui/common/SectionHeading";
import { FireIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";

// Lazy load info modal only when needed
const PromotionInfoModal = dynamic(() => import("./PromotionInfoModal"), {
  ssr: false,
});
// import RestaurantPromotionForm from "./RestaurantPromotionForm";
// import PromotedRestaurantCard from "./PromotedRestaurantCard";

export default function RestaurantPromotionSection({
  eventId, // Used in commented-out RestaurantPromotionForm
  // eventLocation,
  eventLat,
  eventLng,
  eventStartDate,
  eventEndDate,
  eventStartTime,
  eventEndTime,
}: RestaurantPromotionSectionProps) {
  const tStatus = useTranslations("Utils.EventStatus");
  const statusLabels = useMemo(() => buildEventStatusLabels(tStatus), [tStatus]);
  const t = useTranslations("Components.WhereToEatSection");

  // Suppress unused parameter warning - eventId is used in commented-out form
  void eventId;
  // All hooks must be called at the top level before any conditional returns
  const [placesResp, setPlacesResp] = useState<PlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openPromoInfo, setOpenPromoInfo] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  // Memoize derived state to avoid recalculating on every render
  // We keep two booleans:
  // - eventIsInFuture: whether the event is today (and not finished) or in the future (used to decide render)
  // - eventIsWithinFetchWindow: whether the event is within the next MAX_DAYS days (enables the load button)
  const { eventIsWithinFetchWindow, eventIsInFuture } = useMemo(() => {
    const MAX_DAYS = 15;
    if (!eventStartDate)
      return { eventIsInFuture: false, eventIsWithinFetchWindow: false };

    // Use computeTemporalStatus to determine if event has finished (DRY principle)
    // This reuses the same logic used elsewhere in the app for consistency
    const temporalStatus = computeTemporalStatus(
      eventStartDate,
      eventEndDate,
      undefined, // no nowOverride, use current time
      eventStartTime,
      eventEndTime,
      statusLabels
    );

    // Event has finished if temporal status is "past"
    const eventHasFinished = temporalStatus.state === "past";

    // Calculate days ahead for start date (for fetch window logic)
    const startDate = parseISO(eventStartDate);
    const startDateTime = isValid(startDate)
      ? startDate
      : new Date(eventStartDate);
    const now = new Date();
    const daysAhead = differenceInCalendarDays(startDateTime, now);

    // Event should render if it hasn't finished yet
    const eventIsInFuture = !eventHasFinished;

    // For fetch window, only fetch for events that start today or in the future (within 15 days)
    // This prevents fetching for events that started in the past, even if still ongoing
    // (we still show them if they haven't finished, but won't fetch restaurant data)
    const eventIsWithinFetchWindow =
      daysAhead >= 0 && daysAhead <= MAX_DAYS && !eventHasFinished;
    return { eventIsWithinFetchWindow, eventIsInFuture };
  }, [eventStartDate, eventEndDate, eventStartTime, eventEndTime, statusLabels]);

  // Track section view once places are loaded (fire only once)
  const hasTrackedViewRef = useRef(false);
  useEffect(() => {
    const placesCount = placesResp?.results?.length ?? 0;
    if (!hasTrackedViewRef.current && placesCount > 0) {
      sendGoogleEvent("restaurant_section_view", {
        context: "event_detail",
        places_count: placesCount,
      });
      hasTrackedViewRef.current = true;
    }
  }, [placesResp]);

  // Click-to-load: every cache miss is a billed Google `searchNearby` call, so
  // we only fetch when a person asks. Bots and passive scrollers never trigger it.
  const canLoadPlaces = Boolean(
    eventIsWithinFetchWindow && eventStartDate && eventLat && eventLng
  );

  const handleLoadPlaces = async () => {
    if (hasRequested || !canLoadPlaces || !eventStartDate) return;
    setHasRequested(true);
    setIsLoading(true);
    sendGoogleEvent("restaurant_load_click", { context: "event_detail" });

    try {
      const parsed = parseISO(eventStartDate);
      const usedDate = isValid(parsed) ? parsed : new Date(eventStartDate);
      const dateParam = `&date=${format(usedDate, "yyyy-MM-dd")}`;
      const url = `/api/places/nearby?lat=${eventLat}&lng=${eventLng}&limit=2${dateParam}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        setPlacesResp(data);
      }
    } catch (err) {
      console.error("Error fetching places", err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPlaces = (placesResp?.results?.length ?? 0) > 0;

  // Don't render if event is in the past
  if (!eventIsInFuture) {
    return null;
  }

  return (
    <div className="w-full flex justify-center items-start gap-2 min-w-0">
      {canLoadPlaces && (!hasRequested || (!isLoading && !hasPlaces)) && (
        <section className="stack w-full min-w-0" aria-labelledby="where-to-eat">
          <SectionHeading
            headingId="where-to-eat"
            Icon={FireIcon}
            iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
            title={t("title")}
            titleClassName="heading-2"
          />
          {hasRequested ? (
            <p className="body-small text-muted-foreground px-section-x">
              {t("empty")}
            </p>
          ) : (
            <div className="stack px-section-x">
              <p className="body-small text-muted-foreground">{t("loadIntro")}</p>
              <button
                type="button"
                onClick={handleLoadPlaces}
                className="btn-outline btn-sm self-start"
              >
                {t("loadCta")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Loading State */}
      {isLoading && (
        <WhereToEatSkeleton
          items={2}
          onPromoteClick={() => {
            sendGoogleEvent("restaurant_promote_click", {
              context: "where_to_eat_skeleton",
            });
            setOpenPromoInfo(true);
          }}
        />
      )}

      {/* Active Promotion (if any) */}
      {/* {activePromotion && (
          <PromotedRestaurantCard promotion={activePromotion} />
        )} */}

      {/* Where to Eat Section */}
      {placesResp && hasPlaces && (
        <WhereToEatSection
          places={placesResp.results}
          attribution={placesResp.attribution}
          onPromoteClick={() => {
            sendGoogleEvent("restaurant_promote_click", {
              context: "where_to_eat",
            });
            setOpenPromoInfo(true);
          }}
        />
      )}

      {/* Promotion Form (client) */}
      {/* 
          <div className="w-11/12 flex flex-col gap-4">
            <RestaurantPromotionForm
              eventId={eventId}
              eventLocation={eventLocation}
            />
        </div> */}
      {/* Info Modal (email CTA) */}
      <PromotionInfoModal open={openPromoInfo} setOpen={setOpenPromoInfo} />
    </div>
  );
}
