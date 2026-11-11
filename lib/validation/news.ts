import { z } from "zod";
import type { PagedResponseDTO } from "types/api/event";
import type {
  NewsDetailResponseDTO,
  NewsSummaryResponseDTO,
} from "types/api/news";
import { contractCatalanPlaceInText } from "@utils/string-helpers";
import {
  CitySummaryResponseDTOSchema,
  PagedResponseMetaSchema,
  ProvinceSummaryResponseDTOSchema,
  RegionSummaryResponseDTOSchema,
  parseEventSummaryList,
} from "./event";

const NewsSummaryResponseDTOSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().nullish().transform((v) => v ?? ""),
    startDate: z.string(),
    endDate: z.string(),
    // Related news come back with imageUrl: null.
    imageUrl: z.string().nullish(),
    readingTime: z.number().nullish(),
    visits: z.number().nullish(),
    city: CitySummaryResponseDTOSchema.nullish(),
    region: RegionSummaryResponseDTOSchema.nullish(),
    updatedAt: z.string().nullish(),
  })
  .passthrough();

const NewsDetailResponseDTOSchema = NewsSummaryResponseDTOSchema.omit({
  slug: true,
  imageUrl: true,
}).extend({
  type: z.string(),
  createdAt: z.string(),
  province: ProvinceSummaryResponseDTOSchema.nullish(),
  // Parsed item by item below, so one bad entry doesn't drop the article.
  events: z.array(z.unknown()).nullish(),
  relatedNews: z.array(z.unknown()).nullish(),
});

const PagedNewsSchema = PagedResponseMetaSchema.extend({
  content: z.array(z.unknown()),
});

// Backend titles and descriptions say "a El Masnou"; Catalan contracts it.
function withCatalanPlaceArticles<T extends NewsSummaryResponseDTO | NewsDetailResponseDTO>(
  news: T
): T {
  const fix = (text: string) =>
    [news.city?.name, news.region?.name].reduce<string>(
      (result, name) => contractCatalanPlaceInText(result, name),
      text
    );
  return { ...news, title: fix(news.title), description: fix(news.description) };
}

/** News summaries; drops invalid items. */
function parseNewsSummaryList(items: unknown[]): NewsSummaryResponseDTO[] {
  return items.flatMap((item) => {
    const result = NewsSummaryResponseDTOSchema.safeParse(item);
    if (!result.success) {
      console.error("parseNewsSummaryList: invalid news item", result.error);
      return [];
    }
    return [withCatalanPlaceArticles(result.data as NewsSummaryResponseDTO)];
  });
}

export function parsePagedNews(
  input: unknown
): PagedResponseDTO<NewsSummaryResponseDTO> | null {
  const result = PagedNewsSchema.safeParse(input);
  if (!result.success) {
    console.error("parsePagedNews: invalid paged news payload", result.error);
    return null;
  }
  return { ...result.data, content: parseNewsSummaryList(result.data.content) };
}

export function parseNewsDetail(input: unknown): NewsDetailResponseDTO | null {
  const result = NewsDetailResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseNewsDetail: invalid news payload", result.error);
    return null;
  }
  const { events, relatedNews, ...detail } = result.data;
  return withCatalanPlaceArticles({
    ...(detail as Omit<NewsDetailResponseDTO, "events" | "relatedNews">),
    // Events render with the shared event card, so they get the same parser
    // (drops invalid items, adds image cache keys) as every other event list.
    events: parseEventSummaryList(events ?? []),
    relatedNews: parseNewsSummaryList(relatedNews ?? []),
  });
}
