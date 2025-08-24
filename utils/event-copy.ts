import type { EventDetailResponseDTO } from "types/api/event";
import { getFormattedDate } from "@utils/date-helpers";
import type { FaqItem } from "types/faq";

function isValidTime(t: string | null): t is string {
  return !!t && t !== "00:00";
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildEventIntroText(event: EventDetailResponseDTO): string {
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const datePhrase = formattedEnd
    ? `del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(event.endTime) ? event.endTime : "";

  const placeSummary = cityName
    ? `${cityName}${regionName ? ` (${regionName})` : ""}`
    : regionName || event.location;

  const timePart =
    !formattedEnd && startTimeLabel
      ? `, ${startTimeLabel}${endTimeLabel ? `–${endTimeLabel}` : ""}`
      : "";

  return `${event.title} es celebra ${datePhrase}${timePart}, a ${placeSummary}.`;
}

export function buildFaqItems(event: EventDetailResponseDTO): FaqItem[] {
  const items: FaqItem[] = [];

  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const formattedEventDate = formattedEnd
    ? `del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(event.endTime) ? event.endTime : "";
  const timeLabel = startTimeLabel
    ? `${startTimeLabel}${endTimeLabel ? ` - ${endTimeLabel}` : ""}`
    : "";

  items.push({
    q: "Quan és l'esdeveniment?",
    a: `${formattedEventDate}${timeLabel ? `, ${timeLabel}` : ""}`,
  });

  // Build clean location string: split location by commas, drop tokens equal to city/region, de-duplicate
  const partsFromLocation = event.location
    ? event.location
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];
  const cityKey = cityName ? normalize(cityName) : "";
  const regionKey = regionName ? normalize(regionName) : "";
  const finalWhereParts: string[] = [];
  const seenWhere = new Set<string>();

  const addPart = (v?: string) => {
    if (!v) return;
    const key = normalize(v);
    if (!key || seenWhere.has(key)) return;
    seenWhere.add(key);
    finalWhereParts.push(v.trim());
  };

  for (const p of partsFromLocation) {
    const key = normalize(p);
    if (key === cityKey || key === regionKey) continue;
    addPart(p);
  }
  addPart(cityName);
  addPart(regionName);

  if (finalWhereParts.length > 0) {
    items.push({ q: "On se celebra?", a: finalWhereParts.join(", ") });
  }

  items.push({
    q: "És gratuït?",
    a:
      event.type === "FREE"
        ? "Sí, l’esdeveniment és gratuït."
        : "No, l’esdeveniment és de pagament.",
  });

  if (event.duration && event.duration.trim().length > 0) {
    items.push({ q: "Quina és la durada aproximada?", a: event.duration });
  }

  return items;
}

export function buildFaqJsonLd(items: FaqItem[]) {
  if (!items || items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  } as const;
}
