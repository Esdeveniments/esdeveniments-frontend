/**
 * Whitelist of translation namespaces consumed by client-rendered components.
 *
 * The Provider's `messages` prop becomes part of the RSC payload on every page
 * load. Keeping it narrow (vs. shipping the full messages file) is a bundle-size
 * win. Server components read from the messages file directly via
 * `getTranslations`, so they do NOT need to be listed here.
 *
 * Drift prevention: `test/i18n-client-namespaces.test.ts` scans the repo for
 * every `useTranslations('X')` call in client-rendered files and fails CI if a
 * namespace is missing from these lists. Update both places together.
 */

import type { RouteMessagesScope } from "types/i18n";

export const CLIENT_APP_KEYS = ["Error", "NotFound"] as const;

export const CLIENT_COMPONENT_KEYS = [
  "AdBoard",
  "CardContent",
  "DatePicker",
  "DateRangeCalendar",
  "FavoriteButton",
  "FavoritesLoginNudge",
  "HeroCTA",
  "HeroFilters",
  "HeroSearch",
  "ImageUploader",
  "LoadMoreButton",
  "Modal",
  "MultiSelect",
  "Navbar",
  "NoEventsFound",
  "Notification",
  "PwaBackButton",
  "SearchBar",
  "Select",
  "ShareKit",
  "SocialFollowPopup",
  "TextArea",
] as const;

export const CLIENT_UTILS_KEYS = [
  "Calendar",
  "EventStatus",
  "Validation",
] as const;

// Top-level namespaces that are shipped to the client in full (no sub-key pick).
// If you drop one here, list the paths it needs in CLIENT_PARTIAL_PATHS.
export const CLIENT_FULL_TOP_LEVEL = ["Config", "Sponsor"] as const;

// Namespaces shipped in part: each entry is a dotted path into the messages,
// where a "*" segment matches every key at that level. The guard test checks that every key a client file reads from these
// namespaces resolves under one of the paths.
export const CLIENT_PARTIAL_PATHS = [
  // The publish and promote upsell modal on event pages.
  "App.EventPromote.benefit1",
  "App.EventPromote.benefit2",
  "App.EventPromote.benefit3",
  "App.Publish.promoteUpsell",
  // AdCard (every listing) reads one EventPage key.
  "Components.EventPage.sponsored",
  // VerifiedBadge, on event pages and in search suggestions.
  "Components.Profile.verified",
  "Components.Profile.verifiedOrganizer",
] as const;

// Paths only one route's client components read. Its layout mounts
// <RouteClientMessages scope="..."> to add them on top of the root messages,
// so other pages don't carry them in their RSC payload. A nested route gets
// its parents' scopes too. The guard test checks which files may read each.
export const ROUTE_CLIENT_PATHS: Record<RouteMessagesScope, readonly string[]> = {
  publish: ["App.Publish", "Components.EventForm"],
  eventEdit: ["App.EventEdit", "Components.EventForm"],
  eventPromote: ["App.EventPromote"],
  editProfile: ["App.EditProfile"],
  event: [
    "Components.Description",
    "Components.EditModal",
    "Components.EventLocation",
    "Components.EventPage",
    "Components.PromotionInfoModal",
    "Components.RestaurantPromotionForm",
    "Components.WhereToEatSection",
  ],
  listing: [
    "Components.EventsMap",
    "Components.Filters",
    "Components.FiltersModal",
    "Components.HybridEventsListClient",
  ],
  profile: ["Components.Profile"],
  sponsorship: [
    "Sponsorship.checkout",
    "Sponsorship.placeSelector",
    "Sponsorship.pricing",
    "Sponsorship.upload",
    "Sponsorship.uploadPage",
  ],
};

// Copies the value at `keys` from source into target. "*" matches every child.
export function pickPath(
  source: unknown,
  target: Record<string, unknown>,
  keys: string[],
): void {
  const [key, ...rest] = keys;
  const node = source as Record<string, unknown> | undefined;
  for (const name of key === "*" ? Object.keys(node ?? {}) : [key]) {
    const value = node?.[name];
    if (value === undefined) continue;
    if (rest.length === 0) target[name] = value;
    else pickPath(value, (target[name] ??= {}) as Record<string, unknown>, rest);
  }
}

// Deep-merges `extra` into a copy of `base`; `extra` wins on conflicts.
export function mergeMessages(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeMessages(current, value)
        : value;
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
