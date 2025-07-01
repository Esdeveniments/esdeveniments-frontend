import type { Option } from "types/common";
import type {
  EventCreateRequestDTO,
  EventUpdateRequestDTO,
  EventDetailResponseDTO,
} from "types/api/event";
import type { FormData } from "types/event";
import { formatTimeForAPI } from "./date-helpers";

// Centralized helpers for extracting region/town values from form fields
export function getRegionValue(
  region: Option | { id: string | number } | null | undefined
): string | null {
  if (!region) return null;
  if ("value" in region) return region.value;
  if ("id" in region) return String(region.id);
  return null;
}

export function getTownValue(
  town: Option | { id: string | number } | null | undefined
): string | null {
  if (!town) return null;
  if ("value" in town) return town.value;
  if ("id" in town) return String(town.id);
  return null;
}

export function formDataToBackendDTO(
  form: FormData
): EventCreateRequestDTO | EventUpdateRequestDTO {
  // Extract date and time from datetime strings
  const startDateTime = new Date(form.startDate);
  const endDateTime = new Date(form.endDate);

  const startDate = startDateTime.toISOString().split("T")[0]; // YYYY-MM-DD
  const endDate = endDateTime.toISOString().split("T")[0]; // YYYY-MM-DD

  const startTime = startDateTime.toTimeString().slice(0, 5); // HH:mm
  const endTime = endDateTime.toTimeString().slice(0, 5); // HH:mm

  // Extract region and city IDs - they can be Option objects or DTO objects
  const regionId = form.region
    ? "value" in form.region
      ? Number(form.region.value)
      : form.region.id
    : 0;
  const cityId = form.town
    ? "value" in form.town
      ? Number(form.town.value)
      : form.town.id
    : 0;

  return {
    title: form.title,
    type: form.type ?? "FREE",
    url: form.url,
    description: form.description,
    imageUrl: form.imageUrl,
    regionId,
    cityId,
    startDate, // Now in YYYY-MM-DD format
    startTime: form.startTime ? formatTimeForAPI(form.startTime) : startTime, // Use extracted time if form.startTime is empty
    endDate, // Now in YYYY-MM-DD format
    endTime: form.endTime ? formatTimeForAPI(form.endTime) : endTime, // Use extracted time if form.endTime is empty
    location: form.location,
    categories: Array.isArray(form.categories)
      ? form.categories
          .map((cat: { id?: number; value?: string } | number | string) =>
            typeof cat === "object" && cat !== null && "id" in cat
              ? cat.id
              : cat && typeof cat === "object" && "value" in cat
              ? Number(cat.value)
              : Number(cat)
          )
          .filter((id): id is number => typeof id === "number" && !isNaN(id))
      : [],
  };
}

export function eventDtoToFormData(event: EventDetailResponseDTO): FormData {
  return {
    id: event.id ? String(event.id) : undefined,
    title: event.title || "",
    description: event.description || "",
    type: event.type || "FREE",
    startDate: event.startDate || "", // Keep as string, already in YYYY-MM-DD format
    startTime: event.startTime, // Keep as string | null, already in ISO time format
    endDate: event.endDate || "", // Keep as string, already in YYYY-MM-DD format
    endTime: event.endTime, // Keep as string | null, already in ISO time format
    region: event.region
      ? { value: String(event.region.id), label: event.region.name }
      : null,
    town: event.city
      ? { value: String(event.city.id), label: event.city.name }
      : null,
    location: event.location || "",
    imageUrl: event.imageUrl || null,
    url: event.url || "",
    categories: Array.isArray(event.categories)
      ? event.categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : [],
    email: "", // UI only
  };
}
