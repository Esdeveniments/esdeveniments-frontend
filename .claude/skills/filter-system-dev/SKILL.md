---
name: filter-system-dev
description: How the listing filters work (place, category, byDate, distance, searchTerm; price is ready but disabled) and how to add or change one. Use when editing config/filters.ts, utils/filter-operations.ts, filter chips (FiltersClient), the filters modal (NavigationFiltersModal), filter URL parsing/building, or when re-enabling the price filter or debugging filter removal URLs.
---

# Filter system

## How it fits together

| Piece | File | Role |
| --- | --- | --- |
| Filter configs | `config/filters.ts` (`FILTER_CONFIGURATIONS`) | One object per filter: active state, chip text, what to clear on removal |
| Config type | `types/filters.ts` (`FilterConfig`, `FilterDisplayState`) | Shape of each config |
| Operations | `utils/filter-operations.ts` (`FilterOperations`) | Generic helpers over the configs |
| Chips UI | `components/ui/filters/FiltersClient.tsx` | Renders a removable chip per active filter |
| Filters modal | `components/ui/filtersModal/NavigationFiltersModal.tsx` | Inputs for place, date, category, distance (price is commented out) |
| URL state | `types/url-filters.ts`, `utils/url-filters.ts` | `URLFilterState`, `URLQueryParams`, `RouteSegments`; parse and build URLs |
| Data | `components/hooks/useEvents.ts` | Maps URL filters to API params (SWR) |

The configs drive the chips: whether a filter is active, its label, and its removal URL. URL parsing/building in `utils/url-filters.ts` and the API mapping in `useEvents` are written per filter; they don't read the configs. URL rules (canonical shape, `tots`, noindex, no `searchParams` in pages) are in the `url-canonicalization` skill.

Current keys: `place`, `category`, `byDate`, `distance`, `searchTerm` (`searchTerm` never shows a chip; the search box shows it).

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
3. **UI**: input in `NavigationFiltersModal.tsx`; add the value to the `filters` object built in `FiltersClient.tsx`. Chip labels come from `getDisplayText` (translated in `FiltersClient.tsx` via labels from `ServerFilters.tsx`).
4. **API**: map the value in `useEvents` and pass it along the whole SWR chain: `baseParams`, the `getKey` tuple, the destructured fetcher args, the `pageFetcher({...})` call, then `FetchEventsParams` / `buildEventsQuery`. A value missing from any step never reaches `/api/events`. Follow the `api-layer-patterns` skill.
5. **Test**: `yarn test test/filter-system.test.ts test/filter-validation.test.ts`, then `yarn test:e2e e2e/filters.flow.spec.ts` (needs a running app) and `verify-que-fer` for the UI.

## Re-enabling price

Price is wired for state and URLs (`price=gratis|pagament`, parsed, built, noindexed, chip label) but disabled because the backend ignores `type=FREE|PAID`. When the backend supports it:

1. Uncomment the `price` config in `config/filters.ts`.
2. Uncomment `localPrice` state and the price `<fieldset>` in `NavigationFiltersModal.tsx`.
3. Forward it: `useEvents` doesn't send `price` to the API today. Add a `type` field to `FetchEventsParams`, map `gratis` → `FREE`, `pagament` → `PAID` in `useEvents`, carry it through the SWR chain from step 4 above (`baseParams`, `getKey` tuple, fetcher destructuring, `pageFetcher` object) into `buildEventsQuery`, and read it in `app/api/events/route.ts` (the route picks params one by one).
4. Run the tests above.
