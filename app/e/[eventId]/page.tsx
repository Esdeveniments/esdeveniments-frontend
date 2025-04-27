import { generateJsonData } from "@utils/helpers";
import { fetchEventById } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "../../../lib/meta";
import Script from "next/script";
import EventMedia from "./components/EventMedia";
import EventHeader from "./components/EventHeader";
import EventDescription from "./components/EventDescription";
import EventCalendar from "./components/EventCalendar";
import EventShareBar from "./components/EventShareBar";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import AdArticle from "components/ui/adArticle";
import EventClient from "./EventClient";
import NoEventFound from "components/ui/common/noEventFound";

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

  return (
    <main>
      <Script
        id={event.id ? String(event.id) : undefined}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      <div className="w-full flex justify-center bg-whiteCorp pb-10">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px]">
          <article className="w-full flex flex-col justify-center items-start gap-8">
            <div className="w-full flex flex-col justify-center items-start gap-4">
              <EventMedia event={event} title={title} />
            </div>
            <EventShareBar
              slug={eventSlug}
              title={title}
              eventDateString={eventDateString}
              location={event.location}
              cityName={cityName}
              regionName={regionName}
            />
            <EventHeader
              title={title}
              eventDate={eventDateString}
              location={event.location}
              city={cityName}
              region={regionName}
            />
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
            <EventDescription description={event.description} />
            <EventCalendar event={event} />
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
            <EventClient event={event} />
          </article>
        </div>
      </div>
    </main>
  );
}

export const revalidate = 300;
