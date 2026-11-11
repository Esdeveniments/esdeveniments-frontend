---
name: filter-system-dev
description: How the listing filters work (place, category, byDate, distance, price, searchTerm) and how to add or change one. Use when editing config/filters.ts, utils/filter-operations.ts, filter chips (FiltersClient), the filters modal (NavigationFiltersModal), filter URL parsing/building or debugging filter removal URLs.
---

# Filter system

## How it fits together

| Piece | File | Role |
| --- | --- | --- |
| Filter configs | `config/filters.ts` (`FILTER_CONFIGURATIONS`) | One object per filter: active state, chip text, what to clear on removal |
| Config type | `types/filters.ts` (`FilterConfig`, `FilterDisplayState`) | Shape of each config |
| Operations | `utils/filter-operations.ts` (`FilterOperations`) | Generic helpers over the configs |
| Chips UI | `components/ui/filters/FiltersClient.tsx` | Renders a removable chip per active filter |
| Filters modal | `components/ui/filtersModal/NavigationFiltersModal.tsx` | Inputs for place, date, category, price, distance |
| URL state | `types/url-filters.ts`, `utils/url-filters.ts` | `URLFilterState`, `URLQueryParams`, `RouteSegments`; parse and build URLs |
| Data | `components/hooks/useEvents.ts` | Maps URL filters to API params (SWR) |

The configs drive the chips: whether a filter is active, its label, and its removal URL. URL parsing/building in `utils/url-filters.ts` and the API mapping in `useEvents` are written per filter; they don't read the configs. URL rules (canonical shape, `tots`, noindex, no `searchParams` in pages) are in the `url-canonicalization` skill.

Current keys: `place`, `category`, `byDate`, `distance`, `price`, `searchTerm` (`searchTerm` never shows a chip; the search box shows it).

## Config anatomy

From `types/filters.ts`:

```ts
interface FilterConfig<T extends FilterValue = FilterValue> {
  key: keyof URLFilterState;
  displayName: string;
  defaultValue: T;
  type: "place" | "category" | "date" | "distance" | "search" | "coordinates" | "price";
  isEnabled: (state: FilterDisplayState) => boolean;          // true = active, show a chip
  getDisplayText: (state: FilterDisplayState) => string | undefined;
  getRemovalChanges: () => Partial<URLFilterState>;           // flat object of changes
  dependencies?: Array<keyof URLFilterState>;
  validation?: (value: T) => boolean;
  specialCases?: { homeRedirect?: (segments: RouteSegments) => boolean };
}
```

`FilterDisplayState` is `{ filters: URLFilterState; queryParams: URLQueryParams; segments: RouteSegments; extraData?: { categories?, placeTypeLabel? } }`. `RouteSegments` is `{ place, date, category }`.

Real example (`config/filters.ts`):

```ts
{
  key: "distance",
  displayName: "distance",
  defaultValue: 50,
  type: "distance",
  dependencies: ["lat", "lon"],
  isEnabled: (state) =>
    state.filters.distance !== 50 ||
    Boolean(state.queryParams.lat && state.queryParams.lon),
  getDisplayText: (state) => {
    const hasLocation = Boolean(state.queryParams.lat && state.queryParams.lon);
    if (state.filters.distance !== 50 || hasLocation) {
      return `${state.filters.distance} km`;
    }
    return undefined;
  },
  getRemovalChanges: () => ({ distance: undefined, lat: undefined, lon: undefined }),
}
```

`getRemovalChanges` must also clear dependent values (distance clears `lat`/`lon`; byDate clears `from`/`to`). `buildFilterUrl` keeps the current value when a change is `undefined` for `place`, `byDate`, `category` and `searchTerm`, so those reset to their default instead (`place: "catalunya"`, `byDate`/`category`: `DEFAULT_FILTER_VALUE`, `searchTerm: ""`). `undefined` clears only `distance`, `price`, `from`, `to`, `lat`, `lon`. A copy-ready skeleton with comments is in `templates/filter-config-template.ts`.

