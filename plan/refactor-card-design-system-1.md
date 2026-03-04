---
goal: "Event Card Design Refactor - Competitor-Benchmarked, DRY, Abbreviated Dates"
version: 1.0
date_created: 2026-02-27
last_updated: 2026-02-27
owner: cursor/development-environment-setup-4b46
status: "Completed"
tags:
  - refactor
  - ui
  - design-system
  - cards
  - DRY
  - i18n
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This branch (`cursor/development-environment-setup-4b46`) implements a comprehensive **event card design refactor** driven by competitive analysis against Eventbrite, DICE, Meetup, AllEvents, and Time Out. The work was done in 5 iterative commits over ~3 hours, each refining the previous based on deeper analysis. The final state optimizes for **discovery velocity** (how many events a user can meaningfully evaluate per minute) rather than raw time-on-site.

**Core thesis**: The card's job is NOT to keep people scrolling. The card's job is to give enough **information scent** that users can quickly decide "yes, I want to know more" or "no, skip." The faster that assessment, the more events evaluated per session, and the higher the chance of finding something worth attending.

**What changed**: 24 files modified, 765 insertions, 720 deletions. Net delta: +45 lines. The refactor consolidated 3 separate data preparation code paths into 1, extracted 2 reusable UI components, added abbreviated date formatting for 3 locales (ca/es/en), and fixed multiple data display issues found via live screenshot analysis.

**Branch**: `cursor/development-environment-setup-4b46` (5 commits on top of `a55d05bd` from `develop`)

**Commits** (chronological):

1. `5e87dbf2` - feat(ui): redesign event cards with contained layout, image-first hierarchy, and consolidated metadata
2. `70375f66` - feat(ui): bold card redesign - 2-col grid, image zoom, gradient overlays, category badges, elevated surfaces
3. `4f234791` - feat(ui): competitor-benchmarked card redesign - 3-col grid, clean images, colored dates, FREE badge
4. `0282ee27` - refactor(ui): principled card design - 2-col grid, category badges, muted dates, no FREE badge
5. `06f1f982` - refactor(cards): DRY card system with abbreviated dates, unified data prep, and shared components

**Related branches** (built on top of this work, separate branches):

- `feat/profile-pages` - Venue/organizer profile pages (`/perfil/[slug]`)
- `feat/auth-system` - Provider-agnostic auth system (login, register, roles, navbar integration)

## 1. Requirements & Constraints

### Requirements (from competitive analysis)

- **REQ-001**: Abbreviate dates on cards - no year for current-year events, abbreviated weekday + month names. Competitors (Eventbrite, DICE, Google Events) convey the same date information in 12-20 characters; the old format used 40-55 characters, causing truncation on carousel/compact cards.
- **REQ-002**: Drop "Check schedules" (Consultar horaris) filler text from cards - show time only when there IS a time. This filler text appeared on 50%+ of events (scraped events without explicit start times) and added zero decision signal.
- **REQ-003**: Location on listing cards = city + region only, no venue address. Venue name (e.g., "Razzmatazz 2 - Barcelona") caused redundant "Barcelona, Barcelona, Barcelones" via `buildDisplayLocation`. Venue address belongs on the detail page. Competitors show only city-level location on cards.
- **REQ-004**: Compact (related events) card date color must be muted, not primary/red. The title should be the visual anchor, not the date. Standard cards already used muted dates.
- **REQ-005**: Add time display to compact cards - previously not computed at all. Time helps users assess "could I also attend this?" when viewing related events.
- **REQ-006**: Reduce ViewCounter space on cards - `min-w-[80px]` was disproportionate for icon + 2-3 digit number. Low view counts (29, 31) add no decision signal at that size.
- **REQ-007**: Localize category badges - use `getLocalizedCategoryLabelFromConfig` instead of raw API `firstCategory.name`. Cards were the only place showing unlocalized category names.

### DRY & Code Quality Requirements

