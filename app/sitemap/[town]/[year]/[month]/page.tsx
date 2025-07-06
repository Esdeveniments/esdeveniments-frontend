import Script from "next/script";
import Link from "next/link";
import { generateJsonData, getFormattedDate } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { fetchPlaceBySlug } from "@lib/api/places";
import { getHistoricDates } from "@lib/dates";
import dynamic from "next/dynamic";
import type { MonthStaticPathParams } from "types/common";
import type { EventSummaryResponseDTO } from "types/api/event";
import { buildPageMeta } from "@components/partials/seo-meta";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound")
);

export async function generateMetadata({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  const place = await fetchPlaceBySlug(town);
  const townLabel = place?.name || town;
  let textMonth = month;
  if (month === "marc") textMonth = month.replace("c", "ç");
  return buildPageMeta({
    title: `Arxiu de ${townLabel} del ${textMonth} del ${year} - Esdeveniments.cat`,
    description: `Descobreix què va passar a ${townLabel} el ${textMonth} del ${year}. Teatre, cinema, música, art i altres excuses per no parar de descobrir ${townLabel} - Arxiu - Esdeveniments.cat`,
    canonical: `${siteUrl}/sitemap/${town}/${year}/${month}`,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  if (!town || !year || !month) return null;

  const { from, until } = getHistoricDates(month, Number(year));

  const [events, place] = await Promise.all([
    fetchEvents({
      place: town,
      from: from.toISOString().split("T")[0],
      to: until.toISOString().split("T")[0],
      size: 2500,
    }),
    fetchPlaceBySlug(town),
  ]);
  const townLabel = place?.name || town;

  let textMonth = month;
  if (month === "marc") textMonth = month.replace("c", "ç");

  const filteredEvents = Array.isArray(events.content)
    ? (events.content as EventSummaryResponseDTO[]).filter(
        (event) => !event.isAd
      )
    : [];

  const jsonData = filteredEvents
    ? filteredEvents
        .map((event) => generateJsonData(event))
        .filter((data) => data !== null)
    : [];

  return (
    <>
      <Script
        id={`${town}-${month}-${year}-script`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      <div className="flex flex-col justify-center items-center gap-2 p-6">
        <h1 className="font-semibold italic uppercase">
          Arxiu {townLabel} - {textMonth} del {year}
        </h1>
        <div className="flex flex-col items-start">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event: EventSummaryResponseDTO) => {
              const { formattedStart, formattedEnd } = getFormattedDate(
                event.startDate,
                event.endDate
              );
              return (
                <div key={event.id}>
                  <Link
                    href={`/e/${event.slug}`}
                    prefetch={false}
                    className="hover:text-primary"
                  >
                    <h3>{event.title}</h3>
                    <p className="text-sm">
                      {formattedEnd
                        ? `${formattedStart} - ${formattedEnd}`
                        : `${formattedStart}`}
                    </p>
                  </Link>
                </div>
              );
            })
          ) : (
            <NoEventsFound />
          )}
        </div>
      </div>
    </>
  );
}
