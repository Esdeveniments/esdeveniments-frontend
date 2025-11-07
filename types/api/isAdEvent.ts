import type { AdEvent } from "./event";

export function isAdEvent(item: unknown): item is AdEvent {
  return !!item && typeof item === "object" && (item as any).isAd === true;
}


