"use client";

const OWNED_EVENTS_KEY_PREFIX = "events-owned:"; // + userId
const FAVORITES_KEY_PREFIX = "events-favs:"; // + userId

export function getOwnedEventIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OWNED_EVENTS_KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setOwnedEventIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNED_EVENTS_KEY_PREFIX + userId, JSON.stringify(ids));
}

export function addOwnedEvent(userId: string, eventId: string): void {
  const ids = getOwnedEventIds(userId);
  if (!ids.includes(eventId)) {
    ids.push(eventId);
    setOwnedEventIds(userId, ids);
  }
}

export function getFavoriteEventIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setFavoriteEventIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY_PREFIX + userId, JSON.stringify(ids));
}

export function toggleFavorite(userId: string, eventId: string): boolean {
  const ids = getFavoriteEventIds(userId);
  const index = ids.indexOf(eventId);
  if (index >= 0) {
    ids.splice(index, 1);
    setFavoriteEventIds(userId, ids);
    return false;
  }
  ids.push(eventId);
  setFavoriteEventIds(userId, ids);
  return true;
}