- **DRY-001**: All 3 card variants (standard, carousel, compact) must share a single data preparation function (`prepareCardContentData`). Previously, `CardContentServer` used `prepareCardContentData`, `CardHorizontalServer` did everything from scratch, and `EventsAroundServer` had inline data prep - 3 separate code paths that would diverge on any formatting change.
- **DRY-002**: Extract compact card rendering from `EventsAroundServer` into its own `CompactCard` component. The inline rendering (lines 170-227 of original) mixed card design with carousel layout concerns and could not be tested or reused independently.
- **DRY-003**: Extract a shared `CategoryBadge` sub-component with a `size` prop. Two slightly different badge implementations existed (standard: `top-2.5 left-2.5 px-2.5 py-1 text-xs` vs horizontal: `top-2 left-2 px-2 py-0.5 text-[11px]`).

### Constraints (from project conventions)

- **CON-001**: All types must live in `types/` directory (ESLint-enforced). New types `CardVariant`, `CategoryBadgeProps` in `types/ui.ts`; `CompactCardProps`, `FavoriteButtonLabels` in `types/props.ts`.
- **CON-002**: Server Components by default. `CardContentServer`, `CardHorizontalServer`, `CompactCard`, `CategoryBadge` are all Server Components.
- **CON-003**: No barrel files mixing `"use client"` components from different routes.
- **CON-004**: Design system semantic classes - no `gray-*` colors. Used `text-muted-foreground`, `text-foreground/60`, `text-foreground-strong`, `bg-muted`, `bg-background`, `border-border`.
- **CON-005**: i18n - all user-facing strings through locale files. New `daysShort` and `monthsShort` arrays added to all 3 locale files (ca, es, en).
- **CON-006**: Listing grid stays at `grid-cols-1 md:grid-cols-2` (not 3 columns) - the card content area needs sufficient width for 2-line titles and the date+time+location hierarchy.

### Patterns Followed

- **PAT-001**: `prepareCardContentData` pattern - centralized data preparation, separating data logic from rendering. Extended with `variant` parameter.
- **PAT-002**: Frosted glass badge pattern - `bg-background/90 backdrop-blur-sm rounded-badge` for category badges on image overlays.
- **PAT-003**: `formatCardDate` follows same signature pattern as existing `getFormattedDate` but optimized for card display (abbreviated, year-conditional).

## 2. Implementation Steps

### Phase 1: Card Redesign - Image-First Layout

- GOAL-001: Transition from text-heavy vertical cards to an image-first contained layout with consolidated metadata.

| Task     | Description                                                                                             | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Change card image ratio to consistent 3:2 (`aspect-[3/2]`) for standard and carousel, 4:3 for compact   | Yes       | 2026-02-27 |
| TASK-002 | Add subtle hover zoom on card images (`group-hover:scale-[1.03]`, `transition-transform duration-slow`) | Yes       | 2026-02-27 |
| TASK-003 | Add frosted category badge on card image (top-left, `bg-background/90 backdrop-blur-sm`)                | Yes       | 2026-02-27 |
| TASK-004 | Consolidate date + time on one line: `{cardDate} . {timeDisplay}`                                       | Yes       | 2026-02-27 |
| TASK-005 | Move favorite button to image overlay (top-right, glass morphism via `FavoriteButtonOverlay`)           | Yes       | 2026-02-27 |
| TASK-006 | Remove share buttons from cards - shares belong on event detail page                                    | Yes       | 2026-02-27 |
| TASK-007 | Switch listing layout from `flex flex-col` to `grid grid-cols-1 md:grid-cols-2 gap-4`                   | Yes       | 2026-02-27 |
| TASK-008 | Ad cards span full grid width (`md:col-span-2`)                                                         | Yes       | 2026-02-27 |
| TASK-009 | Update skeleton/loading components to match new card structure                                          | Yes       | 2026-02-27 |

### Phase 2: Data Display Fixes - What to Show, In What Order

