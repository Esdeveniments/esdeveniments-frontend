import { siteUrl } from "@config/index";
import { fetchRegionsWithCities } from "@lib/api/regions";
import Link from "next/link";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { buildPageMeta } from "@components/partials/seo-meta";

export const metadata = buildPageMeta({
  title: "Arxiu. Descobreix tot el que passa a Catalunya - Esdeveniments.cat",
  description:
    "Descobreix tot el què ha passat a Catalunya cada any. Les millors propostes culturals per esprémer al màxim de Catalunya - Arxiu - Esdeveniments.cat",
  canonical: `${siteUrl}/sitemap`,
});

async function getData(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  return fetchRegionsWithCities();
}

export default async function Page() {
  const regions = await getData();
  return (
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
  );
}
