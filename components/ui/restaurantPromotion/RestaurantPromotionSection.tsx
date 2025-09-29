"use client";

import { useState, useEffect, useRef } from "react";
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
  // eventId,
  // eventLocation,
  eventLat,
  eventLng,
  eventStartDate,
}: RestaurantPromotionSectionProps) {
  // All hooks must be called at the top level before any conditional returns
  const [placesResp, setPlacesResp] = useState<PlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPromoInfo, setOpenPromoInfo] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(sectionRef as React.RefObject<Element>, {
    freezeOnceVisible: true,
  });

  // Compute once per render; safe primitive usage inside effect
  const eventIsInFuture = (() => {
    if (!eventStartDate) return false;
    const eventDate = new Date(eventStartDate);
    return eventDate.getTime() > Date.now();
  })();

  // Fetch places when section becomes visible and event is in future
  useEffect(() => {
    if (!isVisible || !eventStartDate || !eventLat || !eventLng || placesResp) {
      return;
    }
    if (!eventIsInFuture) return;

    const fetchPlaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const dateParam = eventStartDate
          ? `&date=${eventStartDate.slice(0, 10)}`
          : "";
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
    eventIsInFuture,
  ]);

  // Don't render if event is not in the future
  if (!eventIsInFuture) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      className="w-full flex justify-center items-start gap-2 px-4"
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
          <p className="text-red-600 text-sm">{error}</p>
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
