"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { parseISO, isValid, differenceInCalendarDays, format } from "date-fns";
import { useTranslations } from "next-intl";
import { computeTemporalStatus, buildEventStatusLabels } from "@utils/event-status";
import {
  RestaurantPromotionSectionProps,
  PlacesResponse,
  // ActivePromotion,
} from "types/api/restaurant";
import WhereToEatSection from "./WhereToEatSection";
import WhereToEatSkeleton from "./WhereToEatSkeleton";
import useOnScreen from "components/hooks/useOnScreen";
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

  // Suppress unused parameter warning - eventId is used in commented-out form
  void eventId;
  // All hooks must be called at the top level before any conditional returns
  const [placesResp, setPlacesResp] = useState<PlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPromoInfo, setOpenPromoInfo] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(sectionRef as React.RefObject<Element>, {
    freezeOnceVisible: true,
  });

  // Memoize derived state to avoid recalculating on every render
  // We keep two booleans:
  // - eventIsInFuture: whether the event is today (and not finished) or in the future (used to decide render)
  // - eventIsWithinFetchWindow: whether the event is within the next MAX_DAYS days
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

  // Fetch places when section becomes visible and event is in future and within the fetch window
  useEffect(() => {
    if (!isVisible || !eventStartDate || !eventLat || !eventLng || placesResp) {
      return;
    }
    // Only fetch if the event is within the configured fetch window (e.g. next 15 days)
    if (!eventIsWithinFetchWindow) return;

    const fetchPlaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let dateParam = "";
        if (eventStartDate) {
          // Format to YYYY-MM-DD for the API
          const parsed = parseISO(eventStartDate);
          const usedDate = isValid(parsed) ? parsed : new Date(eventStartDate);
          dateParam = `&date=${format(usedDate, "yyyy-MM-dd")}`;
        }
        const url = `/api/places/nearby?lat=${eventLat}&lng=${eventLng}&limit=3${dateParam}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          setPlacesResp(data);
        } else {
          setError("Failed to fetch places");
        }
      } catch (err) {
        console.error("Error fetching places", err);
        setError("Error fetching places");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [
    isVisible,
    eventLat,
    eventLng,
    eventStartDate,
    placesResp,
    eventIsWithinFetchWindow,
  ]);

  // Don't render if event is in the past
  if (!eventIsInFuture) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      className="w-full flex justify-center items-start gap-2 min-w-0"
    >
      {/* Loading State */}
      {isLoading && (
        <WhereToEatSkeleton
          items={2}
          onPromoteClick={() => setOpenPromoInfo(true)}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="body-small text-error">{error}</p>
        </div>
      )}

      {/* Active Promotion (if any) */}
      {/* {activePromotion && (
          <PromotedRestaurantCard promotion={activePromotion} />
        )} */}

      {/* Where to Eat Section */}
      {placesResp && placesResp.results?.length > 0 && (
        <WhereToEatSection
          places={placesResp.results}
          attribution={placesResp.attribution}
          onPromoteClick={() => setOpenPromoInfo(true)}
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
