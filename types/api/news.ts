import type {
  EventSummaryResponseDTO,
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

export interface NewsDetailResponseDTO {
  id: string; // UUID
  type: NewsType;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  readingTime: number;
  visits: number;
  events: EventSummaryResponseDTO[];
  relatedNews?: NewsSummaryResponseDTO[];
  createdAt: string; // ISO datetime
  updatedAt?: string;
  city?: CitySummaryResponseDTO;
  region?: RegionSummaryResponseDTO;
  province?: ProvinceSummaryResponseDTO;
}

export interface FetchNewsParams {
  page?: number;
  size?: number;
  place?: string;
}