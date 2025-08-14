import { fetchFeaturedEvents, MIN_FEATURED_EVENTS_TO_DISPLAY } from "@lib/api/featured";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import PromoStripTracker from "@components/ui/promotions/PromoStripTracker";

export default async function FeaturedEventsSection({
  title = "Destacats",
  place,
  category,
  placement = "generic",
  pageType = "home",
}: {
  title?: string;
  place?: string;
  category?: string;
  placement?: string;
  pageType?: "home" | "place" | "event" | "news";
}) {
  if (process.env.NEXT_PUBLIC_FEATURE_PROMOTED !== "1") return null;
  const featured = await fetchFeaturedEvents({ place, category });
  if (!featured || featured.length < MIN_FEATURED_EVENTS_TO_DISPLAY) return null;

  return (
    <section className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-6">
      <h2 className="uppercase mb-2 px-2 lg:px-0">{title}</h2>
      <PromoStripTracker events={featured} placement={placement} pageType={pageType} place={place} category={category}>
        <EventsAroundServer
          events={featured}
          layout="horizontal"
          usePriority
          showJsonLd={false}
          title={title}
        />
      </PromoStripTracker>
    </section>
  );
}