import HomeClient from "./HomeClient";
import { fetchCategorizedEvents } from "@lib/api/events";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { HomeInitialState, PageData } from "types/common";

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

export default async function Page() {
  const { categorizedEvents, latestEvents } = await fetchCategorizedEvents();

  const initialState: HomeInitialState = {
    categorizedEvents: categorizedEvents || {},
    latestEvents: latestEvents || [],
    noEventsFound:
      !categorizedEvents ||
      Object.values(categorizedEvents).every((events) => events.length === 0),
  };

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  return <HomeClient initialState={initialState} pageData={pageData} />;
}
