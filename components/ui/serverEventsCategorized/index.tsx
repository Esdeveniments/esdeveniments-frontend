import { Suspense } from "react";
import { captureException } from "@sentry/nextjs";
import dynamic from "next/dynamic";
import {
  SparklesIcon,
  ShoppingBagIcon,
  EmojiHappyIcon,
  MusicNoteIcon,
  TicketIcon,
  PhotographIcon,
} from "@heroicons/react/outline";
import SectionHeading from "@components/ui/common/SectionHeading";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type {
  FeaturedPlaceConfig,
  ServerEventsCategorizedContentProps,
  ServerEventsCategorizedProps,
} from "types/props";
import { formatCatalanDe } from "@utils/helpers";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { CategorySummaryResponseDTO } from "types/api/category";
import {
  CATEGORY_CONFIG,
  PRIORITY_CATEGORY_SLUGS,
  MAX_CATEGORY_SECTIONS,
} from "@config/categories";
import { filterActiveEvents } from "@utils/event-helpers";
import { FeaturedPlaceSection } from "./FeaturedPlaceSection";
import { CategoryEventsSection } from "./CategoryEventsSection";
import HeroSectionSkeleton from "../hero/HeroSectionSkeleton";

// Enable streaming with Suspense; dynamic typing doesn’t yet expose `suspense`.
const HeroSection = (dynamic as any)(
  () => import("../hero/HeroSection"),
  { suspense: true }
);

/**
 * Icon mapping for categories.
 * Icons are kept in the component to avoid React component dependencies in config files.
 */
const CATEGORY_ICONS: Record<string, typeof SparklesIcon> = {
  "festes-populars": SparklesIcon,
  "fires-i-mercats": ShoppingBagIcon,
  "familia-i-infants": EmojiHappyIcon,
  musica: MusicNoteIcon,
  teatre: TicketIcon,
  exposicions: PhotographIcon,
} as const;

/**
 * Map for efficient priority ordering lookup.
 * Maps priority category slugs to their display index.
 */
const PRIORITY_CATEGORY_ORDER = new Map(
  PRIORITY_CATEGORY_SLUGS.map((slug, index) => [slug, index])
);

/**
 * Quick category links for the homepage navigation.
 * Combines category config (from shared config) with icons (component-specific).
 */
const QUICK_CATEGORY_LINKS = Object.entries(CATEGORY_CONFIG).map(
  ([slug, config]) => ({
    label: config.label,
    url: `/catalunya/${slug}`,
    Icon: CATEGORY_ICONS[slug] || SparklesIcon, // Fallback icon
  })
);

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
      {/* 1. HERO SECTION: Search + Location + Dates */}
      <div className="bg-background border-b border-border/40 pb-8 pt-4">
        <div className="container">
          <Suspense fallback={<HeroSectionSkeleton />}>
            <HeroSection subTitle={pageData?.subTitle} />
          </Suspense>
        </div>
      </div>

      {/* 2. TOP LOCATIONS (Moved from bottom) */}
      {seoTopTownLinks.length > 0 && (
        <div className="container py-8 border-b border-border/40">
          <div className="flex flex-col gap-4">
            <SectionHeading
              title="Poblacions més buscades"
              titleClassName="heading-2 text-foreground mb-element-gap"
            />
            <div className="flex flex-wrap gap-2">
              {seoTopTownLinks.map((link) => (
                <PressableAnchor
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  variant="plain"
                  className="px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  {link.label.replace("Agenda ", "")}
                </PressableAnchor>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. QUICK CATEGORIES */}
      <section className="py-section-y container border-b">
        <SectionHeading
          title="Explora per interessos"
          titleClassName="heading-2 text-foreground mb-element-gap"
        />
        <div className="grid grid-cols-2 gap-element-gap sm:flex sm:flex-row sm:flex-nowrap sm:gap-4 sm:overflow-x-auto sm:py-2 sm:px-2 sm:-mx-2">
          {QUICK_CATEGORY_LINKS.map(({ label, url, Icon }) => (
            <PressableAnchor
              key={url}
              href={url}
              prefetch={false}
              variant="plain"
              className="btn-category h-full w-full text-xs sm:w-auto whitespace-nowrap"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Icon
                  className="w-5 h-5 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </span>
            </PressableAnchor>
          ))}
        </div>
      </section>

      {/* 4. STREAMED CONTENT: HEAVY FETCHING */}
      <Suspense fallback={<ServerEventsCategorizedFallback />}>
        <ServerEventsCategorizedContent
          {...contentProps}
        />
      </Suspense>
    </div>
  );
}

export async function ServerEventsCategorizedContent({
  categorizedEventsPromise,
  categoriesPromise,
  featuredPlaces,
}: ServerEventsCategorizedContentProps) {
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
            <FeaturedPlaceSection key={section.slug} section={section} />
          ))}
        </div>
      )}

      {/* Categories Render */}
      <div className="container">
        {categorySectionsToRender.map((section, index) => (
          <CategoryEventsSection
            key={section.key}
            events={section.events}
            categoryName={section.categoryName}
            categorySlug={section.categorySlug}
            categoryPhrase={section.categoryPhrase}
            categories={categories}
            shouldUsePriority={index < 2}
            showAd={adPositions.has(index)}
          />
        ))}
      </div>



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
