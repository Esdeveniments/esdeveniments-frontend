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
  if (typeof region === "object" && "value" in region) return region.value;
  if (typeof region === "object" && "id" in region) return String(region.id);
  return null;
}

export function getTownValue(
  town: Option | { id: string | number } | null | undefined
): string | null {
  if (!town) return null;
  if (typeof town === "object" && "value" in town) return town.value;
  if (typeof town === "object" && "id" in town) return String(town.id);
  return null;
}

export function formDataToBackendDTO(
  form: FormData
): EventCreateRequestDTO | EventUpdateRequestDTO {
  return {
    title: form.title,
    type: form.type ?? "FREE",
    url: form.url,
    description: form.description,
    imageUrl: form.imageUrl,
    regionId:
      form.region && "id" in form.region
        ? form.region.id
        : form.region && "value" in form.region
        ? Number(form.region.value)
        : 0,
    cityId:
      form.town && "id" in form.town
        ? form.town.id
        : form.town && "value" in form.town
        ? Number(form.town.value)
        : 0,
    startDate: form.startDate, // Already in YYYY-MM-DD format
    startTime: formatTimeForAPI(form.startTime || ""),
    endDate: form.endDate, // Already in YYYY-MM-DD format
    endTime: formatTimeForAPI(form.endTime || ""),
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
    slug: event.slug || "",
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
