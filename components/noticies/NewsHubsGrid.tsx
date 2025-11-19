import NewsCard from "@components/ui/newsCard";
import { NEARBY_PLACES_BY_HUB } from "@utils/constants";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsHubsGridProps } from "types/props";

export default async function NewsHubsGrid({ promise }: NewsHubsGridProps) {
  const hubResults = await promise;

  return (
    <div className="flex flex-col gap-10 px-2 lg:px-0">
      {hubResults.map(({ hub, items }) => {
        const first = items?.[0];
        if (!first) return null;
        return (
          <section key={hub.slug} className="w-full">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="uppercase">{`Últimes notícies ${hub.name}`}</h2>
              <PressableAnchor
                href={`/noticies/${hub.slug}`}
                className="text-primary underline text-sm"
                prefetch={false}
                variant="inline"
              >
                Veure més…
              </PressableAnchor>
            </div>
            {NEARBY_PLACES_BY_HUB[hub.slug] && (
              <nav className="mb-3 text-xs text-foreground-strong/70">
                <span className="mr-2">A prop:</span>
                {NEARBY_PLACES_BY_HUB[hub.slug].map((p, i) => (
                  <span key={p.slug} className="inline-flex items-center">
                    <PressableAnchor
                      href={`/noticies/${p.slug}`}
                      prefetch={false}
                      className="underline hover:text-primary"
                      variant="inline"
                    >
                      {p.name}
                    </PressableAnchor>
                    {i < NEARBY_PLACES_BY_HUB[hub.slug].length - 1 && (
                      <span className="mx-1">·</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <NewsCard
                event={first}
                placeSlug={hub.slug}
                placeLabel={hub.name}
                variant="hero"
            />
          </section>
        );
      })}
    </div>
  );
}
