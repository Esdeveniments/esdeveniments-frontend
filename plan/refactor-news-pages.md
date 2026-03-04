# Refactor Plan — News Pages (`/noticies`)

**Created**: March 4, 2026
**Status**: Pending implementation
**Branch**: card-redesign (continuation)
**Assessment origin**: Competitive audit + side-by-side comparison with redesigned event cards

---

## Table of Contents

1. [Context & Objectives](#1-context--objectives)
2. [Design Decisions (resolved)](#2-design-decisions-resolved)
3. [Task List (ordered by priority)](#3-task-list-ordered-by-priority)
4. [File-by-File Change Map](#4-file-by-file-change-map)
5. [Competitive Reference](#5-competitive-reference)
6. [Testing & Verification](#6-testing--verification)
7. [Out of Scope / Future](#7-out-of-scope--future)

---

## 1. Context & Objectives

The event card redesign (Feb–Mar 2026) standardized a DRY architecture (`prepareCardContentData`, `CardLayout`, `CategoryBadge`, `formatCardDate`) for all event card variants. The news section was built before this redesign and has accumulated inconsistencies:

- **Design system violations**: Raw `bg-gray-200` in skeletons, hardcoded Catalan strings.
- **Date format mismatch**: News cards use verbose `getFormattedDate()` while event cards use abbreviated `formatCardDate()`.
- **No shared data preparation**: NewsCard and NewsRichCard each do inline data prep vs. centralized `prepareCardContentData`.
- **Missing editorial features**: No hero image on articles, no related articles section, no social sharing — all standard on Time Out and Eventbrite blog.
- **Containment mismatch**: News cards use `card-elevated` (shadow-only) while event cards use `border border-border/20` (border + subtle shadow).

### Goal

Bring news pages to the same quality bar as the redesigned event cards and event detail page, while respecting intentional differences between editorial and event content.

---

## 2. Design Decisions (resolved)

Two open questions required design decisions. Both resolved based on competitive analysis:

### Decision 1: Keep descriptions on news cards

**Question**: Event cards intentionally exclude descriptions (design-rationale.md §5.2). Should news cards also drop them?

**Decision**: **KEEP descriptions on news cards.**

**Rationale**:

- News articles are **editorial content** — descriptions are hand-written, unique, and carry real signal about what the roundup covers.
- Event card descriptions are often template-generated or scraped, making them low-signal. That's why they were excluded.
- **Time Out** article cards show 2-3 line description excerpts. **Eventbrite blog** cards show excerpts. Every editorial platform provides a textual preview.
- The explicit "Read More" button is also appropriate for editorial content (unlike event cards where the whole card is the CTA).
- This creates an **intentional, defensible differentiation**: event cards optimize for _discovery velocity_ (scan fast), news cards optimize for _editorial engagement_ (read preview → click to explore the curated list).

**Action**: No change to description rendering on `NewsCard` or `NewsRichCard`. Document this as intentional in design-rationale.md.

### Decision 2: Align containment, keep 16:9 ratio

**Question**: Should news cards adopt the same visual containment as event cards?

**Decision**: **Align containment (border style), keep 16:9 image ratio.**

**Rationale**:

- **Containment**: A platform should have one visual language for "card." Having `card-elevated` (shadow-only) for news and `border border-border/20` for events creates inconsistency, especially on pages where both appear side by side (event detail page shows `LatestNewsSection` with `NewsCard` below event cards with `CardLayout`). All competitors use one consistent card style.
- **Image ratio**: 16:9 is the editorial standard for blog/article thumbnails (Time Out, Eventbrite blog, Medium, Substack). 3:2 works better for vertical event posters. This is a legitimate content-type differentiation, not an inconsistency.
- **Hover effects**: Align scale factor (`scale-[1.03]` not `scale-105` = 5%) and title hover color (`text-primary/85` not `text-primary`) for consistency.

**Action**: Replace `card-elevated` → `border border-border/20 hover:border-border/40` on `NewsCard` and `NewsRichCard`. Keep `aspect-[16/9]`. Align hover transitions.

---

## 3. Task List (ordered by priority)

### P0 — Design System / i18n Violations (must-fix)

#### TASK-001: Fix `NewsArticleSkeleton` raw gray colors

- **File**: `components/noticies/NewsArticleSkeleton.tsx`
- **What**: Rewrite the entire file. Current file has 8× `bg-gray-200`, raw `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, and `border-b border-border` wrapper. Layout must match the actual `NewsArticleDetail` container (`container flex-col justify-center items-center mt-8 pb-section-y-lg`).

  **Replace entire file content** with:

  ```tsx
  export default function NewsArticleSkeleton() {
    return (
      <div className="container flex-col justify-center items-center mt-8 pb-section-y-lg">
        {/* Breadcrumbs Skeleton */}
        <div className="mb-6 w-full px-2 lg:px-0">
          <div className="h-5 w-64 bg-muted animate-pulse rounded" />
        </div>

        {/* Main Content Skeleton */}
        <div className="w-full px-2 lg:px-0">
          <div className="mb-6">
            <div className="h-10 w-3/4 bg-muted animate-pulse rounded mb-6" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
              <div className="h-8 w-48 bg-muted animate-pulse rounded-full" />
              <div className="h-6 w-32 bg-muted animate-pulse rounded mt-4 md:mt-0" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="my-8 h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }
  ```

- **Why**: Violates design system rule: "NEVER use `gray-*` colors" (copilot-instructions.md §20). Layout must match `NewsArticleDetail` container to avoid CLS.
- **Effort**: 10 min
- **Verification**: Visual inspection of skeleton in Suspense fallback. `yarn lint`.

#### TASK-002: Fix `NewsRichCard` hardcoded Catalan aria-label

- **File**: `components/ui/newsRichCard/index.tsx`
- **What**: Replace `aria-label={\`Veure categoria ${primaryCategory.name}\`}`with`aria-label={t("viewCategory", { name: primaryCategory.name })}`— the same pattern already used in the`horizontal` variant at line 104.
- **Why**: Breaks i18n for `es` and `en` locales. Screen readers in those locales hear Catalan.
- **Effort**: 2 min
- **Verification**: `yarn lint`. Check that `Components.News.viewCategory` key exists in all 3 locale files.

#### TASK-003: Fix `NewsHubsGrid` heading missing semantic class

- **File**: `components/noticies/NewsHubsGrid.tsx` (line 74)
- **What**: On line 74, replace:
  ```tsx
  <h2 className="uppercase">
  ```
  with:
  ```tsx
  <h2 className="heading-2 uppercase">
  ```
  Use `heading-2` (not `heading-3`) — this is a section-level heading under the page `h1` on `/noticies`.
- **Why**: All headings must use semantic typography classes (design system §20).
- **Effort**: 2 min
- **Verification**: Visual check of hub grid section. `yarn lint`.

---

### P1 — Date Format Consistency

#### TASK-004: Switch `NewsCard` to abbreviated dates

- **File**: `components/ui/newsCard/index.tsx`
- **What**:
  1. Replace `import { getFormattedDate } from "@utils/date-helpers"` with `import { formatCardDate } from "@utils/date-helpers"`.
  2. Replace the date formatting logic:

     ```tsx
     // Before
     const formatted = getFormattedDate(event.startDate, event.endDate, locale);
     const dateLabel = formatted.formattedEnd
       ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
       : formatted.formattedStart;

     // After
     const { cardDate: dateLabel } = formatCardDate(
       event.startDate,
       event.endDate,
       locale,
     );
     ```

- **Why**: design-rationale.md §2.2 explicitly chose abbreviated dates for cards. News cards appear alongside event cards on the event detail page (`LatestNewsSection`).
- **Effort**: 10 min
- **Verification**: Visual comparison of date display on `/noticies`. Confirm abbreviated format in all 3 locales.

#### TASK-005: Switch `NewsRichCard` to abbreviated dates

- **File**: `components/ui/newsRichCard/index.tsx`
- **What**:
  1. Change import (line 4):
     ```tsx
     // Before
     import { getFormattedDate } from "@utils/date-helpers";
     // After
     import { formatCardDate } from "@utils/date-helpers";
     ```
  2. Replace date logic (lines 23-26):

     ```tsx
     // Before
     const formatted = getFormattedDate(event.startDate, event.endDate, locale);
     const dateLabel = formatted.formattedEnd
       ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
       : formatted.formattedStart;

     // After
     const { cardDate: dateLabel } = formatCardDate(
       event.startDate,
       event.endDate,
       locale,
     );
     ```

     `formatCardDate` signature: `(start: string, end?: string, locale?: AppLocale) => { cardDate: string; isMultiDay: boolean }`. Produces abbreviated format like "Ds. 28 feb." (ca), "Sáb. 28 feb." (es), "Sat, Feb 28" (en).

- **Why**: Same reasoning as TASK-004. `NewsRichCard` renders event cards within article detail — dates must be abbreviated on cards.
- **Effort**: 5 min
- **Verification**: Check article detail page event cards show abbreviated dates.

**Note**: `NewsArticleDetail.tsx` keeps `getFormattedDate` for the article header type badge (verbose dates acceptable on detail pages, not on cards). This aligns with event detail page keeping verbose dates.

---

### P2 — Visual Containment Alignment

#### TASK-006: Align `NewsCard` containment with event cards

- **File**: `components/ui/newsCard/index.tsx` (default variant only — hero variant keeps its own style)
- **What**: Three exact string replacements in the default variant’s return block (starts ~line 127):
  1. **Article container** (~line 130). Replace:

     ```tsx
     <article className="card-elevated group w-full overflow-hidden">
     ```

     with:

     ```tsx
     <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group w-full">
     ```

     Reference: Event card `CardLayout.tsx` uses `className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group h-full flex flex-col"`. We match the base but omit `h-full flex flex-col` (NewsCard has different internal layout).

  2. **Image hover scale** (~line 148). Replace:

     ```tsx
     className =
       "aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105";
     ```

     with:

     ```tsx
     className =
       "aspect-[16/9] w-full object-cover transition-transform group-hover:scale-[1.03]";
     ```

  3. **Title hover color** (~line 156). In the `<h3>` className, replace:
     ```
     group-hover:text-primary transition-colors
     ```
     with:
     ```
     group-hover:text-primary/85 transition-colors
     ```
     Keep all other classes in that `<h3>` unchanged.

  `duration-normal` is a valid custom Tailwind token defined in `tailwind.config.js`.

- **Why**: Consistent card visual language across the platform. See Decision 2 above.
- **Effort**: 15 min
- **Verification**: Side-by-side visual check of news cards vs. event cards on the event detail page (both appear). Verify hover behavior matches.

#### TASK-007: Align `NewsRichCard` containment with event cards

- **File**: `components/ui/newsRichCard/index.tsx`
- **What**: Six exact replacements — 3 per variant:

  **Horizontal variant** (starts ~line 52):
  1. **Article container** (~line 52). Replace:
     ```tsx
     <article className="card-elevated group w-full overflow-hidden">
     ```
     with:
     ```tsx
     <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group w-full">
     ```
  2. **Image hover scale** (~line 74). Replace `group-hover:scale-105` with `group-hover:scale-[1.03]`
  3. **Title hover color** (~line 81). Replace `group-hover:text-primary transition-colors` with `group-hover:text-primary/85 transition-colors`

  **Default variant** (starts ~line 140): 4. **Article container** (~line 140). Same replacement as step 1. 5. **Image hover scale** (~line 152). Replace `group-hover:scale-105` with `group-hover:scale-[1.03]` 6. **Title hover color** (~line 166). Replace `group-hover:text-primary transition-colors` with `group-hover:text-primary/85 transition-colors`

  **Note**: Both variants have identical `<article className="card-elevated group w-full overflow-hidden">` — replace **both** occurrences in the file.

- **Effort**: 15 min
- **Verification**: Check article detail page cards (both numbered and grid sections). Both variants must show border, `scale-[1.03]`, and `text-primary/85` on hover.

---

### P3 — Code Quality / DRY

#### TASK-008: Remove local `withLocalePath` duplicate from `NewsArticleDetail`

- **File**: `components/noticies/NewsArticleDetail.tsx`
- **What**: Five changes:
  1. **Update import** (line 18). Change:

     ```tsx
     import { getLocaleSafely } from "@utils/i18n-seo";
     ```

     to:

     ```tsx
     import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
     ```

  2. **Remove `DEFAULT_LOCALE` from types import** (lines 19-22). Change:

     ```tsx
     import { DEFAULT_LOCALE, localeToHrefLang } from "types/i18n";
     ```

     to:

     ```tsx
     import { localeToHrefLang } from "types/i18n";
     ```

     (`DEFAULT_LOCALE` was only used in the local closure being removed.)

  3. **Delete local closure** (lines 88-95). Remove these 8 lines entirely:

     ```tsx
     const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
     const withLocalePath = (path: string) => {
       if (!path.startsWith("/")) return path;
       if (!localePrefix) return path;
       if (path === "/") return localePrefix || "/";
       if (path.startsWith(localePrefix)) return path;
       return `${localePrefix}${path}`;
     };
     ```

  4. **Update `absolute` function** (line 96). Change:

     ```tsx
     const absolute = (path: string) =>
       path.startsWith("http") ? path : `${siteUrl}${withLocalePath(path)}`;
     ```

     to:

     ```tsx
     const absolute = (path: string) =>
       path.startsWith("http")
         ? path
         : `${siteUrl}${withLocalePath(path, locale)}`;
     ```

  5. **Update all breadcrumb callsites** (4 occurrences). Add `locale` as second argument:
     - `withLocalePath("/")` → `withLocalePath("/", locale)` (~line 170)
     - `withLocalePath("/noticies")` → `withLocalePath("/noticies", locale)` (~line 182)
     - `withLocalePath(\`/noticies/${place}\`)` → `withLocalePath(\`/noticies/${place}\`, locale)` (~line 192)

  The shared `withLocalePath` from `@utils/i18n-seo` (line 126 of that file) has signature: `(path: string, locale: AppLocale) => string`. It handles absolute URLs, double-prefixing, and default locale (returns path unchanged).

- **Why**: DRY violation. The shared function is tested and handles edge cases (protocol-relative, double-prefix). The local copy could drift.
- **Effort**: 10 min
- **Verification**: `yarn typecheck`. Check all breadcrumb/link URLs in article detail across all 3 locales.

#### TASK-009: Extract `EventsSection` from `NewsArticleDetail`

- **File**: `components/noticies/NewsArticleDetail.tsx` → new file `components/noticies/NewsEventsSection.tsx`
- **What**:
  1. **Create new file** `components/noticies/NewsEventsSection.tsx` (Server Component — no `"use client"`):

     ```tsx
     import type { NewsEventsSectionProps } from "types/props";
     import NewsRichCard from "@components/ui/newsRichCard";

     export default function NewsEventsSection({
       title,
       events,
       showNumbered = false,
     }: NewsEventsSectionProps) {
       return (
         <section className="mb-12 sm:mb-16">
           <div className="mb-6 sm:mb-8">
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground-strong mb-3">
               {title}
             </h2>
             <div className="w-20 h-1.5 bg-primary rounded-full"></div>
           </div>
           {showNumbered ? (
             <div className="space-y-6 sm:space-y-8">
               {events.map((event, index) => (
                 <div
                   key={event.id}
                   className="flex gap-4 sm:gap-6 items-start"
                 >
                   <div className="flex-shrink-0 w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                     {index + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                     <NewsRichCard event={event} variant="horizontal" />
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
               {events.map((event) => (
                 <NewsRichCard key={event.id} event={event} />
               ))}
             </div>
           )}
         </section>
       );
     }
     ```

  2. **In `NewsArticleDetail.tsx`**: Delete the `function EventsSection(...)` block (lines 264–299). Add import:

     ```tsx
     import NewsEventsSection from "@components/noticies/NewsEventsSection";
     ```

  3. **Replace both render callsites** in `NewsArticleDetail.tsx`:
     - `<EventsSection` → `<NewsEventsSection` (~line 252)
     - `<EventsSection` → `<NewsEventsSection` (~line 258)

- **Why**: ~36-line component with its own props type (`NewsEventsSectionProps` in `types/props.ts`) — should be a standalone file per project convention (max 100 lines per function, prefer composition).
- **Effort**: 10 min
- **Verification**: `yarn typecheck && yarn lint`. Visual parity with current rendering.

#### TASK-010: Create `NewsListSkeleton` that matches `NewsCard` layout

- **File**: `components/noticies/NewsListSkeleton.tsx`
- **What**: Replace the entire file content. Current file imports `EventCardSkeleton` (3:2 ratio, no description). Replace with a news-specific skeleton matching `NewsCard` default layout.

  **Replace entire file content** with:

  ```tsx
  export default function NewsListSkeleton() {
    return (
      <section className="flex flex-col gap-6 px-2 lg:px-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full">
            <NewsCardSkeleton />
          </div>
        ))}
      </section>
    );
  }

  function NewsCardSkeleton() {
    return (
      <div className="rounded-card overflow-hidden bg-background border border-border/20">
        {/* 16:9 image placeholder (matches NewsCard aspect-[16/9]) */}
        <div className="aspect-[16/9] w-full bg-muted animate-pulse" />
        <div className="p-4 sm:p-6">
          {/* Title (matches h3 with 2 lines) */}
          <div className="mb-4">
            <div className="h-5 w-full bg-muted animate-pulse rounded mb-2" />
            <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          </div>
          {/* Badge row: date + location (matches badge-default) */}
          <div className="mb-4 flex items-center gap-2">
            <div className="h-6 w-32 bg-muted animate-pulse rounded-badge" />
            <div className="h-6 w-28 bg-muted animate-pulse rounded-badge" />
          </div>
          {/* Description (3 lines, matches line-clamp-3) */}
          <div className="space-y-2 mb-5">
            <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
            <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
            <div className="h-3.5 w-2/3 bg-muted animate-pulse rounded" />
          </div>
          {/* Read More button */}
          <div className="h-8 w-24 bg-muted animate-pulse rounded-button" />
        </div>
      </div>
    );
  }
  ```

  Uses `border border-border/20` containment (matching TASK-006), `bg-muted` for all placeholders, `rounded-badge` for badge shapes, `rounded-button` for button shape.

- **Why**: Current skeleton uses `EventCardSkeleton` (3:2 ratio, no description block), creating visible layout shift on content load. Skeletons must match the shape of the final content.
- **Effort**: 20 min
- **Verification**: Load `/noticies` with network throttling to observe skeleton → content transition. No CLS.

---

### P4 — Editorial Features (content gaps)

#### TASK-011: Add hero image to article detail page

- **File**: `components/noticies/NewsArticleDetail.tsx`
- **What**:
  1. **Add imports** (at top, alongside existing imports):

     ```tsx
     import { buildPictureSourceUrls } from "@utils/image-cache";
     import {
       getOptimalImageQuality,
       getOptimalImageWidth,
       getOptimalImageSizes,
     } from "@utils/image-quality";
     ```

  2. **Compute hero sources** (add after `const absolute = ...`, before `const categoryKeywords = ...`):

     ```tsx
     // Hero image from first event (if available)
     const heroImageUrl = detail.events?.[0]?.imageUrl;
     const heroSources = heroImageUrl
       ? buildPictureSourceUrls(heroImageUrl, detail.events![0].hash, {
           width: getOptimalImageWidth("hero"),
           quality: getOptimalImageQuality({
             isPriority: true,
             isExternal: true,
           }),
         })
       : null;
     const heroSizes = getOptimalImageSizes("hero");
     ```

  3. **Render hero image in JSX** (insert between the closing `</nav>` of breadcrumbs and `{/* Main Content */}`, i.e. after line ~213 and before line ~215):
     ```tsx
     {
       /* Hero Image */
     }
     {
       heroSources && (
         <div className="mb-6 w-full px-2 lg:px-0">
           <div className="rounded-card overflow-hidden">
             <picture>
               <source
                 srcSet={heroSources.avif}
                 type="image/avif"
                 sizes={heroSizes}
               />
               <source
                 srcSet={heroSources.webp}
                 type="image/webp"
                 sizes={heroSizes}
               />
               <img
                 src={heroSources.fallback}
                 alt={detail.title}
                 loading="eager"
                 fetchPriority="high"
                 decoding="sync"
                 sizes={heroSizes}
                 className="aspect-[16/9] w-full object-cover"
               />
             </picture>
           </div>
         </div>
       );
     }
     ```

  If `detail.events` is empty or `imageUrl` is `null`, no hero renders (no placeholder).

- **Why**: Every editorial platform opens articles with a hero visual. Currently the first visual element is an ad slot. The OG meta image is already `detail.events?.[0]?.imageUrl`, so data is available.
- **Competitors**: Time Out: full-width featured image. Eventbrite blog: hero with overlay.
- **Effort**: 25 min
- **Verification**: Check articles with 0, 1, and 3+ events. Verify no CLS. Check OG image matches hero.

#### TASK-012: Render `relatedNews` section on article detail

- **File**: `components/noticies/NewsArticleDetail.tsx`
- **What**:
  1. **Add import** (at top):

     ```tsx
     import NewsCard from "@components/ui/newsCard";
     ```

     (`NewsCard` is not currently imported in this file.)

  2. **Add JSX** after both `NewsEventsSection` blocks (after the `detail.events.length > 3` conditional ~line 260) and before the closing `</div>` of the main content wrapper:

     ```tsx
     {
       /* Related Articles */
     }
     {
       detail.relatedNews && detail.relatedNews.length > 0 && (
         <section className="mt-12 sm:mt-16">
           <h2 className="heading-2 mb-6">{t("relatedArticles")}</h2>
           <div className="flex flex-col gap-6">
             {detail.relatedNews.slice(0, 3).map((item) => (
               <NewsCard
                 key={item.id}
                 event={item}
                 placeSlug={item.city?.slug || item.region?.slug || place}
                 placeLabel={
                   item.city?.name || item.region?.name || placeType.label
                 }
               />
             ))}
           </div>
         </section>
       );
     }
     ```

     **Data mapping**: `detail.relatedNews` is `NewsSummaryResponseDTO[]` — same type as `NewsCardProps.event`. Each item has optional `city?: CitySummaryResponseDTO` (with `slug` and `name`) and `region?: RegionSummaryResponseDTO`. Fall back to the current article's `place` param and `placeType.label`.

  3. **Add translation keys** under `App.NewsArticleDetail` namespace in all 3 locale files:
     - `messages/ca.json` (line ~181, after `"moreProposals"`):
       ```json
       "relatedArticles": "Articles relacionats"
       ```
     - `messages/es.json` (same namespace location):
       ```json
       "relatedArticles": "Artículos relacionados"
       ```
     - `messages/en.json` (same namespace location):
       ```json
       "relatedArticles": "Related articles"
       ```
       The key is accessed as `t("relatedArticles")` using the existing `const t = await getTranslations({ locale, namespace: "App.NewsArticleDetail" })`.

- **Why**: Backend provides `relatedNews` (see `NewsDetailResponseDTO.relatedNews` in `types/api/news.ts` line 63) but UI ignores it. Every editorial platform shows related content.
- **Effort**: 25 min
- **Verification**: Find an article where backend returns relatedNews (check API response). If none do yet, verify the section gracefully doesn't render (the `length > 0` guard handles this).

#### TASK-013: Add breadcrumb reusable component for news routes

- **File**: New `components/noticies/NewsBreadcrumb.tsx` (Server Component — no `"use client"`)
- **What**:
  1. **Add type** to `types/props.ts`:

     ```tsx
     export interface BreadcrumbItem {
       label: string;
       href?: string; // Omit for current page (last item)
     }

     export interface NewsBreadcrumbProps {
       items: BreadcrumbItem[];
     }
     ```

  2. **Create** `components/noticies/NewsBreadcrumb.tsx`:

     ```tsx
     import { Fragment } from "react";
     import PressableAnchor from "@components/ui/primitives/PressableAnchor";
     import type { NewsBreadcrumbProps } from "types/props";

     export default function NewsBreadcrumb({ items }: NewsBreadcrumbProps) {
       return (
         <nav
           aria-label="Breadcrumb"
           className="mb-6 w-full px-2 lg:px-0 body-small text-foreground-strong/70"
         >
           <ol className="flex items-center space-x-2 flex-wrap">
             {items.map((item, index) => {
               const isLast = index === items.length - 1;
               return (
                 <Fragment key={index}>
                   {index > 0 && (
                     <li>
                       <span className="mx-1" aria-hidden="true">
                         /
                       </span>
                     </li>
                   )}
                   <li
                     className={
                       isLast
                         ? "text-foreground-strong font-medium truncate max-w-[200px] sm:max-w-none"
                         : undefined
                     }
                     aria-current={isLast ? "page" : undefined}
                   >
                     {item.href ? (
                       <PressableAnchor
                         href={item.href}
                         className="hover:underline hover:text-primary transition-colors"
                         variant="inline"
                         prefetch={false}
                       >
                         {item.label}
                       </PressableAnchor>
                     ) : (
                       item.label
                     )}
                   </li>
                 </Fragment>
               );
             })}
           </ol>
         </nav>
       );
     }
     ```

     Uses `flex-wrap` (from the article detail variant) so longer breadcrumbs can wrap. Truncation (`max-w-[200px] sm:max-w-none`) applies only to the last item.

  3. **Replace breadcrumb `<nav>` blocks** in 3 files (callers pre-build localized hrefs, component just renders):
     - `app/noticies/page.tsx` (lines 127-149): Replace with:
       ```tsx
       <NewsBreadcrumb
         items={[
           { label: t("breadcrumbHome"), href: withLocale("/") },
           { label: t("breadcrumbCurrent") },
         ]}
       />
       ```
     - `app/noticies/[place]/page.tsx` (lines 135-164): Replace with:
       ```tsx
       <NewsBreadcrumb
         items={[
           { label: t("breadcrumbHome"), href: withLocale("/") },
           { label: t("breadcrumbNews"), href: withLocale("/noticies") },
           { label: placeLabel },
         ]}
       />
       ```
     - `components/noticies/NewsArticleDetail.tsx` (lines 166-213): Replace with:
       ```tsx
       <NewsBreadcrumb
         items={[
           { label: t("breadcrumbHome"), href: withLocalePath("/", locale) },
           {
             label: t("breadcrumbNews"),
             href: withLocalePath("/noticies", locale),
           },
           {
             label: placeType.label,
             href: withLocalePath(`/noticies/${place}`, locale),
           },
           { label: detail.title },
         ]}
       />
       ```

  **Note**: JSON-LD breadcrumb schemas stay in the parent page files (they use `generateBreadcrumbList()` and `generateWebPageSchema()` — not part of this visual component).

- **Why**: Same breadcrumb markup appears in 3 files with identical structure, only differing in items. Classic DRY extraction.
- **Effort**: 25 min
- **Verification**: `yarn typecheck && yarn lint`. Visual parity on all 3 news routes. Check `aria-label`, `aria-current="page"` on last item, separator rendering.

#### TASK-014: Add social sharing buttons to article detail page

- **Files**: 3 files modified, 1 file created
- **Approach**: Modify existing `CardShareButton` to accept an optional `url` prop. Then create a thin `NewsShareButtons` wrapper. This avoids duplicating the `react-share` integration.
- **What**:
  1. **Update type** in `types/common.ts` (line 343):

     ```tsx
     // Before
     export interface CardShareButtonProps {
       slug: string;
     }
     // After
     export interface CardShareButtonProps {
       slug: string;
       url?: string; // If provided, used as share URL. Otherwise defaults to `${siteUrl}/e/${slug}`.
     }
     ```

  2. **Update `CardShareButton`** in `components/ui/common/cardShareButton/index.tsx` (line 17-18):

     ```tsx
     // Before
     export default function CardShareButton({ slug }: CardShareButtonProps): JSX.Element {
       const eventUrl = `${siteUrl}/e/${slug}`;
     // After
     export default function CardShareButton({ slug, url }: CardShareButtonProps): JSX.Element {
       const eventUrl = url || `${siteUrl}/e/${slug}`;
     ```

     All existing callers pass only `slug` → backward compatible.

  3. **Create** `components/noticies/NewsShareButtons.tsx` (`"use client"` — wraps react-share component):

     ```tsx
     "use client";

     import dynamic from "next/dynamic";
     import { siteUrl } from "@config/index";

     const CardShareButton = dynamic(
       () => import("@components/ui/common/cardShareButton"),
       { ssr: false },
     );

     interface NewsShareButtonsProps {
       place: string;
       slug: string;
       label: string;
     }

     export default function NewsShareButtons({
       place,
       slug,
       label,
     }: NewsShareButtonsProps) {
       const articleUrl = `${siteUrl}/noticies/${place}/${slug}`;
       return (
         <div className="flex items-center gap-2" aria-label={label}>
           <CardShareButton slug={slug} url={articleUrl} />
         </div>
       );
     }
     ```

     Uses same dynamic import pattern as `DesktopShareIsland.tsx`. Share URL is canonical (no locale prefix, matching event share URL convention). `slug` is passed for GA analytics tracking.

  4. **Render in `NewsArticleDetail.tsx`** — import and place in two locations:

     ```tsx
     import NewsShareButtons from "@components/noticies/NewsShareButtons";
     ```

     **Above article** (insert after the type badge/reading time `<div>` block, before `{plainDescription && (`, around line ~233):

     ```tsx
     <NewsShareButtons place={place} slug={article} label={t("shareArticle")} />
     ```

     **Below article** (insert after both `NewsEventsSection` blocks, before related articles section, around line ~260):

     ```tsx
     <NewsShareButtons place={place} slug={article} label={t("shareArticle")} />
     ```

     `article` is the route param (same as slug). `place` is also a route param.

  5. **Add translation keys** under `App.NewsArticleDetail` namespace:
     - `messages/ca.json`: `"shareArticle": "Comparteix l'article"`
     - `messages/es.json`: `"shareArticle": "Compartir el artículo"`
     - `messages/en.json`: `"shareArticle": "Share this article"`

- **Why**: Every competitor has social sharing. Catorze.cat's dual-placement (above + below) is the most user-friendly pattern. We already have `react-share` and `CardShareButton` — this is a 1-line type change + thin wrapper.
- **Effort**: 25 min
- **Verification**: Check share buttons render above and below article. Click each button to verify correct URL opens. Check GA events fire in devtools Network tab.

#### ~~TASK-015: Create `NewsGridSkeleton`~~ — REMOVED (YAGNI)

- **Removed**: After auditing the code, `EventCardSkeleton` is **not used** in the article detail context. The article detail page (`app/noticies/[place]/[article]/page.tsx`, line 121) wraps the entire `NewsArticleDetail` component in a single `<Suspense fallback={<NewsArticleSkeleton />}>`. There is no separate Suspense boundary around the events grid within the article. The `NewsArticleSkeleton` already provides a full-page skeleton (fixed by TASK-001). No grid skeleton replacement is needed.
- **The only file using `EventCardSkeleton`** is `NewsListSkeleton.tsx`, which is already handled by TASK-010.

---

## 4. File-by-File Change Map

| File                                             | Tasks                                            | Changes                                                                                         |
| ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `components/noticies/NewsArticleSkeleton.tsx`    | TASK-001                                         | Replace 8× `bg-gray-200` → `bg-muted`, replace raw layout → `container`                         |
| `components/ui/newsRichCard/index.tsx`           | TASK-002, TASK-005, TASK-007                     | Fix aria-label, switch to `formatCardDate`, align containment                                   |
| `components/noticies/NewsHubsGrid.tsx`           | TASK-003                                         | Add `heading-2` class to heading                                                                |
| `components/ui/newsCard/index.tsx`               | TASK-004, TASK-006                               | Switch to `formatCardDate`, align containment                                                   |
| `components/noticies/NewsArticleDetail.tsx`      | TASK-008, TASK-009, TASK-011, TASK-012, TASK-014 | Remove local util, extract `EventsSection`, add hero image, add related news, add share buttons |
| `components/noticies/NewsListSkeleton.tsx`       | TASK-010                                         | Replace `EventCardSkeleton` with news-specific skeleton                                         |
| `components/noticies/NewsBreadcrumb.tsx`         | TASK-013                                         | New shared breadcrumb component                                                                 |
| `components/noticies/NewsShareButtons.tsx`       | TASK-014                                         | New share buttons wrapper (reuses `CardShareButton` / `react-share`)                            |
| `components/ui/common/cardShareButton/index.tsx` | TASK-014                                         | Generalize to accept `url` prop (not just event slug)                                           |
| `app/noticies/page.tsx`                          | TASK-013                                         | Replace inline breadcrumb → `NewsBreadcrumb`                                                    |
| `app/noticies/[place]/page.tsx`                  | TASK-013                                         | Replace inline breadcrumb → `NewsBreadcrumb`                                                    |
| `types/props.ts`                                 | TASK-013                                         | Add `NewsBreadcrumbProps`                                                                       |
| `messages/ca.json`                               | TASK-012, TASK-014                               | Add `relatedArticles`, `shareArticle` keys                                                      |
| `messages/es.json`                               | TASK-012, TASK-014                               | Add `relatedArticles`, `shareArticle` keys                                                      |
| `messages/en.json`                               | TASK-012, TASK-014                               | Add `relatedArticles`, `shareArticle` keys                                                      |
| `docs/design-rationale.md`                       | Post-impl                                        | Add §8 "News Pages Design Decisions" documenting the editorial vs. event card differentiation   |

---

## 5. Competitive Reference

> **Updated March 4, 2026** — All findings below validated via actual browser screenshots and accessibility-tree inspection using `agent-browser`. Screenshots archived in `/tmp/` during the session.

### 5.1 Sites Analyzed

| Site                   | URL                               | Status                          | Content model                                                              |
| ---------------------- | --------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| **Time Out Barcelona** | timeout.com/barcelona             | ✅ Analyzed (article + listing) | Curated "best of" listicles with numbered items per article                |
| **Eventbrite Blog**    | eventbrite.com/blog               | ✅ Analyzed (index)             | Multi-section editorial hub (Editors' Picks, Trending, Tips & Guides)      |
| **Catorze.cat**        | catorze.cat                       | ✅ Analyzed (home + article)    | Catalan literary/cultural magazine — closest editorial model to us         |
| **Nuvol.com**          | nuvol.com                         | ✅ Analyzed (homepage only)     | Catalan cultural digital newspaper — sectioned homepage with carousels     |
| **Barcelona Cultura**  | barcelona.cat/barcelonacultura/ca | ✅ Analyzed (homepage)          | City government cultural agenda — category-filtered, date-stamped articles |
| **Fever Magazine**     | feverup.com/es/barcelona/magazine | ❌ Server error                 | Not available                                                              |
| **Guia del Ocio**      | guiadelocio.com/barcelona         | ❌ DNS failure                  | Not available                                                              |

### 5.2 Editorial Listing Page Patterns

| Feature                   | Time Out                                                    | Eventbrite Blog                                                  | Catorze.cat                                              | Nuvol.com                                                       | Barcelona Cultura                                                             | Our `/noticies` (current)            | Our `/noticies` (target)                                        |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| **Layout**                | Category h5 → title → description cards; "Show more" button | Multi-section (Editors' Picks carousel → grid → Trending → Tags) | Magazine grid: featured article (large) + smaller cards  | Sectioned carousels by content type (Opinion, Interviews, etc.) | Hero carousel + "Actualitat cultural" date-stamped list + "Agenda recomanada" | Single vertical stack of cards ❌    | Keep single stack (our content volume doesn't warrant sections) |
| **Image ratio**           | ~16:9                                                       | ~16:9                                                            | ~16:9 / mixed                                            | ~16:9                                                           | ~16:9                                                                         | 16:9 ✅                              | 16:9 (keep)                                                     |
| **Containment**           | Border + shadow                                             | Card with shadow                                                 | Flat (no border/shadow, relies on whitespace)            | Flat with section dividers                                      | Flat list items                                                               | Shadow only (`card-elevated`) ❌     | Border-based (align with events)                                |
| **Description preview**   | ✅ 2-3 lines                                                | ✅ 2-3 lines                                                     | ✅ Full excerpts                                         | ✅ 1-2 lines                                                    | ✅ 1-2 lines                                                                  | ✅ 3 lines                           | ✅ Keep (editorial signal)                                      |
| **Date format**           | Not shown on listing cards                                  | Not shown on listing cards                                       | Not shown (column name instead)                          | Not shown (article type label instead)                          | ✅ Absolute "DD/MM/YYYY - HH:MM h"                                            | Verbose full date ❌                 | Abbreviated ✅                                                  |
| **Category / type label** | h5 above title (e.g., "Hotels", "Things to do")             | Category tag + "X min read"                                      | Column/section name (e.g., "Beneïda sou vós", "Crítica") | Article type (e.g., "Opinió", "Parlem amb...")                  | None (categories are in nav bar)                                              | ✅ Type badge (WEEKEND/WEEK)         | Keep ✅                                                         |
| **Author**                | Not on listing cards                                        | Not on listing cards                                             | ✅ Author name on every card                             | ✅ Author name on every card                                    | Not shown                                                                     | Not shown                            | Skip (no author data)                                           |
| **Pagination**            | "Show more" button                                          | Sectioned with "See all →" per section                           | Infinite scroll (implicit)                               | Carousel arrows (❮ ❯) per section                               | None visible (single view)                                                    | Prev/next links (no page numbers) ❌ | Keep (works, SEO-friendly; improvement deferred)                |
| **Newsletter CTA**        | ✅ Inline "Sign up" with email field between content        | ✅ Prominent inline form between sections                        | ✅ "Dona suport a Catorze" (donation, not newsletter)    | ✅ "Subscriu-te als nostres butlletins"                         | ❌                                                                            | ❌                                   | ⏳ Future                                                       |
| **Location**              | City in URL path                                            | ❌                                                               | ❌                                                       | ❌                                                              | ❌ (Barcelona-only)                                                           | ✅ `badge-default` with icon         | Keep ✅ (unique differentiator)                                 |

### 5.3 Article Detail Page Patterns

| Feature                   | Time Out                                                                                                                                               | Catorze.cat                                                                                                          | Nuvol.com                              | Barcelona Cultura                         | Our Article Detail (current)                                                           | Our Article Detail (target)                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Hero image**            | ✅ Full-width (LCP)                                                                                                                                    | ✅ Full-width with photo credit                                                                                      | ✅ (paywall blocked further analysis)  | ✅                                        | ❌ Missing                                                                             | ✅ Add from first event image                              |
| **Heading hierarchy**     | h1 title → description                                                                                                                                 | h1 title → h2 subtitle/pull quote                                                                                    | h1 title                               | h3 title                                  | h1 title only                                                                          | ✅ Keep h1 (our titles are descriptive enough)             |
| **Author/attribution**    | ✅ Name + profile link + linked photo                                                                                                                  | ✅ Author name as link to author profile                                                                             | ✅ Author name linked                  | ❌                                        | ❌ "Esdeveniments.cat" only                                                            | ❌ Skip (no author data from backend)                      |
| **Share buttons**         | ✅ Social links below hero                                                                                                                             | ✅ **Dual placement**: above article + below article (X, WhatsApp, Telegram, Facebook)                               | Unknown (paywall)                      | ❌                                        | ❌ None                                                                                | ✅ Dual placement (TASK-014)                               |
| **Related articles**      | Implied in numbered list                                                                                                                               | ✅ "Contingut relacionat" — 4 cards with images at article bottom                                                    | Unknown                                | Implied via "Actualitat cultural" section | ❌ Data exists, not rendered                                                           | ✅ Render relatedNews (max 3)                              |
| **Article structure**     | Editorial intro → "How we curate" transparency → Numbered list (1-16+) with image + text per item → inline newsletter after item 1 → ads between items | Column breadcrumb + section link → author → social → paragraphs → footnote about the column → social (again) → dates | Sectioned with sub-articles            | Simple paragraphs                         | Breadcrumbs → h1 → type badge → reading time/visits → description → ad → EventsSection | Keep (our EventsSection structure is unique value-add)     |
| **Reading time**          | ❌                                                                                                                                                     | ❌                                                                                                                   | ❌                                     | ❌                                        | ✅ Shown                                                                               | ✅ Keep (unique differentiator — no competitor shows this) |
| **Visit counter**         | ❌                                                                                                                                                     | ❌ (but comments count shown on related articles)                                                                    | ❌                                     | ❌                                        | ✅ Shown                                                                               | ✅ Keep (unique differentiator)                            |
| **Events within article** | Numbered items (1-16+) with individual image + description + "Read more" + "Book online" per item                                                      | N/A (literary content, not event roundups)                                                                           | N/A                                    | N/A                                       | ✅ Top 3 numbered + remaining grid                                                     | ✅ Keep (core value proposition)                           |
| **Type badge**            | Topic tag (h5, e.g., "Things to do")                                                                                                                   | Column name + section link (breadcrumb-like)                                                                         | Article type ("Opinió", "Properament") | ❌                                        | ✅ WEEKEND/WEEK + dates                                                                | ✅ Keep                                                    |
| **Dates**                 | Published date below title                                                                                                                             | ✅ "Data de publicació" + "Última modificació" at bottom                                                             | Unknown                                | ✅ date + time                            | ✅ In type badge                                                                       | Keep                                                       |
| **CTA within items**      | ✅ "Read more" + "Book online" per item                                                                                                                | N/A                                                                                                                  | N/A                                    | N/A                                       | ✅ "Llegir més" per event                                                              | Keep                                                       |
| **Newsletter CTA**        | ✅ Inline after first numbered item                                                                                                                    | ❌ (donation CTA instead)                                                                                            | ✅                                     | ❌                                        | ❌                                                                                     | ⏳ Future                                                  |

### 5.4 Key Competitive Insights

**Validated findings from browser analysis:**

1. **Social sharing is standard** — Catorze.cat's dual-placement (above + below article) is the most user-friendly pattern we observed. Time Out also places social links between hero and content. This should be prioritized in a future phase.

2. **Related content is universal** — Every editorial site with article pages shows related content. Catorze.cat calls it "Contingut relacionat" with 4 image cards. We have `relatedNews` data from the backend but don't render it — easy win.

3. **Author attribution is universal on Catalan editorial sites** — Both Catorze and Nuvol show author names as links to author profile pages on every card and every article. This is a gap for us but requires backend changes.

4. **Inline newsletter/donation CTAs are everywhere** — Time Out, Eventbrite, and Nuvol all interrupt content flow with newsletter signups. Catorze uses a donation CTA instead. We have neither — future opportunity.

5. **Our EventsSection (numbered list + grid) is a genuine competitive advantage** — No other competitor in the Catalan cultural space provides a weekly/weekend roundup article with directly linked event listings. This is our moat and should be preserved and enhanced, not replaced.

6. **Section-based homepages are for high-volume publishers** — Nuvol, Eventbrite, and Barcelona Cultura all use multi-section layouts with carousels because they publish 10+ articles/day across many categories. Our news volume doesn't warrant this complexity — a clean single-column list is appropriate.

7. **Reading time + visit counter are unique to us** — No competitor shows either. These are genuine differentiators that increase perceived value and should be kept.

8. **Date display on listing cards varies widely** — Time Out and Eventbrite don't show dates on listing cards at all. Catalan sites (Catorze, Nuvol) use section/column labels instead. Barcelona Cultura shows precise timestamps. Our abbreviated date format is appropriate since our articles are time-bound (weekend/week roundups).

9. **Hover effects on cards** — Time Out uses subtle scale + shadow increase. Catorze uses no hover effects (flat design). Our target (`scale-[1.03]` + `text-primary/85`) is aligned with Time Out's approach and consistent with our event cards.

---

## 6. Testing & Verification

### After each task

```bash
yarn typecheck && yarn lint
```

### After all tasks complete

```bash
yarn test          # All 100 files / 1401 tests should pass
yarn typecheck     # Clean
yarn lint          # 0 errors
```

### Visual checks (manual)

| Check                  | Route                                | What to verify                                                                                 |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Skeleton colors        | `/noticies` (with throttled network) | No gray shimmer blocks, all use `bg-muted`                                                     |
| News card dates        | `/noticies`                          | Abbreviated format matches event card dates (e.g., "Ds. 28 feb." not "Dissabte, 28 de febrer") |
| News card containment  | `/noticies`                          | Border-based cards, not shadow-only. Hover shows border brightness change                      |
| Article hero image     | `/noticies/[place]/[article]`        | Full-width 16:9 image above title. No image = no placeholder                                   |
| Related articles       | `/noticies/[place]/[article]`        | Section renders if `relatedNews` has items; section absent if empty                            |
| Rich card dates        | `/noticies/[place]/[article]`        | Event cards within articles use abbreviated dates                                              |
| i18n aria-labels       | Switch browser to `es`/`en` locale   | `NewsRichCard` category badges read in correct language                                        |
| Breadcrumbs            | All 3 news routes                    | Consistent rendering, correct links, `aria-current="page"` on last item                        |
| Hub grid headings      | `/noticies` (if hub grid visible)    | Headings use semantic typography class                                                         |
| Event detail page news | `/e/[eventId]`                       | `LatestNewsSection` cards visually consistent with event cards above                           |
| Share buttons above    | `/noticies/[place]/[article]`        | Telegram, WhatsApp, Facebook, X buttons visible between metadata and description               |
| Share buttons below    | `/noticies/[place]/[article]`        | Same share buttons visible after events sections, before related articles                      |

### Locale-specific checks

| Locale | Route          | What to verify                                       |
| ------ | -------------- | ---------------------------------------------------- |
| `ca`   | `/noticies`    | Date: "Ds. 28 feb." pattern                          |
| `es`   | `/es/noticies` | Date: "Sáb. 28 feb." pattern, aria-labels in Spanish |
| `en`   | `/en/noticies` | Date: "Sat, Feb 28" pattern, aria-labels in English  |

---

## 7. Genuinely Blocked (requires backend or infrastructure)

Only items that **cannot be implemented by AI alone** remain here. Everything else has been moved into the task list above.

| Item                                                        | Blocker                                                                                                                                                        | Competitive evidence                                                                                          | Priority if unblocked |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Newsletter CTA in articles**                              | No email service, no subscription management, no form backend. Product + infrastructure decision.                                                              | Time Out: inline after first item. Eventbrite: between sections. Nuvol: "Subscriu-te als nostres butlletins". | Medium                |
| **Author/attribution on articles**                          | Backend API doesn't return author data. Requires API schema change.                                                                                            | Catorze: author linked to profile on every card/article. Nuvol: same. Standard for Catalan editorial sites.   | Medium                |
| **Pagination improvement** (page numbers / infinite scroll) | `searchParams` constraint ($300 DynamoDB incident). "Show more" requires client state + careful ISR design. Current prev/next links are SEO-friendly and work. | No competitor consensus: Time Out "Show more", Eventbrite sections, Nuvol carousels.                          | Low                   |
| **Multi-section listing layout**                            | **Not recommended** — our news volume (~10 articles total vs. 10+/day for Nuvol/Eventbrite) doesn't justify multi-section complexity.                          | Nuvol: sectioned carousels. Eventbrite: Editors' Picks, Trending, etc.                                        | Not recommended       |

---

## Implementation Order

Recommended sequence to minimize risk and enable incremental verification:

```
Phase 1: Quick fixes (P0) — 15 min total
├── TASK-001: NewsArticleSkeleton gray colors
├── TASK-002: NewsRichCard aria-label
└── TASK-003: NewsHubsGrid heading

Phase 2: Date alignment (P1) — 15 min total
├── TASK-004: NewsCard formatCardDate
└── TASK-005: NewsRichCard formatCardDate

Phase 3: Containment alignment (P2) — 30 min total
├── TASK-006: NewsCard containment
└── TASK-007: NewsRichCard containment

Phase 4: Code quality (P3) — 40 min total
├── TASK-008: Remove local withLocalePath
├── TASK-009: Extract EventsSection
└── TASK-010: NewsListSkeleton

Phase 5: Editorial features (P4) — 60 min total
├── TASK-011: Article hero image
├── TASK-012: Related articles section
├── TASK-013: Breadcrumb component
└── TASK-014: Social sharing buttons (dual placement)

Checkpoint: yarn typecheck && yarn lint && yarn test
```

**Estimated total effort**: ~2 hours 45 min (14 tasks)

---

## Appendix: Design Decision Record — News vs. Event Cards

For documentation in `design-rationale.md` §8 after implementation:

| Aspect               | Event Cards                       | News Cards                                                  | Reason for difference                                                                                                                                                                                               |
| -------------------- | --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Image ratio**      | 3:2                               | 16:9                                                        | Events have diverse poster formats (portrait posters benefit from taller ratio). News thumbnails are editorial photography / event hero images — 16:9 is the standard.                                              |
| **Description**      | ❌ Excluded                       | ✅ 3-line excerpt                                           | Event descriptions are often scraped/template-generated (low signal). News descriptions are hand-written editorial summaries (high signal). Time Out, Eventbrite blog, Medium all show previews on editorial cards. |
| **CTA button**       | ❌ Whole card is CTA              | ✅ "Read More" button                                       | Event cards optimize for rapid scanning (discovery velocity). News cards optimize for editorial engagement — the button signals "this is a longer read."                                                            |
| **Category badge**   | ✅ Frosted glass on image         | ✅ `badge-primary` below image                              | NewsRichCard badges are inline with metadata (date, location). Category data comes from events within the article, not from the article itself.                                                                     |
| **Location display** | City, Region (from event data)    | Place name (from article routing)                           | News articles are about a place's weekly/weekend events. The place is structural (in the URL), not metadata.                                                                                                        |
| **Containment**      | `border border-border/20`         | `border border-border/20` (after this refactor)             | **Aligned** — one visual language for "card" across the platform.                                                                                                                                                   |
| **Date format**      | Abbreviated (`formatCardDate`)    | Abbreviated (`formatCardDate`, after this refactor)         | **Aligned** — cards should use abbreviated dates. Verbose dates are for detail pages only.                                                                                                                          |
| **Hover effects**    | `scale-[1.03]`, `text-primary/85` | `scale-[1.03]`, `text-primary/85` (after this refactor)     | **Aligned** — one micro-interaction language across cards.                                                                                                                                                          |
| **Share buttons**    | Desktop/Mobile share islands      | Dual placement: above + below article (after this refactor) | **Enhanced for editorial** — event cards have share on detail page only; news articles get dual placement modeled on Catorze.cat (higher engagement for editorial content).                                         |
