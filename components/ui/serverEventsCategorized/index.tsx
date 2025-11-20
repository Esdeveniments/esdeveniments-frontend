import { Suspense } from "react";
import { captureException } from "@sentry/nextjs";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import {
  SpeakerphoneIcon,
  SparklesIcon,
  ShoppingBagIcon,
  EmojiHappyIcon,
  MusicNoteIcon,
  TicketIcon,
  PhotographIcon,
} from "@heroicons/react/outline";
import Badge from "@components/ui/common/badge";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import AdArticle from "@components/ui/adArticle";
import Search from "@components/ui/search";
import SectionHeading from "@components/ui/common/SectionHeading";
import { SearchSkeleton } from "@components/ui/common/skeletons";
import { fetchEvents } from "@lib/api/events";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import { buildCanonicalUrl } from "@utils/url-filters";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type {
  FeaturedPlaceConfig,
  ServerEventsCategorizedProps,
} from "types/props";
import { formatCatalanDe } from "@utils/helpers";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { computeTemporalStatus } from "@utils/event-status";
import type { CategorySummaryResponseDTO } from "types/api/category";

const PRIORITY_CATEGORY_SLUGS = [
  "festes-populars",
  "fires-i-mercats",
  "familia-i-infants",
  "musica",
  "teatre",
] as const;

const PRIORITY_CATEGORY_ORDER = new Map(
  PRIORITY_CATEGORY_SLUGS.map((slug, index) => [slug, index])
);

const MAX_CATEGORY_SECTIONS = 5;

const QUICK_CATEGORY_LINKS = [
  {
    label: "Festes Majors",
    url: "/catalunya/festes-populars",
    Icon: SparklesIcon,
  },
  {
    label: "Fires i Mercats",
    url: "/catalunya/fires-i-mercats",
    Icon: ShoppingBagIcon,
  },
  {
    label: "Amb Nens",
    url: "/catalunya/familia-i-infants",
    Icon: EmojiHappyIcon,
  },
  { label: "Concerts", url: "/catalunya/musica", Icon: MusicNoteIcon },
  { label: "Teatre", url: "/catalunya/teatre", Icon: TicketIcon },
  { label: "Exposicions", url: "/catalunya/exposicions", Icon: PhotographIcon },
] as const;

// --- HELPER: Extracting the filtering logic to avoid duplication ---
const filterActiveEvents = (events: ListEvent[]): EventSummaryResponseDTO[] => {
  return events.filter(isEventSummaryResponseDTO).filter((event) => {
    const status = computeTemporalStatus(
      event.startDate,
      event.endDate,
      undefined,
      event.startTime,
      event.endTime
    );
    return status.state !== "past";
  });
};

const resolveCategoryDetails = (
  categoryKey: string,
  firstEvent: EventSummaryResponseDTO | undefined,
  allCategories: CategorySummaryResponseDTO[] | undefined
): { categoryName: string; categorySlug: string } => {
  const safeToLowerCase = (value: unknown): string => {
    if (typeof value !== "string" || !value) return "";
    return value.toLowerCase();
  };

  const normalizedKey = safeToLowerCase(categoryKey);

  // Helper function to find a matching category in an array
  const findMatchingCategory = (
    categories: Array<{ name?: string; slug?: string }>
  ): { name: string; slug: string } | undefined => {
    const found = categories.find((cat) => {
      if (!cat?.name || !cat.slug) return false;
      const catName = safeToLowerCase(cat.name);
      const catSlug = safeToLowerCase(cat.slug);
      return catName === normalizedKey || catSlug === normalizedKey;
    });
    if (found?.name && found.slug) {
      return { name: found.name, slug: found.slug };
    }
    return undefined;
  };

  if (firstEvent?.categories?.length) {
    const matchingCategory = findMatchingCategory(firstEvent.categories);
    if (matchingCategory) {
      return {
        categoryName: matchingCategory.name,
        categorySlug: matchingCategory.slug,
      };
    }
    const firstValid = firstEvent.categories.find(
      (cat) => cat?.name && cat.slug
    );
    if (firstValid) {
      return {
        categoryName: firstValid.name,
        categorySlug: firstValid.slug,
      };
    }
  }

  if (allCategories?.length) {
    const matchingCategory = findMatchingCategory(allCategories);
    if (matchingCategory) {
      return {
        categoryName: matchingCategory.name,
        categorySlug: matchingCategory.slug,
      };
    }
  }

  const safeCategory = typeof categoryKey === "string" ? categoryKey : "";
  const categoryName =
    safeCategory.length > 0
      ? safeCategory.charAt(0).toUpperCase() +
        safeCategory.slice(1).replace(/-/g, " ")
      : "";
  return {
    categoryName,
    categorySlug: safeCategory,
  };
};

