import { fetchNews } from "@lib/api/news";
import type { NewsSummaryResponseDTO } from "types/api/news";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";

export default async function Page({ params }: { params: { place: string } }) {
  const place = params.place;
  const response = await fetchNews({ page: 0, size: 10, place });
  const items: NewsSummaryResponseDTO[] = response.content;

  const mapped: EventSummaryResponseDTO[] = items.map((n) => ({
    id: n.id,
    hash: n.id,
    slug: n.slug,
    title: n.title,
    type: "FREE",
    url: `/noticies/${n.slug}`,
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

  const list: ListEvent[] = mapped;

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
      <h1 className="uppercase mb-2 px-2 lg:px-0">Notícies de {place}</h1>
      <List events={list}>
        {(event, index) => <Card key={`${event.id}-${index}`} event={event} isPriority={index === 0} />}
      </List>
    </div>
  );
}