- GOAL-002: Fix the information hierarchy based on competitive analysis and live screenshot review. Reading order per card: Image (60%) -> Date line (abbreviated, time only if real) -> Title (bold, 2-line clamp) -> Location (city + region, pin icon).

| Task     | Description                                                                                                                                                                           | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-010 | Create `formatCardDate()` in `utils/date-helpers.ts` - abbreviated weekday + day + abbreviated month, omit year for current-year events. E.g., "Ds. 28 feb." (ca), "Sat, Feb 28" (en) | Yes       | 2026-02-27 |
| TASK-011 | Add `daysShort` and `monthsShort` arrays to `messages/ca.json`, `messages/es.json`, `messages/en.json`                                                                                | Yes       | 2026-02-27 |
| TASK-012 | Add `getShortDayNames()` and `getShortMonthNames()` helpers to `utils/constants.ts`                                                                                                   | Yes       | 2026-02-27 |
| TASK-013 | Replace `getFormattedDate()` usage on cards with `formatCardDate()`                                                                                                                   | Yes       | 2026-02-27 |
| TASK-014 | Remove "Check schedules" filler from card display - `timeDisplay` is empty string when no real time exists                                                                            | Yes       | 2026-02-27 |
| TASK-015 | Switch standard card location from `buildDisplayLocation` (venue + city duplication) to `buildEventPlaceLabels` (city + region only)                                                  | Yes       | 2026-02-27 |
| TASK-016 | Change compact card date color from `text-primary` (red) to `text-muted-foreground`                                                                                                   | Yes       | 2026-02-27 |
| TASK-017 | Add time display to compact cards via `prepareCardContentData`                                                                                                                        | Yes       | 2026-02-27 |
| TASK-018 | Localize category badges via `getLocalizedCategoryLabelFromConfig`                                                                                                                    | Yes       | 2026-02-27 |

### Phase 3: DRY Consolidation - One Data Prep, Shared Components

- GOAL-003: Eliminate 3 separate data preparation paths and 2 duplicated badge implementations.

| Task     | Description                                                                                                                                          | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-019 | Add `CardVariant` type to `types/ui.ts`                                                                                                              | Yes       | 2026-02-27 |
| TASK-020 | Extend `prepareCardContentData()` with `variant` parameter - centralizes truncation, location, dates, time, categories, favorites for all 3 variants | Yes       | 2026-02-27 |
| TASK-021 | Refactor `CardHorizontalServer` to use `prepareCardContentData({ variant: "carousel" })` - removes ~30 lines of duplicated logic                     | Yes       | 2026-02-27 |
| TASK-022 | Extract `CompactCard` component from inline rendering in `EventsAroundServer`                                                                        | Yes       | 2026-02-27 |
| TASK-023 | Add `CompactCardProps` interface to `types/props.ts`                                                                                                 | Yes       | 2026-02-27 |
| TASK-024 | Extract `CategoryBadge` component with `size` prop                                                                                                   | Yes       | 2026-02-27 |
| TASK-025 | Add `CategoryBadgeProps` interface to `types/ui.ts`                                                                                                  | Yes       | 2026-02-27 |
| TASK-026 | Reduce `ViewCounter` min-width: `min-w-0` in hideText mode (cards) vs `min-w-[80px]` in full mode. Icon size adapts accordingly                      | Yes       | 2026-02-27 |
| TASK-027 | Remove hardcoded `style={{ minWidth: 80 }}` from `ViewCounterIsland`                                                                                 | Yes       | 2026-02-27 |
| TASK-028 | Widen compact cards from `w-40 min-w-[10rem]` to `w-44 min-w-[11rem]` for better title readability                                                   | Yes       | 2026-02-27 |
| TASK-029 | Add `FavoriteButtonLabels` interface to `types/props.ts`                                                                                             | Yes       | 2026-02-27 |

### Phase 4: Testing

