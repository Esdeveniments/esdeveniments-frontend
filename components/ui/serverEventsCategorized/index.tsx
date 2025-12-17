import { Suspense } from "react";
import { captureException } from "@sentry/nextjs";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
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
  SeoLinkSection,
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
import { createDateFilterBadgeLabels } from "./DateFilterBadges";
import HeroSectionSkeleton from "../hero/HeroSectionSkeleton";
import { getLocaleSafely } from "@utils/i18n-seo";
import { DEFAULT_LOCALE } from "types/i18n";

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
async function ServerEventsCategorized({
  pageData,
  seoLinkSections = [],
  ...contentProps
}: ServerEventsCategorizedProps) {
  const locale = await getLocaleSafely();
  const tCategories = await getTranslations({
    locale,
    namespace: "Config.Categories",
  });
  const tServerCategories = await getTranslations({
    locale,
    namespace: "Components.ServerEventsCategorized",
  });
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!prefix) return path;
    if (path === "/") return prefix;
    if (path.startsWith(prefix)) return path;
    return `${prefix}${path}`;
  };

  const renderedLinkSections = seoLinkSections.filter(
    (section): section is SeoLinkSection =>
      Boolean(section?.links && section.links.length > 0)
  );

  const formatLinkLabel = (sectionId: string, label: string) => {
    if (sectionId === "local-agendas") {
      return label.replace(/^Agenda\s+/i, "");
    }
    return label;
  };

  const quickCategoryLinks = Object.entries(CATEGORY_CONFIG).map(
    ([slug, config]) => ({
      label: tCategories(config.labelKey),
      url: withLocale(`/catalunya/${slug}`),
      Icon: CATEGORY_ICONS[slug] || SparklesIcon,
    })
  );

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

      {/* 2. SEO LINK SECTIONS (weekend, today, tomorrow, agendas) */}
      {renderedLinkSections.length > 0 && (
        <div className="container py-8 border-b border-border/40 space-y-8">
          {renderedLinkSections.map((section) => (
            <div key={section.id} className="flex flex-col gap-4">
              <SectionHeading
                title={section.title}
                titleClassName="heading-2 text-foreground mb-element-gap"
              />
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <PressableAnchor
                    key={`${section.id}-${link.href}`}
                    href={withLocale(link.href)}
                    prefetch={false}
                    variant="plain"
                    className="px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-sm text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {formatLinkLabel(section.id, link.label)}
                  </PressableAnchor>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. QUICK CATEGORIES */}
      <section className="py-section-y container border-b">
        <SectionHeading
          title={tServerCategories("quickCategoriesTitle")}
          titleClassName="heading-2 text-foreground mb-element-gap"
        />
        <div className="grid grid-cols-2 gap-element-gap sm:flex sm:flex-row sm:flex-nowrap sm:gap-4 sm:overflow-x-auto sm:py-2 sm:px-2 sm:-mx-2">
          {quickCategoryLinks.map(({ label, url, Icon }) => (
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
          localePrefix={prefix}
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
  localePrefix = "",
}: ServerEventsCategorizedContentProps & { localePrefix?: string }) {
  const locale = await getLocaleSafely();
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

  const tCategory = await getTranslations({
    locale,
    namespace: "Components.CategoryEventsSection",
  });
  const tCta = await getTranslations({
    locale,
    namespace: "Components.ServerEventsCategorized",
  });
  const tDateFilters = await getTranslations({
    locale,
    namespace: "Components.DateFilterBadges",
  });
  const badgeLabels = createDateFilterBadgeLabels(tDateFilters);
  const withLocale = (path: string) => {
    if (!path.startsWith("/")) return path;
    if (!localePrefix) return path;
    if (path === "/") return localePrefix;
    if (path.startsWith(localePrefix)) return path;
    return `${localePrefix}${path}`;
  };

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
            labels={{
              heading: tCategory("heading", {
                categoryPhrase: section.categoryPhrase,
              }),
              seeMore: tCategory("seeMore"),
              sponsored: tCategory("sponsored"),
            }}
            badgeLabels={badgeLabels}
          />
        ))}
      </div>

      {/* CTA */}
      <section className="py-section-y container text-center">
        <p className="body-large text-foreground/70 font-medium mb-element-gap">
          {tCta("cta")}
        </p>
        <PressableAnchor
          href={withLocale("/catalunya")}
          prefetch={false}
          variant="plain"
          className="btn-primary w-full sm:w-auto"
        >
          {tCta("ctaButton")}
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
