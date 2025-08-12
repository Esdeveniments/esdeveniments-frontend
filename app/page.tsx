import { fetchCategorizedEvents, fetchEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { PageData } from "types/common";
import { CategorizedEvents } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import Search from "@components/ui/search";
import { Suspense, JSX } from "react";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { EventSummaryResponseDTO } from "types/api/event";

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
  // Always fetch categorized events (no URL filters support)
  const categorizedEvents: CategorizedEvents = await fetchCategorizedEvents(5);

  // Optionally fetch featured/promoted events (simple placeholder source)
  let featured: EventSummaryResponseDTO[] = [];
  if (process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1") {
    try {
      const res = await fetchEvents({ page: 0, size: 6 });
      featured = (res?.content || []).filter(isEventSummaryResponseDTO);
    } catch (e) {
      // Safe fallback – hide section on error
      featured = [];
    }
  }

  // Fetch dynamic categories for enhanced category support
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - components will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = [];
  }

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  return (
    <>
      <div className="w-full flex justify-center items-center mx-auto px-2 lg:px-0 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
        <Suspense
          fallback={
            <div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" />
          }
        >
          <Search />
        </Suspense>
      </div>

      {process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1" && featured.length >= 3 && (
        <section
          aria-labelledby="featured-heading"
          className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-6"
        >
          <h2 id="featured-heading" className="uppercase mb-2 px-2 lg:px-0">
            Destacats
          </h2>
          <EventsAroundServer
            events={featured}
            layout="horizontal"
            usePriority
            showJsonLd={false}
            title="Destacats"
          />
        </section>
      )}

      <ServerEventsCategorized
        categorizedEvents={categorizedEvents}
        pageData={pageData}
        categories={categories}
      />
    </>
  );
}
