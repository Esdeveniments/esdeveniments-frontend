import type {
  ShareKitChannel,
  ShareKitEvent,
  ShareKitSource,
} from "types/event";

// Dependency-free so the share kit's client bundle stays small.
export const SHARE_KIT_UTM_MEDIUM = "organizer_share";

/** Event URL tagged so GA can count visits from each organiser share. */
export function buildShareUrl(
  url: string,
  channel: ShareKitChannel,
  source: ShareKitSource,
): string {
  const params = new URLSearchParams({
    utm_source: channel,
    utm_medium: SHARE_KIT_UTM_MEDIUM,
    utm_campaign: source,
  });
  return `${url}${url.includes("?") ? "&" : "?"}${params}`;
}

/** Message body for chat apps: one fact per line, link last. */
export function buildShareText(event: ShareKitEvent, url?: string): string {
  return [
    event.title,
    event.dateText && `📅 ${event.dateText}`,
    event.placeText && `📍 ${event.placeText}`,
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

export const buildWhatsappShareHref = (text: string): string =>
  `https://wa.me/?text=${encodeURIComponent(text)}`;

export const buildFacebookShareHref = (url: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

/** The user closed the native share sheet: not an error. */
export const isShareAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";
