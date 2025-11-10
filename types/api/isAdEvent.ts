import type { AdEvent } from "./event";

export function isAdEvent(item: unknown): item is AdEvent {
  return (
    !!item &&
    typeof item === "object" &&
    item !== null &&
    "isAd" in item &&
    (item as Record<string, unknown>).isAd === true
  );
}
