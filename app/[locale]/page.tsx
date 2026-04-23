import { Suspense, use } from "react";
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

export async function generateMetadata() {
  const locale = (await rootLocale()) as AppLocale;
  const pageData: PageData = await generatePagesData({
    place: "",
    byDate: "",
    locale,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

// PPR static shell fallback: rendered into prerendered HTML per locale.
// Locale-specific text ensures the static shell matches <html lang="..."> and
// avoids a language mismatch for crawlers and SEO tools that don't execute JS.
const STATIC_FALLBACK_CONTENT: Record<
  AppLocale,
  { h1: string; h2: string; description: string; apiNote: string }
> = {
  ca: {
    h1: "Què fer a Catalunya - Agenda cultural i plans",
    h2: "Agenda cultural a Catalunya amb concerts, exposicions, teatre, activitats familiars i plans per a totes les edats.",
    description:
      "Esdeveniments.cat és la plataforma gratuïta més completa per descobrir esdeveniments culturals a Catalunya. Consulta l'agenda de concerts, teatre, exposicions, festivals, activitats familiars i molt més en més de 900 municipis catalans. Troba què fer avui, demà o aquest cap de setmana a prop teu.",
    apiNote:
      "API pública gratuïta disponible a /llms.txt i /openapi.json — sense autenticació necessària.",
  },
  es: {
    h1: "Qué hacer en Cataluña - Agenda cultural y planes",
    h2: "Agenda cultural en Cataluña con conciertos, exposiciones, teatro, actividades familiares y planes para todas las edades.",
    description:
      "Esdeveniments.cat es la plataforma gratuita más completa para descubrir eventos culturales en Cataluña. Consulta la agenda de conciertos, teatro, exposiciones, festivales, actividades familiares y mucho más en más de 900 municipios catalanes. Encuentra qué hacer hoy, mañana o este fin de semana cerca de ti.",
    apiNote:
      "API pública gratuita disponible en /llms.txt y /openapi.json — sin autenticación necesaria.",
  },
  en: {
    h1: "What to do in Catalonia - Cultural agenda and plans",
    h2: "Cultural agenda in Catalonia with concerts, exhibitions, theater, family activities and plans for all ages.",
    description:
      "Esdeveniments.cat is the most complete free platform to discover cultural events in Catalonia. Browse the agenda of concerts, theater, exhibitions, festivals, family activities and more across 900+ Catalan municipalities. Find what to do today, tomorrow or this weekend near you.",
    apiNote:
      "Free public API available at /llms.txt and /openapi.json — no authentication required.",
  },
};

function HomeStaticFallback({ locale }: { locale: AppLocale }) {
  const content = STATIC_FALLBACK_CONTENT[locale] ?? STATIC_FALLBACK_CONTENT.ca;
  return (
    <>
      <h1 className="sr-only">{content.h1}</h1>
      {/* API doc links — visible to crawlers for agent discovery (orank public-api-docs check).
          Uses <a> not <Link> because these are machine-readable file URLs, not navigable pages. */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <nav aria-label="Developer resources" className="sr-only">
        <a href="/openapi.json">API Documentation (OpenAPI)</a>
        <a href="/llms.txt">LLM Integration Guide</a>
        <a href="/api/llms.txt">API Reference</a>
        <a href="/.well-known/mcp">MCP Server</a>
      </nav>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
      <noscript>
        <div>
          <h2>{content.h2}</h2>
          <p data-speakable="description">{content.description}</p>
          <p>{content.apiNote}</p>
          <p>
            <a href="/openapi.json">API Documentation (OpenAPI)</a>
            {" · "}
            <a href="/llms.txt">LLM Integration Guide</a>
          </p>
        </div>
      </noscript>
    </>
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const appLocale = locale as AppLocale;

  return (
    <>
      {/* Preload LCP hero image — React 19 hoists <link> to <head> automatically */}
      <link
        rel="preload"
        as="image"
        href="/static/images/hero-castellers.webp"
        type="image/webp"
        fetchPriority="high"
      />

      <Suspense fallback={<HomeStaticFallback locale={appLocale} />}>
        <HomeContent locale={appLocale} />
      </Suspense>
    </>
  );
}

async function HomeContent({
  locale,
}: {
  locale: AppLocale;
}): Promise<JSX.Element> {
  const categorizedEventsPromise = getCategorizedEvents(5);
  const categoriesPromise = fetchCategories();

  // Parallelize independent operations to eliminate waterfall (3 calls → 1 round trip)
  const [t, tTopAgenda, pageData] = await Promise.all([
    getTranslations({ locale, namespace: "App.Home" }),
    getTranslations({ locale, namespace: "Config.TopAgenda" }),
    generatePagesData({ place: "", byDate: "", locale }),
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

  // Local agendas section — rendered lower on the page (after carousels, before CTA)
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
      {/* h1 is duplicated in HomeContent so that after the Suspense fallback is
          replaced by the streamed content, the final DOM still contains the h1
          (important for SEO crawlers that execute JS and for accessibility).
          The <noscript> stays in HomeStaticFallback only — it is prerendered
          in the PPR static shell and is what JS-less crawlers see. */}
      <h1 className="sr-only">{pageData.title}</h1>

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
        localAgendasSection={localAgendasSection}
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
    speakableCssSelectors: ["h1", "[data-speakable='description']"],
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
