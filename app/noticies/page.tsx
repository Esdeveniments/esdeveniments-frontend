import { Suspense } from "react";
import { fetchNews } from "@lib/api/news";
import type { Metadata } from "next";
import { buildPageMeta } from "@components/partials/seo-meta";
import { NEWS_HUBS } from "@utils/constants";
import { siteUrl } from "@config/index";
import {
  generateWebPageSchema,
  generateBreadcrumbList,
} from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import NewsHubsGrid from "@components/noticies/NewsHubsGrid";
import NewsGridSkeleton from "@components/noticies/NewsGridSkeleton";
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  // Basic SEO for the news listing page
  return buildPageMeta({
    title: "Notícies | Esdeveniments.cat",
    description:
      "Les últimes notícies, recomanacions i plans culturals de Catalunya.",
    canonical: `${siteUrl}/noticies`,
  }) as unknown as Metadata;
}

export default function Page() {
  // Start fetching, don't wait
  const hubResultsPromise = Promise.all(
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
  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbs);

  return (
    <div className="container flex-col justify-center items-center mt-8">
      <JsonLdServer id="news-list-webpage-breadcrumbs" data={webPageSchema} />
      {breadcrumbListSchema && (
        <JsonLdServer id="news-list-breadcrumbs" data={breadcrumbListSchema} />
      )}

      <h1 className="uppercase mb-2 px-2 lg:px-0">Notícies</h1>
      <p className="text-[16px] font-normal text-foreground-strong text-left mb-8 px-2 font-barlow">
        Les últimes notícies i recomanacions d&apos;esdeveniments.
      </p>
      <div className="w-full flex justify-end px-2 lg:px-0 mb-4 text-sm">
        <PressableAnchor
          href={`/noticies/rss.xml`}
          className="text-primary underline text-sm"
          prefetch={false}
          variant="inline"
        >
          RSS
        </PressableAnchor>
      </div>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 px-2 lg:px-0 text-sm text-foreground-strong/70"
      >
        <ol className="flex items-center space-x-2">
          <li>
            <PressableAnchor
              href="/"
              className="hover:underline"
              variant="inline"
              prefetch={false}
            >
              Inici
            </PressableAnchor>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="text-foreground-strong">Notícies</li>
        </ol>
      </nav>

      <Suspense fallback={<NewsGridSkeleton />}>
        <NewsHubsGrid promise={hubResultsPromise} />
      </Suspense>
    </div>
  );
}
