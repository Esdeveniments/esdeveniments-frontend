import { Suspense } from "react";
import type { JSX } from "react";
import { locale as rootLocale } from "next/root-params";
import { getTranslations } from "next-intl/server";
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
import HomePageSkeleton from "@components/ui/common/skeletons/HomePageSkeleton";

export async function generateMetadata() {
  const pageData: PageData = await generatePagesData({
    place: "",
    byDate: "",
  });
  const locale = (await rootLocale()) as AppLocale;
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

export default function Page(): JSX.Element {
  // Sync: every dynamic access lives in Suspense-wrapped children so the
  // static shell (link preload) flushes in chunk 0.
  const localePromise = rootLocale() as Promise<AppLocale>;
  const categorizedEventsPromise = getCategorizedEvents(5);
  const categoriesPromise = fetchCategories();
  const pageDataPromise = generatePagesData({ place: "", byDate: "" });
  const tHomePromise = localePromise.then((locale) =>
    getTranslations({ locale, namespace: "App.Home" })
  );
  const tTopAgendaPromise = localePromise.then((locale) =>
    getTranslations({ locale, namespace: "Config.TopAgenda" })
  );

  return (
    <>
      {/* Preload LCP hero image — React 19 hoists <link> to <head> automatically.
          Kept in the sync shell so the browser starts the fetch from the first chunk. */}
      <link
        rel="preload"
        as="image"
        href="/static/images/hero-castellers.webp"
        type="image/webp"
        fetchPriority="high"
      />

      {/* SEO copy for crawlers without JS. Locale-dependent, so it streams in
          the first Suspense boundary — resolves as soon as rootLocale does. */}
      <Suspense fallback={null}>
        <HomeNoScript localePromise={localePromise} />
      </Suspense>

      {/* Structured data streams independently — waits for events + pageData. */}
      <Suspense fallback={null}>
        <HomeStructuredData
          categorizedEventsPromise={categorizedEventsPromise}
          pageDataPromise={pageDataPromise}
          localePromise={localePromise}
        />
      </Suspense>

      {/* Main content streams when pageData + translations resolve. */}
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeContent
          localePromise={localePromise}
          pageDataPromise={pageDataPromise}
          tHomePromise={tHomePromise}
          tTopAgendaPromise={tTopAgendaPromise}
          categorizedEventsPromise={categorizedEventsPromise}
          categoriesPromise={categoriesPromise}
        />
      </Suspense>
    </>
  );
}

async function HomeNoScript({
  localePromise,
}: Readonly<{
  localePromise: Promise<AppLocale>;
}>): Promise<JSX.Element> {
  const locale = await localePromise;
  return (
    <noscript>
      <div>
        <p>
          {locale === "es"
            ? "Esdeveniments.cat es la plataforma gratuita más completa para descubrir eventos culturales en Cataluña. Consulta la agenda de conciertos, teatro, exposiciones, festivales, actividades familiares y más en más de 900 municipios catalanes. Encuentra qué hacer hoy, mañana o este fin de semana cerca de ti."
            : locale === "en"
              ? "Esdeveniments.cat is the most comprehensive free platform for discovering cultural events across Catalonia. Browse concerts, theatre, exhibitions, festivals, family activities, and more across 900+ Catalan municipalities. Find what to do today, tomorrow, or this weekend near you."
              : "Esdeveniments.cat és la plataforma gratuïta més completa per descobrir esdeveniments culturals a Catalunya. Consulta l'agenda de concerts, teatre, exposicions, festivals, activitats familiars i molt més en més de 900 municipis catalans. Troba què fer avui, demà o aquest cap de setmana a prop teu."}
        </p>
        <p>
          {locale === "es"
            ? "API pública gratuita disponible en /llms.txt y /openapi.json — sin autenticación necesaria."
            : locale === "en"
              ? "Free public API available at /llms.txt and /openapi.json — no authentication required."
              : "API pública gratuïta disponible a /llms.txt i /openapi.json — sense autenticació necessària."}
        </p>
      </div>
    </noscript>
  );
}

async function HomeContent({
  localePromise,
  pageDataPromise,
  tHomePromise,
  tTopAgendaPromise,
  categorizedEventsPromise,
  categoriesPromise,
}: Readonly<{
  localePromise: Promise<AppLocale>;
  pageDataPromise: Promise<PageData>;
  tHomePromise: ReturnType<typeof getTranslations>;
  tTopAgendaPromise: ReturnType<typeof getTranslations>;
  categorizedEventsPromise: Promise<CategorizedEvents>;
  categoriesPromise: Promise<Awaited<ReturnType<typeof fetchCategories>>>;
}>): Promise<JSX.Element> {
  const [locale, t, tTopAgenda, pageData] = await Promise.all([
    localePromise,
    tHomePromise,
    tTopAgendaPromise,
    pageDataPromise,
  ]);
  const agendaLabel = tTopAgenda("agenda");

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
        {
          href: "/baix-llobregat/dema",
          label: t("seoSections.tomorrow.links.baixLlobregat"),
        },
        {
          href: "/valles-oriental/dema",
          label: t("seoSections.tomorrow.links.vallesOriental"),
        },
      ],
    },
  ];

  const localAgendasSection: SeoLinkSection = {
    id: "local-agendas",
    title: t("seoSections.localAgendas.title"),
    links: TOP_AGENDA_LINKS.map((link) => ({
      href: link.href,
      label: `${agendaLabel} ${link.name}`,
    })),
  };

  const homeNavigationItems: NavigationItem[] = [
    ...homeSeoLinkSections,
    localAgendasSection,
  ].flatMap((section) =>
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
    generateSiteNavigationElementSchema(homeNavigationItems, locale);

  return (
    <>
      {/* SEO: visible H1 for crawlers and AI agents */}
      <h1 className="sr-only">{pageData.title}</h1>

      {siteNavigationSchema && (
        <JsonLdServer id="site-navigation" data={siteNavigationSchema} />
      )}

      <ServerEventsCategorized
        categorizedEventsPromise={categorizedEventsPromise}
        pageData={pageData}
        categoriesPromise={categoriesPromise}
        featuredPlaces={featuredPlaceSections}
        seoLinkSections={homeSeoLinkSections}
        localAgendasSection={localAgendasSection}
      />
    </>
  );
}

async function HomeStructuredData({
  categorizedEventsPromise,
  pageDataPromise,
  localePromise,
}: Readonly<{
  categorizedEventsPromise: Promise<CategorizedEvents>;
  pageDataPromise: Promise<PageData>;
  localePromise: Promise<AppLocale>;
}>): Promise<JSX.Element> {
  const [categorizedEvents, pageData, locale] = await Promise.all([
    categorizedEventsPromise,
    pageDataPromise,
    localePromise,
  ]);
  const allEvents = filterActiveEvents(Object.values(categorizedEvents).flat());

  // Deduplicate: the same event can appear in multiple categories
  const seen = new Set<string>();
  const homepageEvents = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const itemListSchema =
    homepageEvents.length > 0
      ? generateItemListStructuredData(
        homepageEvents,
        pageData.title,
        pageData.subTitle,
        locale,
        pageData.canonical
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
