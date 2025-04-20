import { JSX } from "react";
import Meta from "@components/partials/seo-meta";
import { siteUrl } from "@config/index";
import { fetchRegionsWithCities } from "@lib/api/regions";
import Link from "next/link";
import { GetStaticProps } from "next";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export default function Sitemap({
  regions,
}: {
  regions: RegionsGroupedByCitiesResponseDTO[];
}): JSX.Element {
  return (
    <>
      <Meta
        title={`Arxiu. Descobreix tot el que passa a Catalunya - Esdeveniments.cat`}
        description="Descobreix tot el què ha passat a Catalunya cada any. Les millors propostes culturals per esprémer al màxim de Catalunya - Arxiu - Esdeveniments.cat"
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

export const getStaticProps: GetStaticProps = async () => {
  const regions = await fetchRegionsWithCities();
  return { props: { regions } };
};
