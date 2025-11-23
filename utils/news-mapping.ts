import type { NewsSummaryResponseDTO } from "types/api/news";
import type { EventSummaryResponseDTO } from "types/api/event";
import { formatPlaceName } from "./string-helpers";

// Minimal, explicit mapper to reuse existing Event card/list components
export function mapNewsSummaryToEventSummary(
  news: NewsSummaryResponseDTO,
  place: string
): EventSummaryResponseDTO {
  const locationLabel = formatPlaceName(place.replace(/-/g, " "));

  return {
    id: news.id,
    hash: news.id,
    slug: news.slug,
    title: news.title,
    type: "FREE",
    url: `/noticies/${place}/${news.slug}`,
    description: news.description,
    imageUrl: news.imageUrl,
    startDate: news.startDate,
    startTime: null,
    endDate: news.endDate,
    endTime: null,
    location: locationLabel,
    visits: news.visits || 0,
    origin: "MANUAL",
    city: {
      id: 0,
      name: "",
      slug: "",
      latitude: 0,
      longitude: 0,
      postalCode: "",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 0, name: "", slug: "" },
    province: { id: 0, name: "", slug: "" },
    categories: [],
  };
}

export function mapNewsSummariesToEvents(
  items: NewsSummaryResponseDTO[],
  place: string
): EventSummaryResponseDTO[] {
  return items.map((item) => mapNewsSummaryToEventSummary(item, place));
}
