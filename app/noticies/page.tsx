import { Suspense } from "react";
import { headers } from "next/headers";
import { fetchNews } from "@lib/api/news";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import type { ListEvent } from "types/api/event";
import { mapNewsSummariesToEvents } from "@utils/news-mapping";
import { insertAds } from "@lib/api/events";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import Link from "next/link";
import { NEWS_HUBS } from "@utils/constants";
import { siteUrl } from "@config/index";
import Script from "next/script";
import { generateWebPageSchema } from "@components/partials/seo-meta";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Basic SEO for the news listing page
  return buildPageMeta({
    title: "Notícies | Esdeveniments.cat",
    description:
      "Les últimes notícies, recomanacions i plans culturals de Catalunya.",
    canonical: "/noticies",
  }) as unknown as Metadata;
}

export default async function Page() {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  // Fetch the most recent news per hub
  const hubResults = await Promise.all(
    NEWS_HUBS.map(async (hub) => {
      const res = await fetchNews({ page: 0, size: 1, place: hub.slug });
      return { hub, items: res.content };
    })
  );

  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Notícies", url: `${siteUrl}/noticies` },
  ];
  const webPageSchema = generateWebPageSchema({
    title: "Notícies",
    description: "Les últimes notícies i recomanacions d'esdeveniments.",
    url: `${siteUrl}/noticies`,
    breadcrumbs,
  });

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-8">
      <Script
        id="news-list-webpage-breadcrumbs"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <h1 className="uppercase mb-2 px-2 lg:px-0">Notícies</h1>
      <p className="text-[16px] font-normal text-blackCorp text-left mb-8 px-2 font-barlow">
        Les últimes notícies i recomanacions d&apos;esdeveniments.
      </p>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 px-2 lg:px-0 text-sm text-blackCorp/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:underline">
              Inici
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-blackCorp">Notícies</li>
        </ol>
      </nav>
      <div className="flex flex-col gap-10 px-2 lg:px-0">
        {hubResults.map(({ hub, items }) => {
          const mapped = mapNewsSummariesToEvents(items || [], hub.slug);
          const withAds: ListEvent[] = insertAds(mapped);
          return (
            <section key={hub.slug} className="w-full">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="uppercase">{`Últimes notícies ${hub.name}`}</h2>
                <Link
                  href={`/noticies/${hub.slug}`}
                  className="text-primary underline text-sm"
                  prefetch={false}
                >
                  Veure més…
                </Link>
              </div>
              <Suspense
                fallback={
                  <div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" />
                }
              >
                <List events={withAds}>
                  {(event: ListEvent, index: number) => (
                    <Card
                      key={`${event.id}-${index}`}
                      event={event}
                      isPriority={index === 0}
                    />
                  )}
                </List>
              </Suspense>
            </section>
          );
        })}
      </div>
    </div>
  );
}