// --- MAIN COMPONENT ---
function ServerEventsCategorized({
  pageData,
  seoTopTownLinks = [],
  ...contentProps
}: ServerEventsCategorizedProps) {
  return (
    <div className="w-full bg-background">
      {/* 1. INSTANT RENDER: SEARCH & HEADER */}
      <div className="bg-background sticky top-0 z-30 shadow-sm py-element-gap px-section-x">
        <div className="container">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
      </div>

      <div className="container pt-section-y">
        {pageData && (
          <>
            <h1 className="heading-1 mb-2">{pageData.title}</h1>
            <p className="body-large text-foreground/70 text-left">
              {pageData.subTitle}
            </p>
          </>
        )}
      </div>

      {/* 2. INSTANT RENDER: QUICK CATEGORIES */}
      <section className="py-section-y container border-b">
        <SectionHeading
          title="Explora per interessos"
          titleClassName="heading-2 text-foreground mb-element-gap"
        />
        <div className="grid grid-cols-2 gap-element-gap sm:flex sm:flex-row sm:flex-nowrap sm:gap-4 sm:overflow-x-auto sm:pb-2">
          {QUICK_CATEGORY_LINKS.map(({ label, url, Icon }) => (
            <PressableAnchor
              key={url}
              href={url}
              prefetch={false}
              variant="plain"
              className="btn-category h-full w-full text-sm sm:w-auto whitespace-nowrap"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Icon
                  className="w-5 h-5 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{label}</span>
              </span>
            </PressableAnchor>
          ))}
        </div>
      </section>

      {/* 3. STREAMED CONTENT: HEAVY FETCHING */}
      <Suspense fallback={<ServerEventsCategorizedFallback />}>
        <ServerEventsCategorizedContent
          {...contentProps}
          seoTopTownLinks={seoTopTownLinks}
        />
      </Suspense>
    </div>
  );
}

