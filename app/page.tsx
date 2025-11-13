import { getCategorizedEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { PageData } from "types/common";
import { CategorizedEvents } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import Search from "@components/ui/search";
import { Suspense, JSX } from "react";

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
  const categorizedEvents: CategorizedEvents = await getCategorizedEvents(5);

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
      <div className="container flex justify-center items-center">
        <Suspense
          fallback={
            <div className="w-full h-12 bg-background animate-pulse rounded-full" />
          }
        >
          <Search />
        </Suspense>
      </div>

      <ServerEventsCategorized
        categorizedEvents={categorizedEvents}
        pageData={pageData}
        categories={categories}
      />
    </>
  );
}
