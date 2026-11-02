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

export const CLIENT_APP_KEYS = ["EditProfile", "Error", "EventEdit", "EventPromote", "NotFound", "Publish"] as const;

export const CLIENT_COMPONENT_KEYS = [
  "AdBoard",
  "CardContent",
  "DatePicker",
  "DateRangeCalendar",
  "Description",
  "EditModal",
  "EventForm",
  "EventLocation",
  "EventPage",
  "FavoriteButton",
  "FavoritesLoginNudge",
  "Filters",
  "FiltersModal",
  "Footer",
  "HeroCTA",
  "HeroFilters",
  "HeroSearch",
  "HybridEventsListClient",
  "ImageUploader",
  "LoadMoreButton",
  "LocationDiscovery",
  "Modal",
  "MultiSelect",
  "Navbar",
  "NoEventsFound",
  "Notification",
  "PwaBackButton",
  "PromotionInfoModal",
  "Profile",
  "RestaurantPromotionForm",
  "SearchBar",
  "Select",
  "SocialFollowPopup",
  "TextArea",
  "WhereToEatSection",
] as const;

export const CLIENT_UTILS_KEYS = [
  "Calendar",
  "EventStatus",
  "EventTime",
  "Validation",
] as const;

// Top-level namespaces that are shipped to the client in full (no sub-key pick).
// If you drop one here, list the paths it needs in CLIENT_PARTIAL_PATHS.
export const CLIENT_FULL_TOP_LEVEL = ["Config", "Sponsor"] as const;

// Namespaces shipped in part: each entry is a dotted path into the messages,
// where a "*" segment matches every key at that level. The guard test checks that every key a client file reads from these
// namespaces resolves under one of the paths.
export const CLIENT_PARTIAL_PATHS = [
  "Partials.GeneratePagesData.categories.*.titleSuffix",
  "Sponsorship.checkout",
  "Sponsorship.placeSelector",
  "Sponsorship.pricing",
  "Sponsorship.upload",
  "Sponsorship.uploadPage",
] as const;

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