export async function ServerEventsCategorizedContent({
  categorizedEventsPromise,
  categoriesPromise,
  featuredPlaces,
  seoTopTownLinks = [],
}: ServerEventsCategorizedProps) {
  // 1. Prepare Safe Promises
  const safeCategoriesPromise = (
    categoriesPromise || Promise.resolve([])
  ).catch((err) => {
    captureException(err, { tags: { section: "categories-fetch" } });
    return [] as CategorySummaryResponseDTO[];
  });

  const safeCategorizedEventsPromise = categorizedEventsPromise.catch((err) => {
    captureException(err, { tags: { section: "categorized-events-fetch" } });
    return {};
  });

  // 2. Prepare Featured Places Promises
  const featuredSectionsPromise = featuredPlaces
    ? Promise.all(
        featuredPlaces.map(async (placeConfig, index) => {
          const placeSlug =
            placeConfig.filter.city ||
            placeConfig.filter.region ||
            placeConfig.filter.place ||
            placeConfig.slug;

          if (!placeSlug) return null;

          try {
            const response = await fetchEvents({
              place: placeSlug,
              page: 0,
              size: 6,
            });

            const events = filterActiveEvents(response.content);

            if (events.length === 0) return null;

            return {
              ...placeConfig,
              events,
              placeSlug,
              usePriority: index < 2,
            };
          } catch (error) {
            captureException(error, {
              extra: {
                placeSlug,
                section: "featuredPlaces",
              },
            });
            return null;
          }
        })
      )
    : Promise.resolve<(FeaturedPlaceConfig | null)[]>([]);

  // 3. Parallel Execution
  const [categorizedEvents, categories, rawFeaturedSections] =
    await Promise.all([
      safeCategorizedEventsPromise,
      safeCategoriesPromise,
      featuredSectionsPromise,
    ]);

  // 4. Processing
  const featuredSections = rawFeaturedSections.filter(
    (
      s
    ): s is FeaturedPlaceConfig & {
      events: EventSummaryResponseDTO[];
      placeSlug: string;
      usePriority: boolean;
    } => s !== null
  );

  const filteredCategorizedEvents = Object.entries(categorizedEvents).reduce(
    (acc, [category, events]) => {
      const activeEvents = filterActiveEvents(events);
      if (activeEvents.length > 0) {
        acc[category] = activeEvents;
      }
      return acc;
    },
    {} as Record<string, EventSummaryResponseDTO[]>
  );

  const categorySections = Object.entries(filteredCategorizedEvents).map(
    ([category, events]) => {
      const firstEvent = events[0]; // Safe because we checked length > 0
      const { categoryName, categorySlug } = resolveCategoryDetails(
        category,
        firstEvent,
        categories
      );
      const normalizedSlug = categorySlug?.toLowerCase() ?? "";

      return {
        key: category,
        events,
        categoryName,
        categorySlug,
        normalizedSlug,
        categoryPhrase: formatCatalanDe(categoryName, true, true),
      };
    }
  );

  // Sort by priority
  const prioritizedSections: typeof categorySections = [];
  const otherSections: typeof categorySections = [];

  for (const section of categorySections) {
    if (
      section.normalizedSlug &&
      PRIORITY_CATEGORY_ORDER.has(
        section.normalizedSlug as (typeof PRIORITY_CATEGORY_SLUGS)[number]
      )
    ) {
      prioritizedSections.push(section);
    } else {
      otherSections.push(section);
    }
  }

  prioritizedSections.sort(
    (a, b) =>
      PRIORITY_CATEGORY_ORDER.get(
        a.normalizedSlug as (typeof PRIORITY_CATEGORY_SLUGS)[number]
      )! -
      PRIORITY_CATEGORY_ORDER.get(
        b.normalizedSlug as (typeof PRIORITY_CATEGORY_SLUGS)[number]
      )!
  );

  const categorySectionsToRender = [
    ...prioritizedSections,
    ...otherSections,
  ].slice(0, MAX_CATEGORY_SECTIONS);

  const hasEvents =
    categorySectionsToRender.length > 0 || featuredSections.length > 0;

  if (!hasEvents) {
    return <NoEventsFound />;
  }

  // Ad Logic
  const adPositions = new Set<number>();
  for (let i = 1; i < categorySectionsToRender.length; i += 3) {
    adPositions.add(i);
  }
  if (categorySectionsToRender.length > 3) {
    adPositions.add(categorySectionsToRender.length - 1);
  }

  return (
    <>
      {/* Featured Places Render */}
      {featuredSections.length > 0 && (
        <div className="container">
          {featuredSections.map((section) => (
            <section key={section.slug} className="py-section-y border-b">
              <div className="flex-between gap-element-gap">
                <div className="stack gap-1">
                  <h2 className="heading-2">{section.title}</h2>
                  {section.subtitle && (
                    <p className="body-small text-foreground/70">
                      {section.subtitle}
                    </p>
                  )}
                </div>
                <PressableAnchor
                  href={`/${section.slug}`}
                  className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
                  prefetch={false}
                  variant="inline"
                >
                  Veure més
                  <ChevronRightIcon className="w-5 h-5" />
                </PressableAnchor>
              </div>

              <nav
                aria-label={`Explora ${section.title} per data`}
                className="mt-element-gap-sm mb-element-gap-sm"
              >
                <ul className="flex gap-element-gap">
                  <li>
                    <Badge
                      href={`/${section.slug}/avui`}
                      ariaLabel={`Veure activitats d'avui a ${section.title}`}
                    >
                      Avui
                    </Badge>
                  </li>
                  <li>
                    <Badge
                      href={`/${section.slug}/dema`}
                      ariaLabel={`Veure activitats de demà a ${section.title}`}
                    >
                      Demà
                    </Badge>
                  </li>
                  <li>
                    <Badge
                      href={`/${section.slug}/cap-de-setmana`}
                      ariaLabel={`Veure activitats aquest cap de setmana a ${section.title}`}
                    >
                      Cap de setmana
                    </Badge>
                  </li>
                </ul>
              </nav>

              <EventsAroundServer
                events={section.events}
                layout="horizontal"
                usePriority={section.usePriority}
                showJsonLd
                title={section.title}
                jsonLdId={`featured-events-${section.slug}`}
              />
            </section>
          ))}
        </div>
      )}

      {/* Categories Render */}
      <div className="container">
        {categorySectionsToRender.map((section, index) => {
          const shouldUsePriority = index < 2;
          return (
            <section key={section.key} className="py-section-y border-b">
              <div className="flex justify-between items-center">
                <h2 className="heading-2">
                  L&apos;agenda {section.categoryPhrase} a Catalunya
                </h2>
                <PressableAnchor
                  href={buildCanonicalUrl(
                    {
                      place: "catalunya",
                      byDate: DEFAULT_FILTER_VALUE,
                      category: section.categorySlug,
                    },
                    categories
                  )}
                  className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
                  prefetch={false}
                  variant="inline"
                >
                  Veure més <ChevronRightIcon className="w-5 h-5" />
                </PressableAnchor>
              </div>

              <nav
                aria-label="Vegeu també"
                className="mt-element-gap-sm mb-element-gap-sm"
              >
                <ul className="flex gap-element-gap">
                  <li>
                    <Badge
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: "avui",
                          category: section.categorySlug,
                        },
                        categories
                      )}
                      ariaLabel={`Veure activitats d'avui per la categoria ${section.categoryName}`}
                    >
                      Avui
                    </Badge>
                  </li>
                  <li>
                    <Badge
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: "dema",
                          category: section.categorySlug,
                        },
                        categories
                      )}
                      ariaLabel={`Veure activitats de demà per la categoria ${section.categoryName}`}
                    >
                      Demà
                    </Badge>
                  </li>
                  <li>
                    <Badge
                      href={buildCanonicalUrl(
                        {
                          place: "catalunya",
                          byDate: "cap-de-setmana",
                          category: section.categorySlug,
                        },
                        categories
                      )}
                      ariaLabel={`Veure activitats aquest cap de setmana per la categoria ${section.categoryName}`}
                    >
                      Cap de setmana
                    </Badge>
                  </li>
                </ul>
              </nav>

              <EventsAroundServer
                events={section.events}
                layout="horizontal"
                usePriority={shouldUsePriority}
                showJsonLd={true}
                title={section.categoryName}
                jsonLdId={`category-events-${section.categorySlug}`}
              />

              {adPositions.has(index) && (
                <div className="w-full flex flex-col items-start mt-element-gap mb-element-gap-sm max-w-lg">
                  <div className="flex items-center gap-2 mb-element-gap">
                    <SpeakerphoneIcon className="w-5 h-5 text-foreground-strong flex-shrink-0" />
                    <h2 className="heading-2">Contingut patrocinat</h2>
                  </div>
                  <div className="w-full">
                    <AdArticle slot="8139041285" />
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* SEO Links */}
      {seoTopTownLinks.length > 0 && (
        <section className="py-section-y container">
          <SectionHeading
            title="Agendes locals més visitades"
            titleClassName="heading-2 text-foreground mb-element-gap"
          />
          <div className="grid grid-cols-3 gap-element-gap mt-element-gap">
            {seoTopTownLinks.map((link) => (
              <PressableAnchor
                key={link.href}
                href={link.href}
                prefetch={false}
                variant="plain"
                className="body-small text-foreground/80 hover:text-primary hover:underline font-medium transition-interactive"
              >
                {link.label}
              </PressableAnchor>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-section-y container text-center">
        <p className="body-large text-foreground/70 font-medium mb-element-gap">
          No trobes el que busques?
        </p>
        <PressableAnchor
          href="/catalunya"
          prefetch={false}
          variant="plain"
          className="btn-primary w-full sm:w-auto"
        >
          Veure tota l&apos;agenda
        </PressableAnchor>
      </section>
    </>
  );
}

export default ServerEventsCategorized;

function ServerEventsCategorizedFallback() {
  return (
    <div className="container py-section-y animate-pulse">
      <div className="space-y-6">
        <div className="h-7 w-56 rounded bg-foreground/10" />
        <div className="h-5 w-2/3 rounded bg-foreground/10" />
        <div className="grid gap-element-gap md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-4 rounded-lg border p-6">
              <div className="h-6 w-40 rounded bg-foreground/10" />
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
              <div className="h-32 rounded bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