- GOAL-004: Ensure refactored data prep logic is tested and existing tests pass.

| Task     | Description                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-030 | Extend `test/prepareCardContentData.test.ts` - 11 test cases covering variant truncation, time display, location, categories, multiday dates, 00:00 suppression | Yes       | 2026-02-27 |
| TASK-031 | All existing tests pass (100 files, 1408 tests)                                                                                                                 | Yes       | 2026-02-27 |
| TASK-032 | `yarn typecheck` - 0 errors                                                                                                                                     | Yes       | 2026-02-27 |
| TASK-033 | `yarn lint` - 0 errors (55 pre-existing warnings unchanged)                                                                                                     | Yes       | 2026-02-27 |

## 3. Alternatives

- **ALT-001**: **3-column grid on desktop (`lg:grid-cols-3`)** - Considered to increase density. Rejected because 2 columns gives cards enough width for titles and metadata without truncation.
- **ALT-002**: **Free/Paid badge on cards** - `event.type` exists but defaults to "FREE" unreliably. Deferred until backend improves data quality.
- **ALT-003**: **Relative date labels (Avui/Dema)** - Decided against: requires timezone-aware comparison, abbreviated format is already scannable, cached SSR pages would show stale "today".
- **ALT-004**: **"Popular" indicator for high-view events** - View counts are unstable during early data collection. Deferred.
- **ALT-005**: **Using `Intl.DateTimeFormat`** - Output varies by OS/locale and doesn't match the project pattern of explicit locale arrays. Custom `formatCardDate` gives deterministic, testable output.

## 4. Dependencies

- **DEP-001**: `@heroicons/react` - `MapPinIcon` for compact card location. Already a project dependency.
- **DEP-002**: `next-intl` - `getTranslations` for category localization. Already a project dependency.
- **DEP-003**: No new npm dependencies were added.

## 5. Files

### New Files (2 components)

- **FILE-001**: `components/ui/common/cardContent/CategoryBadge.tsx` - Shared category badge with `size` prop ("sm" | "default"). 18 lines.
- **FILE-002**: `components/ui/common/cardContent/CompactCard.tsx` - Extracted compact card component for related events. Uses `prepareCardContentData({ variant: "compact" })`. 71 lines.

### Key Modified Files

- **FILE-003**: `components/ui/common/cardContent/prepareCardContentData.ts` - Extended from standard-only to all 3 variants via `variant` parameter. Centralizes title truncation (75/60/50), location (`buildEventPlaceLabels` for all), dates (`formatCardDate`), time display (suppress filler), category localization, and favorites.
- **FILE-004**: `components/ui/common/cardContent/CardContentServer.tsx` - Simplified: delegates all data prep to `prepareCardContentData({ variant: "standard" })`, uses shared `CategoryBadge`. Image-first layout with 3:2 aspect ratio.
- **FILE-005**: `components/ui/common/cardContent/CardContentClient.tsx` - Parallel simplification for client-rendered cards (SWR pagination).
- **FILE-006**: `components/ui/cardHorizontal/CardHorizontalServer.tsx` - Removed ~30 lines of manual data prep. Now uses `prepareCardContentData({ variant: "carousel" })` + `CategoryBadge size="sm"`.
- **FILE-007**: `components/ui/eventsAround/EventsAroundServer.tsx` - Removed ~60 lines of inline compact card rendering. Now imports `CompactCard`. Loading skeleton simplified.
- **FILE-008**: `components/ui/list/index.tsx` - Layout changed from `flex flex-col justify-center items-center` to `grid grid-cols-1 md:grid-cols-2 gap-4`. Ad cards use `md:col-span-2`.
- **FILE-009**: `components/ui/viewCounter/index.tsx` - Conditional `min-w-0` in hideText mode (cards), `min-w-[80px]` in full mode. Icon size: `w-4 h-4` vs `w-5 h-5`.
- **FILE-010**: `components/ui/viewCounter/ViewCounterIsland.tsx` - Removed hardcoded `style={{ minWidth: 80 }}`.
- **FILE-011**: `utils/date-helpers.ts` - Added `formatCardDate()` (74 lines). Abbreviated weekday + day + abbreviated month, conditional year, multi-day range support. Locale-aware for ca/es/en.
- **FILE-012**: `utils/constants.ts` - Added `getShortDayNames()` and `getShortMonthNames()` reading from locale message files.
- **FILE-013**: `messages/ca.json` - Added `daysShort` and `monthsShort` arrays (Catalan abbreviations).
- **FILE-014**: `messages/es.json` - Added `daysShort` and `monthsShort` arrays (Spanish abbreviations).
- **FILE-015**: `messages/en.json` - Added `daysShort` and `monthsShort` arrays (English abbreviations).
- **FILE-016**: `types/ui.ts` - Added `CardVariant` type and `CategoryBadgeProps` interface.
- **FILE-017**: `types/props.ts` - Added `CompactCardProps` and `FavoriteButtonLabels` interfaces.
- **FILE-018**: `test/prepareCardContentData.test.ts` - Extended from 4 to 11 test cases.
- **FILE-019**: `components/ui/common/skeletons/EventCardSkeleton.tsx` - Updated to match new card structure.
- **FILE-020**: `components/ui/cardLoading/index.tsx` - Updated to match new card structure.

