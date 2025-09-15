import {
  RestaurantPromotionSectionProps,
  PlacesResponse,
  ActivePromotion,
} from "types/api/restaurant";
import WhereToEatSection from "./WhereToEatSection";
import RestaurantPromotionForm from "./RestaurantPromotionForm";
import PromotedRestaurantCard from "./PromotedRestaurantCard";

export default async function RestaurantPromotionSection({
  eventId,
  eventLocation,
  eventLat,
  eventLng,
}: RestaurantPromotionSectionProps) {
  // SSR fetch: Places
  let placesResp: PlacesResponse | null = null;
  if (eventLat && eventLng) {
    const url = `${
      process.env.NEXT_PUBLIC_SITE_URL ?? ""
    }/api/places/nearby?lat=${eventLat}&lng=${eventLng}&limit=3`;
    try {
      const res = await fetch(url, {
        next: {
          revalidate: 3600,
          tags: ["places", `places:${eventLat}:${eventLng}`],
        },
      });
      if (res.ok) placesResp = await res.json();
    } catch {
      placesResp = null;
    }
  }

  // SSR fetch: Active promotion
  let activePromotion: ActivePromotion | null = null;
  try {
    const promoUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL ?? ""
    }/api/promotions/active?eventId=${eventId}`;
    const promoRes = await fetch(promoUrl, {
      next: { revalidate: 60, tags: ["promotions", `promotion:${eventId}`] },
    });
    if (promoRes.ok) {
      const promoData = await promoRes.json();
      activePromotion = promoData; // Will be null until backend is implemented
    }
  } catch {
    activePromotion = null;
  }

  return (
    <div className="w-full flex justify-center bg-whiteCorp pb-8">
      <div className="w-full sm:w-[520px] md:w-[520px] lg:w-[520px] px-4 flex flex-col gap-6">
        {/* Active Promotion (if any) */}
        {activePromotion && (
          <PromotedRestaurantCard promotion={activePromotion} />
        )}

        {/* Where to Eat Section */}
        {placesResp && placesResp.results?.length > 0 && (
          <WhereToEatSection
            places={placesResp.results}
            attribution={placesResp.attribution}
          />
        )}

        {/* Promotion Form (client) */}
        <div className="w-full flex justify-center items-start gap-2 px-4">
          <div className="w-11/12 flex flex-col gap-4">
            <RestaurantPromotionForm
              eventId={eventId}
              eventLocation={eventLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
