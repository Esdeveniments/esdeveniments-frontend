import { siteUrl } from "@config/index";
import { fetchRegions } from "@lib/api/regions";
import { fetchCities } from "@lib/api/cities";
import Link from "next/link";
import type { RegionSummaryResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import { buildPageMeta } from "@components/partials/seo-meta";

export const metadata = buildPageMeta({
  title: "Arxiu. Descobreix tot el que passa a Catalunya - Esdeveniments.cat",
  description:
    "Descobreix tot el què ha passat a Catalunya cada any. Les millors propostes culturals per esprémer al màxim de Catalunya - Arxiu - Esdeveniments.cat",
  canonical: `${siteUrl}/sitemap`,
});

async function getData(): Promise<{
  regions: RegionSummaryResponseDTO[];
  cities: CitySummaryResponseDTO[];
}> {
  const [regions, cities] = await Promise.all([fetchRegions(), fetchCities()]);

  return { regions, cities };
}

export default async function Page() {
  const { regions, cities } = await getData();

  return (
    <div className="w-full px-6">
      {/* Display regions */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Arxiu</h1>
        <p className="mb-4 text-lg">
          Descobreix tot el què ha passat a Catalunya cada any.
        </p>
        <h2 className="mb-4 text-2xl font-semibold">Comarques</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {regions.map((region) => (
            <div key={region.slug} className="mb-2">
              <Link
                href={`/sitemap/${region.slug}`}
                prefetch={false}
                className="hover:underline"
              >
                <p className="">{region.name}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Display cities */}
      <div>
        <h2 className="mb-4 text-2xl font-semibold">Poblacions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cities.map((city) => (
            <div key={city.slug} className="mb-2">
              <Link
                href={`/sitemap/${city.slug}`}
                prefetch={false}
                className="hover:underline"
              >
                <p className="">{city.name}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
