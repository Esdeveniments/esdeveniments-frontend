// --- Centralized event form types ---
import type { RegionSummaryResponseDTO, CitySummaryResponseDTO } from "./api/event";

export interface FormState {
  isDisabled: boolean;
  isPristine: boolean;
  message: string;
}

/**
 * Canonical FormData for event creation/edit forms.
 * Use this interface everywhere for event forms.
 * - For UI, use Option | null for region/town, then convert to DTO for backend.
 * - Dates should be string (ISO) for storage, can be Date in UI state.
 */
export interface FormData {
  id?: string;
  title: string;
  description: string;
  startDate: string | Date; // Use string for backend, Date for UI state
  endDate: string | Date;
  region: RegionSummaryResponseDTO | { value: string; label: string } | null;
  town: CitySummaryResponseDTO | { value: string; label: string } | null;
  location: string;
  imageUrl: string | null;
  url: string;
  email?: string;
}

export interface EditEventProps {
  event: FormData;
}