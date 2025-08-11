import { Suspense } from "react";
import { fetchNews } from "@lib/api/news";
import HybridEventsList from "@components/ui/hybridEventsList";
import type { NewsSummaryResponseDTO } from "types/api/news";
import type { ListEvent } from "types/api/event";
import type { EventSummaryResponseDTO } from "types/api/event";
import { insertAds } from "@lib/api/events";

export const dynamic = "force-dynamic";

export default async function Page() {
  const response = await fetchNews({ page: 0, size: 10 });
  const items: NewsSummaryResponseDTO[] = response.content;

  // Map news items to event-like objects to reuse Card/List components
  const mapped: EventSummaryResponseDTO[] = items.map((n) => ({
    id: n.id,
    hash: n.id,
    slug: n.slug,
    title: n.title,
    type: "FREE",
    url: "",
    description: n.description,
    imageUrl: n.imageUrl,
    startDate: n.startDate,
    startTime: null,
    endDate: n.endDate,
    endTime: null,
    location: "",
    visits: n.visits || 0,
    origin: "MANUAL",
    city: { id: 0, name: "", slug: "", latitude: 0, longitude: 0, postalCode: "", rssFeed: null, enabled: true },
    region: { id: 0, name: "", slug: "" },
    province: { id: 0, name: "", slug: "" },
    categories: [],
  }));

  const withAds: ListEvent[] = insertAds(mapped);

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
      <h1 className="uppercase mb-2 px-2 lg:px-0">Notícies</h1>
      <p className="text-[16px] font-normal text-blackCorp text-left mb-10 px-2 font-barlow">
        Les últimes notícies i recomanacions d&apos;esdeveniments.
      </p>
      <Suspense fallback={<div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" /> }>
        <HybridEventsList initialEvents={withAds} pageData={undefined} noEventsFound={withAds.length===0} place="" />
      </Suspense>
    </div>
  );
}