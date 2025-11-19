import { getCategorizedEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateCollectionPageSchema,
  generateItemListStructuredData,
  generateSiteNavigationElementSchema,
  generateWebPageSchema,
} from "@components/partials/seo-meta";
import JsonLdServer from "@components/partials/JsonLdServer";
import type { NavigationItem, PageData, Href } from "types/common";
import { CategorizedEvents } from "types/api/event";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import Search from "@components/ui/search";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { Suspense, JSX } from "react";
import { HomePageSkeleton, SearchSkeleton } from "@components/ui/common/skeletons";

const homeSeoLinkSections = [
  {
    title: "Què fer avui",
    links: [
      { href: "/barcelona/avui", label: "Què fer avui a Barcelona" },
      { href: "/maresme/avui", label: "Què fer avui al Maresme" },
      {
        href: "/valles-occidental/avui",
        label: "Què fer avui al Vallès Occidental",
      },
      {
        href: "/valles-oriental/avui",
        label: "Què fer avui al Vallès Oriental",
      },
    ],
  },
  {
    title: "Què fer demà",
    links: [
      { href: "/barcelona/dema", label: "Què fer demà a Barcelona" },
      { href: "/maresme/dema", label: "Què fer demà al Maresme" },
    ],
  },
  {
    title: "Agendes locals",
    links: [
      { href: "/maresme", label: "Agenda Maresme" },
      { href: "/barcelona", label: "Agenda Barcelona" },
      { href: "/vilassar-de-mar", label: "Agenda Vilassar de Mar" },
      { href: "/arenys-de-munt", label: "Agenda Arenys de Munt" },
      { href: "/canet-de-mar", label: "Agenda Canet de Mar" },
      { href: "/altafulla", label: "Agenda Altafulla" },
    ],
  },
] as const;

const homeNavigationItems: NavigationItem[] = homeSeoLinkSections.flatMap(
  (section) =>
    section.links.map((link) => ({
      name: link.label,
      href: link.href as Href,
    }))
);

export async function generateMetadata() {
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export default async function Page(): Promise<JSX.Element> {
  const categorizedEventsPromise = getCategorizedEvents(5);
  const categoriesPromise = fetchCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [];
  });

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  const siteNavigationSchema =
    generateSiteNavigationElementSchema(homeNavigationItems);

  return (
    <>
      {siteNavigationSchema && (
        <JsonLdServer id="site-navigation" data={siteNavigationSchema} />
      )}

      <Suspense fallback={null}>
        <HomeStructuredData
          categorizedEventsPromise={categorizedEventsPromise}
          pageData={pageData}
        />
      </Suspense>

      <div className="container flex justify-center items-center">
        <Suspense fallback={<SearchSkeleton />}>
          <Search />
        </Suspense>
      </div>

      <Suspense fallback={<HomePageSkeleton />}>
        <ServerEventsCategorized
          categorizedEventsPromise={categorizedEventsPromise}
          pageData={pageData}
          categoriesPromise={categoriesPromise}
        />
      </Suspense>
    </>
  );
}

async function HomeStructuredData({
  categorizedEventsPromise,
  pageData,
}: {
  categorizedEventsPromise: Promise<CategorizedEvents>;
  pageData: PageData;
}) {
  const categorizedEvents = await categorizedEventsPromise;
  const homepageEvents = Object.values(categorizedEvents)
    .flat()
    .filter(isEventSummaryResponseDTO);

  const itemListSchema =
    homepageEvents.length > 0
      ? generateItemListStructuredData(
          homepageEvents,
          pageData.title,
          pageData.subTitle
        )
      : null;

  const webPageSchema = generateWebPageSchema({
    title: pageData.title,
    description: pageData.metaDescription,
    url: pageData.canonical,
    mainContentOfPage: itemListSchema || undefined,
  });

  const collectionSchema =
    homepageEvents.length > 0
      ? generateCollectionPageSchema({
          title: pageData.title,
          description: pageData.metaDescription,
          url: pageData.canonical,
          numberOfItems: homepageEvents.length,
          mainEntity: itemListSchema || undefined,
        })
      : null;

  const structuredSchemas = [
    { id: "webpage-schema", data: webPageSchema },
    ...(collectionSchema
      ? [{ id: "collection-schema", data: collectionSchema }]
      : []),
    ...(itemListSchema
      ? [{ id: "homepage-events", data: itemListSchema }]
      : []),
  ];

  return (
    <>
      {structuredSchemas.map((schema) => (
        <JsonLdServer key={schema.id} id={schema.id} data={schema.data} />
      ))}
    </>
  );
}
