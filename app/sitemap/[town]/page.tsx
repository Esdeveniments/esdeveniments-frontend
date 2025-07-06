import { siteUrl } from "@config/index";
import { getAllYears } from "@lib/dates";
import { MONTHS_URL } from "@utils/constants";
import Link from "next/link";
import { fetchPlaceBySlug } from "@lib/api/places";
import type { TownStaticPathParams } from "types/common";
import { buildPageMeta } from "@components/partials/seo-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  const { town } = await params;
  const place = await fetchPlaceBySlug(town);
  const label = place?.name || town;
  return buildPageMeta({
    title: `Arxiu. Descobreix tot el que ha passat a ${label} - Esdeveniments.cat`,
    description: `Descobreix tot el què ha passat a ${label} cada any. Les millors propostes culturals per esprémer al màxim de ${town} - Arxiu - Esdeveniments.cat`,
    canonical: `${siteUrl}/sitemap/${town}`,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<TownStaticPathParams>;
}) {
  const { town } = await params;
  const years: number[] = getAllYears();
  const place = await fetchPlaceBySlug(town);
  const label = place?.name || town;

  return (
    <div className="flex flex-col">
      <div className="reset-this">
        <h2 className="pb-4">{label}</h2>
      </div>
      <div className="grid overflow-hidden grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-2 grid-flow-row w-auto">
        {years?.map((year) => (
          <div key={year} className="box">
            <div className="reset-this">
              <h2 className="pb-2">{year}</h2>
            </div>
            {MONTHS_URL.map((month) => {
              let textMonth: string = month;
              if (month === "marc") textMonth = month.replace("c", "ç");
              return (
                <div key={`${year}-${month}`} className="box py-1">
                  <Link
                    href={`/sitemap/${town}/${year}/${month.toLocaleLowerCase()}`}
                    prefetch={false}
                    className="hover:underline"
                  >
                    <p className="text-md capitalize">{textMonth}</p>
                  </Link>
                </div>
              );
            }).reverse()}
          </div>
        ))}
      </div>
    </div>
  );
}
