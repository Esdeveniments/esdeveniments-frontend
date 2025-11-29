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
import type { FeaturedPlaceConfig, SeoLinkSection } from "types/props";
import { filterActiveEvents } from "@utils/event-helpers";
import { TOP_AGENDA_LINKS } from "@config/top-agenda-links";

export const revalidate = 300;

const homeSeoLinkSections: SeoLinkSection[] = [
  {
    id: "weekend",
    title: "Què fer aquest cap de setmana",
    links: [
      { href: "/catalunya/cap-de-setmana", label: "10 plans per al cap de setmana" },
      {
        href: "/catalunya/cap-de-setmana/festes-populars",
        label: "Festes populars cap de setmana",
      },
      {
        href: "/catalunya/cap-de-setmana/familia-i-infants",
        label: "Activitats amb nens cap de setmana",
      },
      {
        href: "/catalunya/cap-de-setmana/musica",
        label: "Concerts cap de setmana",
      },
    ],
  },
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
      { href: "/mataro/avui", label: "Què fer avui a Mataró" },
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
        label: "Què fer demà al Vallès Occidental",
      },
    ],
  },
  {
    id: "local-agendas",
    title: "Agendes locals més visitades",
    links: TOP_AGENDA_LINKS,
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
    title: "Agenda del Maresme",
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
        seoLinkSections={homeSeoLinkSections}
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
  const homepageEvents = filterActiveEvents(Object.values(categorizedEvents).flat());

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
