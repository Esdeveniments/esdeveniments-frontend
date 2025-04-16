import { JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Script from "next/script";
import { generateJsonData, getFormattedDate } from "@utils/helpers";
import Meta from "@components/partials/seo-meta";
import Link from "next/link";
import { MONTHS_URL } from "@utils/constants";
import { siteUrl } from "@config/index";
import { getAllYears, getHistoricDates } from "@lib/dates";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { fetchEventsFromBackend } from "@lib/api/events";
import { EventSummaryResponseDTO } from "types/api/event";

interface MonthProps {
  events: EventSummaryResponseDTO[];
  town: string;
  townLabel: string;
}

interface StaticPathParams extends Record<string, string> {
  town: string;
  year: string;
  month: string;
}

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound"),
  {
    loading: () => <></>,
    ssr: false,
  }
);

export default function Month({
  events,
  town,
  townLabel,
}: MonthProps): JSX.Element {
  const { query } = useRouter();
  let { year, month } = query as { year?: string; month?: string };

  // Ensure month is defined and handle special case
  if (!month) return <></>;

  if (month === "marc") {
    month = month.replace("c", "ç");
  }

  // Ensure year is defined
  if (!year) return <></>;

  const jsonData = events
    ? events
        .filter((event): event is EventSummaryResponseDTO => event !== null)
        .map((event) => generateJsonData(event))
        .filter((data): data is NonNullable<typeof data> => data !== null)
    : [];

  return (
    <>
      <Script
        id={`${town}-${month}-${year}-script`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      <Meta
        title={`Arxiu de ${townLabel} del ${month} del ${year} - Esdeveniments.cat`}
        description={`Descobreix què va passar a ${townLabel} el ${month} del ${year}. Teatre, cinema, música, art i altres excuses per no parar de descobrir ${townLabel} - Arxiu - Esdeveniments.cat`}
        canonical={`${siteUrl}/sitemap/${town}/${year}/${month}`}
      />
      <div className="flex flex-col justify-center items-center gap-2 p-6">
        <h1 className="font-semibold italic uppercase">
          Arxiu {townLabel} - {month} del {year}
        </h1>
        <div className="flex flex-col items-start">
          {(events?.length > 0 &&
            events.map((event) => {
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
            })) || <NoEventsFound />}
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths<StaticPathParams> = async () => {
  const regions = await fetchRegionsWithCities();
  const years = getAllYears();
  const params: Array<{ params: StaticPathParams }> = [];

  // Get the current year and the next three months
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const nextThreeMonths = currentMonth + 2;

  years.forEach((year) => {
    MONTHS_URL.forEach((month, index) => {
      // Only pre-render pages for the current year from the current month to three months ahead
      if (
        year === currentYear &&
        index >= currentMonth &&
        index <= nextThreeMonths
      ) {
        regions.forEach((region) => {
          region.cities.forEach((town) => {
            params.push({
              params: {
                town: town.value,
                year: year.toString(),
                month: month.toLowerCase(),
              },
            });
          });
        });
      }
    });
  });

  return {
    paths: params,
    fallback: true, // Generate remaining pages on-demand
  };
};

export const getStaticProps: GetStaticProps<
  MonthProps,
  StaticPathParams
> = async ({ params }) => {
  if (!params) {
    return {
      notFound: true,
    };
  }

  const { town, year, month } = params;
  const { from, until } = getHistoricDates(month, parseInt(year, 10));
  const townLabel = town;

  const events = await fetchEventsFromBackend({
    from,
    until,
    maxResults: 2500,
    filterByDate: false,
    q: `${townLabel || ""}`,
  });

  return {
    props: {
      events: events ?? [],
      town,
      townLabel: townLabel || "",
    },
  };
};
