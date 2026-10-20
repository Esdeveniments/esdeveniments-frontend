import type { Option } from "types/common";
import type {
  EventBaseRequestDTO,
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

const LOCAL_DATE_TIME =
  /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))(?:T((?:[01]\d|2[0-3]):[0-5]\d))?$/;

// Split by string, not through Date: a local time inside a DST gap would shift.
function splitLocalDateTime(value: string): { date: string; time: string } {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match) throw new RangeError("Invalid time value");
  return { date: match[1], time: match[2] ?? "00:00" };
}

export function formDataToBackendDTO(
  form: FormData
): EventBaseRequestDTO {
  const { date: startDate, time: startTime } = splitLocalDateTime(form.startDate);
  const { date: endDate, time: endTime } = splitLocalDateTime(form.endDate);

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
    url: form.url || null,
    description: form.description,
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

function toLocalDateTimeValue(date: string | null, time: string | null): string {
  if (!date) return "";
  return time ? `${date}T${time.slice(0, 5)}` : date;
}

export function eventDtoToFormData(event: EventDetailResponseDTO): FormData {
  const form: FormData = {
    id: event.id ? String(event.id) : undefined,
    title: event.title || "",
    description: event.description || "",
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
    url: event.url || "",
    categories: Array.isArray(event.categories)
      ? event.categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : [],
    email: "", // UI only
  };
  // The picker edits one local "YYYY-MM-DDTHH:mm" per field; the stored times
  // kept separately above would outrank what the user changes in it.
  return {
    ...form,
    startDate: toLocalDateTimeValue(event.startDate, event.startTime),
    startTime: null,
    endDate: toLocalDateTimeValue(event.endDate, event.endTime),
    endTime: null,
  };
}
