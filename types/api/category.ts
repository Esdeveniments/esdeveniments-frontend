import { EventSummaryResponseDTO } from "./event";

// Basic category summary (used in lists and references)
export interface CategorySummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
}

// Detailed category response (used when fetching a specific category with its events)
export interface CategoryDetailResponseDTO {
  id: number;
  name: string;
  slug: string;
  events: EventSummaryResponseDTO[];
}
