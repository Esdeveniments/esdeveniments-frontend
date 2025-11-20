import { Suspense } from "react";
import type { JSX } from "react";
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
import type { NavigationItem, PageData } from "types/common";
import { CategorizedEvents } from "types/api/event";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { computeTemporalStatus } from "@utils/event-status";
import type { FeaturedPlaceConfig, SeoLinkItem } from "types/props";

const homeSeoLinkSections: {
  id: string;
  title: string;
  links: SeoLinkItem[];
}[] = [
  {
    id: "today",
    title: "Què fer avui",
    links: [
      { href: "/barcelona/avui", label: "Què fer avui a Barcelona" },
      { href: "/maresme/avui", label: "Què fer avui al Maresme" },
      {
        href: "/valles-oriental/avui",
        label: "Què fer avui al Vallès Oriental",
      },
      { href: "/girona/avui", label: "Què fer avui a Girona" },
    ],
  },
  {
    id: "tomorrow",
    title: "Què fer demà",
    links: [
      { href: "/barcelona/dema", label: "Què fer demà a Barcelona" },
      { href: "/maresme/dema", label: "Què fer demà al Maresme" },
      {
        href: "/valles-occidental/dema",
        label: "Què fer demà al Vallès Occ.",
      },
    ],
  },
  {
    id: "local-agendas",
    title: "Agendes locals més visitades",
    links: [
      { href: "/cardedeu", label: "Agenda Cardedeu" },
      { href: "/llinars", label: "Agenda Llinars" },
      { href: "/la-garriga", label: "Agenda La Garriga" },
      { href: "/el-masnou", label: "Agenda El Masnou" },
      { href: "/granollers", label: "Agenda Granollers" },
      { href: "/canet-de-mar", label: "Agenda Canet de Mar" },
      { href: "/castellbisbal", label: "Agenda Castellbisbal" },
      { href: "/llissa-de-vall", label: "Agenda Lliçà de Vall" },
      { href: "/arenys-de-munt", label: "Agenda Arenys de Munt" },
      { href: "/calella", label: "Agenda Calella" },
      { href: "/mataro", label: "Agenda Mataró" },
      { href: "/malgrat-de-mar", label: "Agenda Malgrat de Mar" },
    ],
  },
];

const homeNavigationItems: NavigationItem[] = homeSeoLinkSections.flatMap(
  (section) =>
    section.links.map((link) => ({
      name: link.label,
      href: link.href,
    }))
);

const featuredPlaceSections: FeaturedPlaceConfig[] = [
  {
    title: "Què fer a Barcelona",
    subtitle: "Plans destacats a la ciutat",
    slug: "barcelona",
    filter: { city: "barcelona" },
  },
  {
    title: "Agenda al Maresme",
    subtitle: "El millor de la comarca",
    slug: "maresme",
    filter: { region: "maresme" },
  },
  {
    title: "Plans al Vallès Occidental",
    slug: "valles-occidental",
    filter: { region: "valles-occidental" },
  },
];

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
  const categoriesPromise = fetchCategories();

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  const siteNavigationSchema =
    generateSiteNavigationElementSchema(homeNavigationItems);

  const localAgendasSection = homeSeoLinkSections.find(
    (section) => section.id === "local-agendas"
  );

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

      <ServerEventsCategorized
        categorizedEventsPromise={categorizedEventsPromise}
        pageData={pageData}
        categoriesPromise={categoriesPromise}
        featuredPlaces={featuredPlaceSections}
        seoTopTownLinks={localAgendasSection?.links}
      />
    </>
  );
}

async function HomeStructuredData({
  categorizedEventsPromise,
  pageData,
}: {
  categorizedEventsPromise: Promise<CategorizedEvents>;
  pageData: PageData;
}): Promise<JSX.Element> {
  const categorizedEvents = await categorizedEventsPromise;
  const homepageEvents = Object.values(categorizedEvents)
    .flat()
    .filter(isEventSummaryResponseDTO)
    .filter((event) => {
      const status = computeTemporalStatus(
        event.startDate,
        event.endDate,
        undefined,
        event.startTime,
        event.endTime
      );
      return status.state !== "past";
    });

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
