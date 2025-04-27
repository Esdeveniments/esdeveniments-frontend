import { Metadata } from "next";
import Meta from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchRegionsWithCities } from "@lib/api/regions";
import Link from "next/link";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export const metadata: Metadata = {
  title: "Arxiu. Descobreix tot el que passa a Catalunya - Esdeveniments.cat",
  description:
    "Descobreix tot el què ha passat a Catalunya cada any. Les millors propostes culturals per esprémer al màxim de Catalunya - Arxiu - Esdeveniments.cat",
  alternates: { canonical: `${siteUrl}/sitemap` },
};

async function getData(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  return fetchRegionsWithCities();
}

export default async function Page() {
  const regions = await getData();
  return (
    <>
      <Meta
        title={metadata.title as string}
        description={metadata.description as string}
        canonical={`${siteUrl}/sitemap`}
      />
      <div className="w-full px-6">
        {regions.map((region) => (
          <div key={region.name} className="">
            <div className="">
              <h2 className="mb-4">{region.name}</h2>
            </div>
            {region.cities.map((city) => (
              <div key={city.value} className="mb-2">
                <Link
                  href={`/sitemap/${city.value.toLowerCase()}`}
                  prefetch={false}
                  className="hover:underline"
                >
                  <p className="">{city.label}</p>
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
