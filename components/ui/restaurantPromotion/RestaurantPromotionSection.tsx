"use client";

import { useState, useEffect, useRef } from "react";
import {
  RestaurantPromotionSectionProps,
  PlacesResponse,
  // ActivePromotion,
} from "types/api/restaurant";
import WhereToEatSection from "./WhereToEatSection";
import useOnScreen from "components/hooks/useOnScreen";
// import RestaurantPromotionForm from "./RestaurantPromotionForm";
// import PromotedRestaurantCard from "./PromotedRestaurantCard";

export default function RestaurantPromotionSection({
  // eventId,
  // eventLocation,
  eventLat,
  eventLng,
  eventStartDate,
}: RestaurantPromotionSectionProps) {
  const [placesResp, setPlacesResp] = useState<PlacesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(sectionRef as React.RefObject<Element>, {
    freezeOnceVisible: true,
  });

  // Check if event is in the future
  const isEventInFuture = () => {
    if (!eventStartDate) return false;
    const eventDate = new Date(eventStartDate);
    const now = new Date();
    return eventDate > now;
  };

  // Fetch places when section becomes visible and event is in future
  useEffect(() => {
    if (!isVisible || !eventStartDate || !eventLat || !eventLng || placesResp) {
      return;
    }

    // Check if event is in the future
    const eventDate = new Date(eventStartDate);
    const now = new Date();
    if (eventDate <= now) {
      return;
    }

    const fetchPlaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/places/nearby?lat=${eventLat}&lng=${eventLng}&limit=3`;
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
  }, [isVisible, eventLat, eventLng, eventStartDate, placesResp]);

  // Don't render if event is not in the future
  if (!isEventInFuture()) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      className="w-full flex justify-center bg-whiteCorp pb-8"
    >
      <div className="w-full sm:w-[520px] md:w-[520px] lg:w-[520px] px-4 flex flex-col gap-6">
        {/* Loading State */}
        {isLoading && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
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
          />
        )}

        {/* Promotion Form (client) */}
        {/* <div className="w-full flex justify-center items-start gap-2 px-4">
          <div className="w-11/12 flex flex-col gap-4">
            <RestaurantPromotionForm
              eventId={eventId}
              eventLocation={eventLocation}
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}
