// --- Centralized event form types ---
import type { RegionSummaryResponseDTO, CitySummaryResponseDTO } from "./api/event";

export interface FormState {
  isDisabled: boolean;
  isPristine: boolean;
  message: string;
}

export interface FormData {
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  region: RegionSummaryResponseDTO | null;
  town: CitySummaryResponseDTO | null;
  location: string;
  imageUrl: string | null;
  url: string;
  email?: string;
}

export interface EditEventProps {
  event: import("./api/event").EventDetailResponseDTO;
}