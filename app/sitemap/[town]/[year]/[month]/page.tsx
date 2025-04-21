import { JSX } from "react";
import Meta from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchEventsByTownYearMonth } from "@lib/api/events";
import Link from "next/link";
import { GetStaticProps, GetStaticPaths } from "next";
import type { EventsByTownYearMonthResponseDTO } from "types/api/event";

export default function TownYearMonthSitemap({
  events,
}: {
  events: EventsByTownYearMonthResponseDTO[];
}): JSX.Element {
  return (
    <>
      <Meta
        title={`Arxiu. Descobreix tot el que passa a ${events[0]?.town} - Esdeveniments.cat`}
        description={`Descobreix tot el què ha passat a ${events[0]?.town} cada any. Les millors propostes culturals per esprémer al màxim de ${events[0]?.town} - Arxiu - Esdeveniments.cat`}
        canonical={`${siteUrl}/sitemap/${events[0]?.town.toLowerCase()}/${events[0]?.year}/${events[0]?.month}`}
      />
      <div className="w-full px-6">
        {events.map((event) => (
          <div key={event.id} className="">
            <div className="">
              <h2 className="mb-4">{event.title}</h2>
            </div>
            <div className="mb-2">
              <Link
                href={`/e/${event.id}/${event.slug}`}
                prefetch={false}
                className="hover:underline"
              >
                <p className="">{event.title}</p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const towns = await fetchTowns();
  const paths = towns.flatMap((town) =>
    town.years.flatMap((year) =>
      year.months.map((month) => ({
        params: {
          town: town.value.toLowerCase(),
          year: year.value,
          month: month.value,
        },
      }))
    )
  );

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const events = await fetchEventsByTownYearMonth(
    params?.town as string,
    params?.year as string,
    params?.month as string
  );
  return { props: { events } };
};
