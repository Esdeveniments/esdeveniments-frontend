---
name: type-system-governance
description: Where TypeScript types, interfaces, props and DTOs live in this repo, and the ESLint rules that enforce it. Use when creating or moving a type, interface, props type or API DTO, or when lint reports "Do not declare types outside of the /types directory".
---

# Type System Governance

Shared and application types (anything used in `app/`, `components/`, `lib/`, `utils/`) live in `types/`. A few config-only types stay next to their config (`config/pricing.ts`, `config/categories.ts`). No `any`: use `unknown` and narrow. Summary in AGENTS.md › Types; layout in `types/README.md`.

## Where a new type goes

| Kind | File | Real examples |
| --- | --- | --- |
| Backend DTO | `types/api/<domain>.ts` | `EventSummaryResponseDTO`, `EventDetailResponseDTO`, `PagedResponseDTO<T>` (`event.ts`); `NewsSummaryResponseDTO` (`news.ts`); `CategorySummaryResponseDTO` (`category.ts`); `CitySummaryResponseDTO` (`city.ts`); `CityDropdownResponseDTO` (`region.ts`) |
| Shared UI types and base component props | `types/common.ts` | `NavigationItem`, `SocialLinks`, `CardProps`, `ButtonProps`, `BreadcrumbItem` |
| Feature component props | `types/props.ts`, or the domain file when the props belong to one domain | `CompactCardProps`, `FavoriteButtonProps`, `ClientImageInnerProps`; `EventHeaderProps` (`event.ts`), sponsor props (`sponsor.ts`) |
| Domain types | `types/<domain>.ts` | `FilterConfig` (`filters.ts`), `AppLocale` + `SUPPORTED_LOCALES` (`i18n.ts`), event form types (`event.ts`) |

Import with the bare `types/*` alias, e.g. `import type { CardProps } from "types/common"`. Don't use `@types/*` (clashes with npm type packages). There is no `types/index.ts`; import from the file that defines the type.

## Before adding a type

1. Search `types/` for the name and for a similar shape (`grep -rn "interface .*Props" types/`).
2. Reuse or extend (`extends`, `Pick`, `Omit`) an existing type. Derived props types (e.g. a `Pick<>` of existing props) also go in `types/`, usually `types/props.ts`.
3. Run `yarn typecheck && yarn lint`.

## What ESLint enforces (`eslint.config.mjs`)

- `no-restricted-syntax` errors on any `type` or `interface` declaration in `components/`, `app/`, `utils/`, `lib/` and `**/store.ts`. Other files (e.g. in `config/`, `scripts/`, `test/`) are not checked unless they are named `store.ts`, but keep shared types in `types/` anyway.
- Inside `types/` (except `types/common.ts` and `types/api/city.ts`), redeclaring `NavigationItem`, `SocialLinks` or `CitySummaryResponseDTO` is an error (canonical homes: `types/common.ts`, `types/api/city.ts`). The guard also lists `EventProps`, which no longer exists. `@typescript-eslint/no-unused-vars` is an error in `types/` except those two files; there and everywhere else it is a warning.
- The rule matches declarations only. An inline object type in a generic argument (e.g. `forwardRef<HTMLButtonElement, {...}>` in `components/ui/common/button/index.tsx`) slips through; don't copy that, use a named type from `types/`.

## Consolidating duplicates

Pick the most complete definition, move it to its canonical file, update every import, delete the copies, then `yarn typecheck && yarn lint`.