## 6. Testing

- **TEST-001**: `prepareCardContentData` - variant-specific truncation (standard=75, carousel=60, compact=50 max chars)
- **TEST-002**: Time display with start time only ("14:30")
- **TEST-003**: Time display with start + end time range ("14:30 - 18:00")
- **TEST-004**: Time display suppression when `startTime` is "00:00" (no filler text)
- **TEST-005**: Same start/end time normalization (show single time, not range)
- **TEST-006**: Location building via `buildEventPlaceLabels` (city + region, no venue)
- **TEST-007**: Category localization via `getLocalizedCategoryLabelFromConfig`
- **TEST-008**: Multiday date formatting (start - end range)
- **TEST-009**: Favorite labels derived from `tCard` translations
- **TEST-010**: `isHorizontal` legacy compat maps to "carousel" variant
- **TEST-011**: Empty categories array handling (no badge rendered)
- **TEST-012**: All 1408 existing tests pass (`yarn test`)
- **TEST-013**: `yarn typecheck` - 0 errors; `yarn lint` - 0 errors

## 7. Risks & Assumptions

- **RISK-001**: **Abbreviated dates may confuse users accustomed to full format** - Mitigated: event detail page still shows full dates; abbreviated format matches all major competitors.
- **RISK-002**: **Locale arrays could get out of sync with full-form arrays** - Mitigated: placed as sibling arrays in the same JSON files, same 7-day/12-month structure.
- **RISK-003**: **Removing venue from listing cards could lose context for well-known venues** - Mitigated: venue visible on detail page; city + region provides the "is this near me?" signal that matters for browse.
- **ASSUMPTION-001**: `buildEventPlaceLabels` is the correct location display for all card contexts - verified by checking carousel and compact cards were already using it successfully.
- **ASSUMPTION-002**: Current year can be determined at render time via `new Date().getFullYear()` - works because cards are SSR-rendered or client-hydrated within the same calendar year.

## 8. Related Specifications / Further Reading

- Competitive analysis: Eventbrite 2025 redesign, DICE card patterns, Meetup 2025/2026 redesign, AllEvents Spotlight, Time Out, Google Events
- Design system conventions: `.github/skills/design-system-conventions/SKILL.md`
- Card component architecture: `components/ui/common/cardContent/` directory
- Date formatting: `utils/date-helpers.ts` (both `getFormattedDate` for detail pages and `formatCardDate` for cards)
- Related branches: `feat/profile-pages` and `feat/auth-system` were built on top of these card changes in subsequent work
