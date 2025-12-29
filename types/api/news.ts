import type {
  PagedResponseDTO as EventPagedResponseDTO,
  RegionSummaryResponseDTO,
  ProvinceSummaryResponseDTO,
} from "./event";
import type { CitySummaryResponseDTO } from "./city";

export type NewsType = "WEEKLY" | "WEEKEND" | string;

export interface NewsSummaryResponseDTO {
  id: string; // UUID
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
  imageUrl: string;
  readingTime: number;
  visits: number;
  slug: string;
  city?: CitySummaryResponseDTO;
  region?: RegionSummaryResponseDTO;
  updatedAt?: string;
}

export interface NewsEventCategoryDTO {
  id: number;
  slug: string;
  name: string;
}

export interface NewsEventItemDTO {
  id: string;
  hash: string;
  slug: string;
  title: string;
  type: string;
  url: string;
  description: string;
  imageUrl: string;
  startDate: string; // YYYY-MM-DD
  startTime?: { hour: number; minute: number; second: number; nano: number } | null;
  endDate: string; // YYYY-MM-DD
  endTime?: { hour: number; minute: number; second: number; nano: number } | null;
  location: string;
  city?: CitySummaryResponseDTO;
  region?: RegionSummaryResponseDTO;
  province?: ProvinceSummaryResponseDTO;
  visits: number;
  origin: string;
  categories: NewsEventCategoryDTO[];
}

export interface NewsDetailResponseDTO {
  id: string; // UUID
  type: NewsType;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  readingTime: number;
  visits: number;
  events: NewsEventItemDTO[];
  relatedNews?: NewsSummaryResponseDTO[];
  createdAt: string; // ISO datetime
  updatedAt?: string;
  city?: CitySummaryResponseDTO;
  region?: RegionSummaryResponseDTO;
  province?: ProvinceSummaryResponseDTO;
}

export type PagedResponseDTO<T> = EventPagedResponseDTO<T>;

export interface FetchNewsParams {
  page?: number;
  size?: number;
  place?: string;
}