## FilterOperations

Static methods only:

- `getConfig(key)`, `getAllConfigurations()`, `getEnabledConfigurations(state)`
- `isEnabled(key, state)`, `hasActiveFilters(state)`, `getDisplayText(key, state)`
- `getRemovalUrl(key, segments, queryParams)`: returns `/` if `specialCases.homeRedirect(segments)` is true, else `buildFilterUrl(segments, queryParams, config.getRemovalChanges())`
- `getDefaultFilterState()`, `validateConfiguration()`

```ts
const url = FilterOperations.getRemovalUrl("distance", segments, queryParams);
```

Don't add filter-specific branches here.

## Adding or changing a filter

1. **Config**: add or edit the object in `config/filters.ts`.
2. **URL state**: add the key to `URLFilterState` (and `URLQueryParams` for a query param) in `types/url-filters.ts`; parse it in `parseFiltersFromUrl`/`urlToFilterState` and build it in `buildCanonicalUrlDynamic`/`buildFilterUrl` (`utils/url-filters.ts`), omitting the default. New query filters also go in `hasActiveClientFilters` and in `ALLOWED_QUERY_PARAMS` (`utils/middleware-redirects.ts`, also used for the noindex header).
3. **UI**: input in `NavigationFiltersModal.tsx`; add the value to the `filters` object built in `FiltersClient.tsx`. Chip labels come from `getDisplayText`, translated in `FiltersClient.tsx` (date labels via `filterLabels` from `PlacePageShell.tsx`, category labels via `getCategoryLabel`).
4. **API**: map the value in `useEvents` and pass it along the whole SWR chain: `baseParams`, the `getKey` tuple, the destructured fetcher args, the `pageFetcher({...})` call, then `FetchEventsParams` / `buildEventsQuery`. A value missing from any step never reaches `/api/events`. Follow the `api-layer-patterns` skill.
5. **Test**: `yarn test test/filter-system.test.ts test/filter-validation.test.ts`, then `yarn test:e2e e2e/filters.flow.spec.ts` (needs a running app) and `verify-que-fer` for the UI.

## Category labels

Every UI surface (chip, modal, cards, event page, quick links, home sections) gets a category's text from `getCategoryLabel(slug, backendName, tCategories)` in `utils/category-helpers.ts`: `CATEGORY_CONFIG[slug].labelKey` → `Config.Categories.<labelKey>`, else the backend `name`, else the slug. The chip (`FiltersClient`) and the modal call it on the client with `useTranslations("Config.Categories")` (`Config` already ships to the client in full). A new backend category needs a `CATEGORY_CONFIG` entry (camelCase `labelKey`) and the key in `messages/{ca,es,en}.json`; `test/category-labels.test.tsx` checks both. The SEO phrase `Partials.GeneratePagesData.categories.<slug>.titleSuffix` is for titles and meta descriptions only; no UI component reads it.

## Price

The URL uses `?price=gratis|pagament`; the backend takes `GET /events?price=FREE|PAID` (Spring binds the enum case-sensitively and answers 400 to anything else). `PRICE_FILTER_API_VALUES` (`utils/constants.ts`) maps one to the other; `isPriceFilterValue` and `toPriceFilterApiValue` (`utils/url-filters.ts`) drop any other value, so `?price=junk` shows no chip, doesn't switch the list to client mode and never reaches the backend. `app/api/events/route.ts` forwards only `FREE`/`PAID`. Chip labels come from `Components.Filters.priceFree`/`pricePaid` via `buildFilterLabels` (`PlacePageShell.tsx`).

The backend reads the free-text `event.price`: free words ("gratuït", "gratis", "free", "entrada lliure", …) or a zero amount count as `FREE`; any other amount or "€" as `PAID`. Events with no price match neither, so both filtered lists are smaller than the unfiltered one.
