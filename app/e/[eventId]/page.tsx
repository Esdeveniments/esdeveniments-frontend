import { generateJsonData } from "@utils/helpers";
import { fetchEventById } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "../../../lib/meta";
import Script from "next/script";
import EventMedia from "./components/EventMedia";
import EventShareBar from "./components/EventShareBar";
import EventClient from "./EventClient";
import NoEventFound from "components/ui/common/noEventFound";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import AdArticle from "components/ui/adArticle";

// Helper to extract uuid from slug
function extractUuidFromSlug(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

// Helper: Metadata generation
export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
  const uuid = extractUuidFromSlug(slug);
  const event = await fetchEventById(uuid);
  if (!event) return { title: "No event found" };
  return generateEventMetadata(event, `${siteUrl}/e/${slug}`);
}

// Main page component
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;
  const uuid = extractUuidFromSlug(slug);
  const event: EventDetailResponseDTO | null = await fetchEventById(uuid);
  if (!event) return <NoEventFound />;
  if (event.title === "CANCELLED") return <NoEventFound />;

  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";
  const eventDateString = event.endDate
    ? `Del ${event.startDate} al ${event.endDate}`
    : `${event.startDate}`;
  const jsonData = generateJsonData({ ...event });

  // Generate JSON-LD for related events (server-side for SEO)
  const relatedEventsJsonData =
    event.relatedEvents && event.relatedEvents.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Related Events",
          numberOfItems: event.relatedEvents.length,
          itemListElement: event.relatedEvents
            .slice(0, 10) // Limit for performance
            .map((relatedEvent, index) => {
              try {
                return {
                  "@type": "ListItem",
                  position: index + 1,
                  item: generateJsonData(relatedEvent),
                };
              } catch (err) {
                console.error(
                  "Error generating JSON-LD for related event:",
                  relatedEvent.id,
                  err
                );
                return null;
              }
            })
            .filter(Boolean),
        }
      : null;

  return (
    <>
      {/* Main Event JSON-LD */}
      <Script
        id={event.id ? String(event.id) : undefined}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      {/* Related Events JSON-LD */}
      {relatedEventsJsonData && (
        <Script
          id={`related-events-${event.id}`}
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(relatedEventsJsonData),
          }}
        />
      )}
      <div className="w-full flex justify-center bg-whiteCorp pb-10">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px] min-w-0">
          <article className="w-full flex flex-col justify-center items-start gap-8">
            <div className="w-full flex flex-col justify-center items-start gap-4">
              <EventMedia event={event} title={title} />
              <EventShareBar
                visits={event.visits}
                slug={eventSlug}
                title={title}
                description={event.description}
                eventDateString={eventDateString}
                location={event.location}
                cityName={cityName}
                regionName={regionName}
                postalCode={event.city?.postalCode || ""}
              />
            </div>
            <EventClient event={event} />
            {/* Related Events - Server-side rendered for SEO */}
            {event.relatedEvents && event.relatedEvents.length > 0 && (
              <EventsAroundSection
                events={event.relatedEvents}
                title="Esdeveniments relacionats"
              />
            )}
            {/* Final Ad Section */}
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}

export const revalidate = 300;
