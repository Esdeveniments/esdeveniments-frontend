import type { FormData } from "types/event";

export interface EditEventPageProps {
  params: {
    eventId: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  event?: FormData;
}
