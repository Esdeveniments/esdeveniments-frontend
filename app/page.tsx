import { Suspense } from "react";
import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
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
import type { AppLocale } from "types/i18n";
import { CategorizedEvents } from "types/api/event";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import type { FeaturedPlaceConfig, SeoLinkSection } from "types/props";
import { filterActiveEvents } from "@utils/event-helpers";
import { TOP_AGENDA_LINKS } from "@config/top-agenda-links";
import { resolveLocaleFromHeaders } from "@utils/i18n-seo";

export const revalidate = 300;

export async function generateMetadata() {
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });
  const locale = resolveLocaleFromHeaders(await headers());
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

export default async function Page(): Promise<JSX.Element> {
  const locale: AppLocale = resolveLocaleFromHeaders(await headers());
  const categorizedEventsPromise = getCategorizedEvents(5);
  const categoriesPromise = fetchCategories();
  const t = await getTranslations("App.Home");
  const tTopAgenda = await getTranslations("Config.TopAgenda");
  const agendaLabel = tTopAgenda("agenda");

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  const homeSeoLinkSections: SeoLinkSection[] = [
    {
      id: "weekend",
      title: t("seoSections.weekend.title"),
      links: [
        { href: "/catalunya/cap-de-setmana", label: t("seoSections.weekend.links.topPlans") },
        {
          href: "/catalunya/cap-de-setmana/festes-populars",
          label: t("seoSections.weekend.links.popularFestes"),
        },
        {
          href: "/catalunya/cap-de-setmana/familia-i-infants",
          label: t("seoSections.weekend.links.family"),
        },
        {
          href: "/catalunya/cap-de-setmana/musica",
          label: t("seoSections.weekend.links.music"),
        },
      ],
    },
    {
      id: "today",
      title: t("seoSections.today.title"),
      links: [
        { href: "/barcelona/avui", label: t("seoSections.today.links.barcelona") },
        { href: "/maresme/avui", label: t("seoSections.today.links.maresme") },
        {
          href: "/valles-oriental/avui",
          label: t("seoSections.today.links.vallesOriental"),
        },
        { href: "/mataro/avui", label: t("seoSections.today.links.mataro") },
      ],
    },
    {
      id: "tomorrow",
      title: t("seoSections.tomorrow.title"),
      links: [
        { href: "/barcelona/dema", label: t("seoSections.tomorrow.links.barcelona") },
        { href: "/maresme/dema", label: t("seoSections.tomorrow.links.maresme") },
        {
          href: "/valles-occidental/dema",
          label: t("seoSections.tomorrow.links.vallesOccidental"),
        },
      ],
    },
    {
      id: "local-agendas",
      title: t("seoSections.localAgendas.title"),
      links: TOP_AGENDA_LINKS.map((link) => ({
        href: link.href,
        label: `${agendaLabel} ${link.name}`,
      })),
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
      title: t("featuredPlaces.barcelona.title"),
      subtitle: t("featuredPlaces.barcelona.subtitle"),
      slug: "barcelona",
      filter: { city: "barcelona" },
    },
    {
      title: t("featuredPlaces.maresme.title"),
      subtitle: t("featuredPlaces.maresme.subtitle"),
      slug: "maresme",
      filter: { region: "maresme" },
    },
    {
      title: t("featuredPlaces.vallesOccidental.title"),
      slug: "valles-occidental",
      filter: { region: "valles-occidental" },
    },
  ];

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
          locale={locale}
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
  locale,
}: {
  categorizedEventsPromise: Promise<CategorizedEvents>;
  pageData: PageData;
  locale: AppLocale;
}): Promise<JSX.Element> {
  const categorizedEvents = await categorizedEventsPromise;
  const homepageEvents = filterActiveEvents(Object.values(categorizedEvents).flat());

  const itemListSchema =
    homepageEvents.length > 0
      ? generateItemListStructuredData(
        homepageEvents,
        pageData.title,
        pageData.subTitle,
        locale
      )
      : null;

  const webPageSchema = generateWebPageSchema({
    title: pageData.title,
    description: pageData.metaDescription,
    url: pageData.canonical,
    mainContentOfPage: itemListSchema || undefined,
    locale,
  });

  const collectionSchema =
    homepageEvents.length > 0
      ? generateCollectionPageSchema({
        title: pageData.title,
        description: pageData.metaDescription,
        url: pageData.canonical,
        numberOfItems: homepageEvents.length,
        mainEntity: itemListSchema || undefined,
        locale,
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
