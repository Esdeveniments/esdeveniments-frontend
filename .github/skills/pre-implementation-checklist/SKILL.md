---
name: pre-implementation-checklist
description: Mandatory search-before-coding checklist for this repo — where existing helpers, constants, types, hooks and components live, and the anti-patterns that caused incidents. Use first, before writing any new feature, component, utility, type, hook, constant or API call.
---

# Pre-Implementation Checklist

Workflow (search → plan → wait for confirmation → implement → verify) and the red-flag list: AGENTS.md › Workflow.

## 1. Search before writing

Search for the concept, name patterns (`isValid*`, `format*`, `build*`, `get*`, `use*`) and literal values (regexes, numbers, slugs). Report what you found before proposing code, e.g.:

- "Found `isValidCategorySlugFormat` in `utils/category-mapping.ts`, will reuse."
- "Found `useImageRetry` in `components/hooks/`, will extend."
- "Nothing similar found; will add it to `utils/<file>.ts`."

## 2. Where to look first

| Creating | Look in |
| --- | --- |
| Type / interface | `types/` (`types/README.md`); base props like `ButtonProps`, `CardProps` in `types/common.ts`, feature props in `types/props.ts`, DTOs in `types/api/` |
| Validation | `utils/category-mapping.ts` (`isValidCategorySlugFormat`), `utils/url-filters.ts` (`isValidCategorySlug`), Zod schemas in `lib/validation/` |
| URL building/parsing | `utils/url-filters.ts`, `utils/url-parsing.ts`, `utils/filter-operations.ts` |
| Filter defaults | `config/filters.ts` (e.g. distance `defaultValue: 50`) |
| Constants | `utils/constants.ts` (`BYDATES`, `DATE_RANGE_SHORTCUTS`, `DISTANCES`, `DEFAULT_FILTER_VALUE`, …), `config/` |
| Dates | `utils/date-helpers.ts` (`getFormattedDate`) |
| API calls | `lib/api/` (+ query builders in `utils/api-helpers.ts`) |
| Fetching other services | `utils/safe-fetch.ts` |
| Hooks | `components/hooks/` |
| Components | `components/ui/` feature folders (`common/`, `primitives/`, `card/`, `filters/`, `EventForm/`, `publish/`, `hybridEventsList/`, …), `components/partials/` |

## 3. Anti-patterns

- **Writing first, searching later.** E.g. a new slug regex when `isValidCategorySlugFormat` exists.
- **Inline types.** `type Props = {...}` in a component; ESLint blocks it. See `type-system-governance`.
- **Duplicated literals.** Hardcoding `50`, `"tots"` or the byDate list instead of importing from `config/filters.ts` / `utils/constants.ts`.
- **One-use helpers.** Inline simple logic; extract only when reused.
- **Barrel files.** Never add an `index.ts` that re-exports `"use client"` components from different routes; import files directly. (Historical: `components/ui/sponsor/index.ts`, now deleted, added 24 KB to `/[place]`.) See AGENTS.md › Hard rules.
- **Time-dependent rendering without `connection()`.** A server component that branches on `new Date()` must `await connection()` first or use `"use cache"` with `cacheLife`. See AGENTS.md › Hard rules.

## 4. Before the PR

- [ ] Reported what you found and reused it
- [ ] Types in `types/`, constants imported, no one-use helpers, no barrels
- [ ] `yarn lint && yarn typecheck && yarn test`; `verify-que-fer` for UI/behavior changes
