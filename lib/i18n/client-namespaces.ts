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

export const CLIENT_APP_KEYS = ["Error", "NotFound", "Publish"] as const;

export const CLIENT_COMPONENT_KEYS = [
  "AdBoard",
  "CardContent",
  "DatePicker",
  "Description",
  "EditModal",
  "EventForm",
  "EventLocation",
  "EventPage",
  "FavoriteButton",
  "FiltersModal",
  "Footer",
  "HeroCTA",
  "HeroFilters",
  "HeroSearch",
  "HybridEventsListClient",
  "ImageUploader",
  "LoadMoreButton",
  "LocationDiscovery",
  "MultiSelect",
  "Navbar",
  "NoEventsFound",
  "Notification",
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
// If you drop one here, add the specific sub-keys it needs in its own constant.
export const CLIENT_FULL_TOP_LEVEL = [
  "Auth",
  "Config",
  "Partials",
  "Sponsor",
  "Sponsorship",
] as const;
