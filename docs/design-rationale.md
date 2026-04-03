# Design Rationale — UI/UX Decisions

**Last updated**: March 2026
**Branch origin**: Card redesign + competitive audit (Feb–Mar 2026)

This document captures the _why_ behind key design decisions, competitive benchmarking findings, and the reasoning for what was implemented vs. what was intentionally rejected. Reference this before proposing UI changes to avoid re-debating settled decisions.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Event Card Design](#2-event-card-design)
3. [Homepage Structure](#3-homepage-structure)
4. [Event Detail Page](#4-event-detail-page)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Intentionally Rejected Patterns](#6-intentionally-rejected-patterns)
7. [Future Opportunities](#7-future-opportunities)
8. [News Pages Design Decisions](#8-news-pages-design-decisions)

---

## 1. Design Philosophy

### Core Metric: Discovery Velocity

We optimize for **discovery velocity** — how many events a user can meaningfully evaluate per minute — not time on site. Time on site is misleading for discovery products: 20 minutes scrolling might mean engagement _or_ inability to find anything good.

Higher velocity → more "yes" moments → more favorites, shares, and return visits.

**Analogy**: Airbnb listing cards show Image + Price + Rating + Location. Assessment takes under 1 second. That's what drives engagement — not making users scroll more, but making each scroll more productive.

### Card's Job

A card must give enough **information scent** for users to quickly decide "yes, I want to know more" or "no, skip." The faster that assessment happens, the more events they evaluate per session.

---

## 2. Event Card Design

### 2.1 Card Variants

| Variant                 | Component                                 | Used In                        | Image Ratio |
| ----------------------- | ----------------------------------------- | ------------------------------ | ----------- |
| Standard (listing grid) | `CardContentServer` / `CardContentClient` | `/[place]` listing pages       | 3:2         |
| Horizontal (carousel)   | `CardHorizontalServer`                    | Homepage categorized sections  | 3:2         |
| Compact (related)       | `CompactCard`                             | Related events on detail pages | 4:3         |

### 2.2 Decisions Made (with rationale)

#### Image-first layout (image above title)

**Decision**: Image at top, title below.
**Why**: Every major event platform (Eventbrite, Meetup, Luma, Google Events, DICE) places image first. Users scan images 60% faster than text. The previous layout (title above image) was the reverse of user expectations.
**Competitors**: Unanimous — image first.

#### 3:2 aspect ratio with `object-cover`

**Decision**: 3:2 ratio for standard/carousel cards, 4:3 for compact.
**Why**: 16:9 is too short for portrait-oriented event posters. 1:1 wastes horizontal space. 2:1 (Eventbrite) was tried but was too wide for a 2-col grid. 3:2 balances visual impact with space efficiency.
**Previous state**: Variable heights with `object-contain` — caused layout instability and unpredictable scrolling.

#### 2-column grid (not 3, not 1)

**Decision**: `grid-cols-1 md:grid-cols-2` on listing pages.
**Why**: This is a cultural events discovery site with wildly diverse imagery (jazz posters vs. school open days vs. festival flyers). Larger images improve visual assessment. 3 columns were tested but made images too small for visual scanning. Eventbrite uses 4-col because their content is visually homogeneous (professional event photos). Our content is not.
**Note**: 3 columns on `xl:` screens (≥1280px) was considered as a future improvement — see §7.

#### Contained cards (border + shadow + rounded corners)

**Decision**: Cards use `card-bordered` / `shadow-sm` with `rounded-card` (12px).
**Why**: Production had no card containment — images/titles/metadata floated in open space separated only by whitespace. This made it hard to parse where one card ended and the next began. All competitors use contained card surfaces.
**Design system**: Uses existing `card-bordered`, `rounded-card`, `shadow-card` tokens.

#### Share buttons removed from cards

**Decision**: No share icons on listing cards. Share is available on the event detail page.
**Why**: With 10+ cards visible, 4 share icons per card = 40+ tiny buttons creating significant visual noise. Eventbrite, Google Events, and Luma all hide share behind a detail view or a single icon. The favorite heart on the image overlay is the right quick action — it's the primary card-level interaction.

#### Abbreviated dates (no year, shortened weekday/month)

**Decision**: "Ds. 28 feb. · 19:45" instead of "Dissabte, 28 de febrer del 2026".
**Why**: Full dates consumed 40-55 characters vs. 12-20 characters on competitors. On carousel cards (~256px wide), dates were truncating to nonsense ("Saturday, February 28, 2026 · Check sch..."). Year is noise when 100% of visible events are current year.
**Implementation**: `formatCardDate()` in `utils/date-helpers.ts` with `daysShort`/`monthsShort` in all 3 locale message files.

#### "Check schedules" removed from cards

**Decision**: When `startTime` is null/00:00, show nothing — not "Consultar horaris".
**Why**: ~50% of scraped events lack specific times. "Check schedules" adds zero decision signal — it's filler text saying "we don't know." On the detail page it's acceptable; on a card where space is premium, it's wasted characters.

#### Location = city + region only (no venue address)

**Decision**: Cards show "Barcelona, Barcelonès" — not "Razzmatazz 2 – Barcelona, Barcelona, Barcelonès".
**Why**: The old `buildDisplayLocation` included venue strings, causing: (1) Redundant city duplication when venue contained the city name via en-dash, (2) Truncation on narrower cards ("Centre Cultural Albareda i Almo2Bar – Barcelona, Barce..."). Venue belongs on the detail page. On cards, users only need "is this near me?" — city + region answers that.
**Implementation**: All card variants now use `buildEventPlaceLabels` consistently.

#### Compact card date in muted color (not red)

**Decision**: Compact related-event cards use `text-muted-foreground` for dates, not `text-primary`.
**Why**: On a related-events section (user is already on a detail page), the title should be the visual anchor, not the date. Red dates on compact cards made dates more dominant than titles, which inverts the information hierarchy.

#### Category badge on image (frosted glass)

**Decision**: Text badge overlay at top-left of image with `bg-background/90 backdrop-blur-sm`.
**Why**: For mixed-category listings, category is the #1 scanning signal. Users need to quickly identify "is this a concert or a workshop?" Color-coded vertical bars (production) required memorizing a color→category mapping and were problematic for colorblind users (~8% of males). Text badges are universally understood. DICE uses a similar approach.
**Localization**: Badges use `getLocalizedCategoryLabelFromConfig` instead of raw API names.

#### View counter behavior

**Decision**: Show visits with reduced visual weight (`min-w` reduced, smaller icon in `hideText` mode). Bar chart icon retained.
**Why**: Low view counts (29, 31) add no social proof signal. Future consideration: threshold display (≥50 only) or reframing as "🔥 Popular" badge. Current implementation reduces space usage without removing the data.

### 2.3 DRY Architecture

All 3 card variants use `prepareCardContentData({ variant })` — a single function that centralizes:

- Title truncation (per-variant config)
- Location building
- Date formatting (including year suppression, card abbreviation)
- Time display
- Category data extraction
- Favorite label construction

**Files**: `prepareCardContentData.ts`, `CompactCard.tsx`, `CategoryBadge.tsx` — extracted to eliminate 3 duplicated data preparation paths.

---

## 3. Homepage Structure

### 3.1 Current Architecture (validated as sound)

```
Hero (text + search + date pills + CTA)
→ Sponsor banner
→ SEO link sections (weekend / today / tomorrow / local agendas)
→ Category buttons ("Explore by interests")
→ Featured places (Barcelona, Maresme, Vallès Occidental) with carousels
→ Category event sections (up to 5 categories) with carousels
→ Bottom CTA ("No trobes el que busques?")
→ Footer
```

### 3.2 Strengths (don't change these)

| Strength                          | Why it matters                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| **Geographic depth**              | No competitor covers all of Catalunya — regions and towns, not just Barcelona       |
| **SEO link architecture**         | Massive internal linking ("Què fer avui a Barcelona") — genuine organic search moat |
| **Date-specific quick filtering** | "Avui / Demà / Cap de setmana" per-section — more granular than any competitor      |
| **Category icons**                | Culturally specific to Catalan events (Festes Populars, Fires i Mercats)            |
| **Content density**               | Dozens of real upcoming events organized by geography + category                    |
| **3-locale i18n**                 | ca/es/en — ahead of all local competitors                                           |

### 3.3 Known Gaps (future opportunities)

| Gap                                   | Competitive reference                               | Priority |
| ------------------------------------- | --------------------------------------------------- | -------- |
| No hero visual/image                  | Eventbrite, Fever, Time Out all use hero photos     | High     |
| No "Popular/Trending" section         | Fever's "Top 10" drives engagement                  | High     |
| No price/free on cards                | Eventbrite/Fever show prominently                   | High     |
| No social proof framing               | Fever uses star ratings; Meetup shows "X going"     | Medium   |
| Sponsor banner before content         | Eventbrite puts ads inline, not before events       | Medium   |
| No newsletter/email capture           | Time Out's primary retention channel                | Medium   |
| Featured places hardcoded (3 regions) | A user from Tarragona sees Barcelona/Maresme first  | Medium   |
| SEO link chips lack visual punch      | Flat gray chips vs. Fever's themed collection cards | Low      |

### 3.4 Hero Image Decision

A castellers (human towers) image was sourced from Unsplash (Andrea Huls Pareja, Barcelona, April 2023). File: `public/static/images/hero-castellers.webp` (1920×1080, 159 KB WebP).

**Why castellers**: Most iconic symbol of Catalan culture (UNESCO Intangible Cultural Heritage). Vibrant yellow/blue palette complements brand red. Upward angle creates aspiration. Sky in upper 40% provides contrast space for white text overlay.

**Usage**: Darkened background behind hero section — `background: linear-gradient(rgba(0,0,0,0.55), ...), url(...)`.

---

## 4. Event Detail Page

### 4.1 Competitive Gaps Identified

| Gap                                 | What competitors do                                                   | Current state                                          |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| **No sticky/floating CTA**          | Eventbrite: "Get Tickets" sticky bar; Fever: persistent "Book" button | No persistent CTA — "ADD TO CALENDAR" is mid-page      |
| **Weak social proof**               | Fever: star ratings; Meetup: "X going" + avatars                      | Visit counter only ("27 visites") — ambiguous          |
| **No price/free display**           | Eventbrite/Fever show prominently                                     | `event.type` exists but not rendered prominently       |
| **Map hidden behind toggle**        | Eventbrite/Meetup show maps inline by default                         | "Show map" toggle adds friction                        |
| **No organizer/source attribution** | Every competitor shows who organized the event                        | None — JSON-LD organizer is always "Esdeveniments.cat" |
| **Single-column on desktop**        | Eventbrite uses 2-col (content left, sticky sidebar right)            | Entirely single-column                                 |
| **Ad error boxes**                  | Competitors show nothing or clean fallback                            | Yellow "L'anunci no s'ha pogut carregar" boxes         |

### 4.2 Unique Differentiators (protect these)

| Feature                             | Why unique                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Weather widget**                  | No major competitor integrates weather. Critical for outdoor Catalan events.                              |
| **Restaurant recommendations**      | Google Places-powered "Where to eat." No competitor does this.                                            |
| **Auto-generated FAQ**              | Provides FAQPage schema for Google rich results. Strong SEO play.                                         |
| **"Explore more plans" link pills** | Post-description date pills ("Què fer avui / demà / aquest cap de setmana") — excellent engagement + SEO. |
| **Translation button**              | Inline "Translate to English" on Catalan descriptions — useful for tourism.                               |
| **Breadcrumb depth**                | Region → City → Category → Event title. Better SEO internal linking than any competitor.                  |
| **Comprehensive structured data**   | Event + FAQ + BreadcrumbList + ItemList. More thorough than any competitor.                               |

### 4.3 Desktop Layout (implemented)

Two-column with sticky sidebar:

- **Left (~60%)**: Hero image → Share bar → Title → Description → Related events → Categories → Weather → FAQ → Restaurants → News
- **Right (~40%, sticky)**: Date & time → Add to calendar → Location + static map → External link → Source attribution → Sponsor

**Components**: `EventSidebar` (server, sticky sidebar), event detail page layout in `app/e/[eventId]/page.tsx`.

### 4.4 Mobile Layout (implemented)

Single column + **sticky bottom CTA bar** with 3 buttons: "Més info" (external link), "Calendar", "Save (❤)".

**Component**: `EventStickyCTA` (client, appears on scroll, positioned above bottom nav).

---

## 5. Competitive Landscape

### 5.1 What Each Competitor Optimizes For

| Platform              | Target user               | Key optimization          | Card strategy                                                      |
| --------------------- | ------------------------- | ------------------------- | ------------------------------------------------------------------ |
| **Eventbrite**        | Ticket buyers             | Conversion (buy tickets)  | Price + "Almost full" urgency. 4-col grid = maximum options.       |
| **Fever**             | Experience seekers        | Curated experiences       | Star ratings + review counts. Numbered "Top 10" rankings.          |
| **Meetup**            | Community seekers         | Social proof (join group) | Attendee avatars + count + ratings.                                |
| **DICE**              | Music fans                | Visual excitement         | Portrait images dominate. Colored dates. Minimal metadata.         |
| **Time Out**          | Tourists + locals         | Editorial authority       | Brand trust as proxy. Listicle format. Newsletter-first retention. |
| **Esdeveniments.cat** | Catalan locals + tourists | Local cultural discovery  | Geographic depth + category diversity + SEO.                       |

### 5.2 What NOT to Copy (and why)

| Pattern                                 | Why we reject it                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Eventbrite's personalization/login wall | We're discovery-first, not a ticketed marketplace. Don't add friction.                                                                     |
| DICE's Spotify integration              | Only for music-only platforms. Our categories are broader.                                                                                 |
| Meetup's community/group model          | We're event-centric, not community-centric. Don't build social features we can't sustain.                                                  |
| "Download the app" pushes               | Time Out research: users prefer mobile web for event browsing. We're already web-first.                                                    |
| Description text on cards               | For our use case (diverse cultural events with often-similar descriptions), titles + images carry the signal. Adding text reduces density. |
| "Interested" / attendee counts          | We don't have attendance data. Don't fake social proof.                                                                                    |
| Price amounts on cards                  | Even if we had the data, displaying "€15" creates comparison shopping. We're discovery, not marketplace. Simple Free/Paid is enough.       |
| 1:1 square image ratio                  | Wastes horizontal space for our content mix.                                                                                               |
| 4+ columns on listing grid              | Too small for our visually diverse content. Professional event photos (Eventbrite) are homogeneous; our content is not.                    |

---

## 6. Intentionally Rejected Patterns

Decisions that were considered, sometimes implemented, and then reverted — with rationale to prevent re-implementation:

| Pattern                                 | Why rejected                                                                                   | Branch evidence                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **3-column grid on listing pages**      | Images too small for visual scanning of diverse event types                                    | Implemented in `4f23479`, reverted — 2-col provides better discovery for heterogeneous content |
| **Gradient overlay on card images**     | Competitors don't use them; darkens images unnecessarily                                       | Implemented then removed — "lets images breathe"                                               |
| **Date pill overlay on image**          | Competitors show date as text below, not as overlay                                            | Added then removed to match industry standard                                                  |
| **GREEN "Free" badge on image**         | (1) `event.type` defaults to "FREE" so data is unreliable, (2) green color clashed with design | Implemented in `4f23479`, removed in `0282ee2`                                                 |
| **Red/primary-colored date text**       | Too dominant when all cards have red dates — they compete with each other and brand CTAs       | Tried, then reverted to muted styling                                                          |
| **Share buttons visible on every card** | 40+ tiny buttons per viewport = visual noise. Share belongs on detail page.                    | Removed in redesign                                                                            |
| **Venue address in card location**      | Causes truncation + city name duplication. Venue is detail-page info.                          | Replaced with city + region only                                                               |
| **"Check schedules" filler text**       | Adds zero signal — tells user "we don't know the time." ~50% of events showed this.            | Suppressed on cards; only real times shown                                                     |

---

## 7. Future Opportunities

Improvements that were identified as valuable but not yet implemented, listed by priority:

### High Priority

| Opportunity                                  | Rationale                                                                                                         | Dependent on                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Card: Free/Paid indicator**                | Top-3 decision factor. Show "Gratuït" when `event.type === "FREE"` — but only when backend data quality improves. | Backend making `event.type` reliable |
| **Homepage: Hero background image**          | Every competitor uses a hero visual. Castellers image already sourced.                                            | CSS + image integration              |
| **Homepage: "Popular ara" trending section** | Fever's Top 10 drives engagement. API provides `visits` data.                                                     | New section component + API call     |

### Completed (formerly High Priority)

| Opportunity                                   | Status                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| **Card: 3-col grid on `xl:` (≥1280px)**       | ✅ Implemented — `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` in `List` component |
| **Event detail: Sticky bottom CTA (mobile)**  | ✅ Implemented — `EventStickyCTA` component                                      |
| **Event detail: Two-column layout (desktop)** | ✅ Implemented — `EventSidebar` with sticky positioning                          |

### Medium Priority

| Opportunity                                            | Rationale                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Card: "Avui" / "Demà" urgency labels**               | Prepend relative temporal label before date for imminent events            |
| **Card: Color-coded category badges**                  | Category-specific pastel backgrounds (pink for concerts, purple for dance) |
| **Card: Venue name in location** (when available)      | "Razzmatazz – Barcelona" is more useful than "Barcelona, Barcelonès"       |
| **Card: "Popular" badge** for high-visit events        | Visual anchor in listings, only above threshold (e.g., ≥100 visits)        |
| **Event detail: Inline static map**                    | Show map thumbnail by default instead of behind toggle                     |
| **Event detail: Source/organizer attribution**         | "Font: premiadedalt.cat" builds trust                                      |
| **Event detail: Collapsible description**              | "Read more" after ~200 chars on mobile                                     |
| **Homepage: Newsletter capture**                       | Email is the #1 retention channel (Time Out model)                         |
| **Homepage: Move sponsor below first content section** | Let event content appear before ads                                        |

### Low Priority / Polish

| Opportunity                                                    | Rationale                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| Card: Multi-day event indicator                                | `isMultiDay` already computed but unused in UI                  |
| Card: Title `leading-normal` + `min-h` for consistent heights  | Polish: prevents single-line titles from collapsing card height |
| Card: Heart button bounce animation on favorite toggle         | Delight: Airbnb/Instagram micro-animation pattern               |
| Card: Branded image placeholders                               | Replace random pastels with consistent branded fallback         |
| Card: View counter `aria-label` for accessibility              | "77 visites" label for screen readers                           |
| Event detail: Collapse ad slots when AdSense fails             | Yellow error boxes damage perceived quality                     |
| Event detail: De-duplicate status/date between sections        | Calendar and Event Details show overlapping info                |
| Homepage: Dynamic featured places by event density/geolocation | Current 3 regions favor BCN/Maresme area                        |

---

## Appendix: Data Available on Event Cards

Every field from `EventSummaryResponseDTO` and its card usage:

| Field                 | Standard           | Carousel           | Compact          | Notes                                     |
| --------------------- | ------------------ | ------------------ | ---------------- | ----------------------------------------- |
| `imageUrl`            | ✅ 3:2             | ✅ 3:2             | ✅ 4:3           | `object-cover` on all                     |
| `title`               | ✅ truncate(75)    | ✅ truncate(60)    | ✅ truncate(50)  | `line-clamp-2` CSS does visual truncation |
| `startDate`/`endDate` | ✅ abbreviated     | ✅ abbreviated     | ✅ abbreviated   | `formatCardDate()`                        |
| `startTime`/`endTime` | ✅ if real time    | ✅ if real time    | ✅ if real time  | Suppresses "00:00" / null                 |
| `categories[0]`       | ✅ frosted badge   | ✅ smaller badge   | ❌ omitted       | Localized via config                      |
| `location`            | ❌ not on cards    | ❌ not on cards    | ❌ not on cards  | Venue belongs on detail page              |
| `city.name`           | ✅ primary label   | ✅ primary label   | ✅ primary label | Via `buildEventPlaceLabels`               |
| `region.name`         | ✅ secondary label | ✅ secondary label | ❌ omitted       | Combined: "City, Region"                  |
| `visits`              | ✅ compact counter | ✅ compact counter | ❌ omitted       | Reduced `min-w` in `hideText` mode        |
| `slug`                | ✅ link + favorite | ✅ link + favorite | ✅ link only     | —                                         |
| `type`                | ❌ not shown       | ❌ not shown       | ❌ not shown     | Data quality concern (defaults to FREE)   |
| `weather`             | ❌ not on cards    | ❌ not on cards    | ❌ not on cards  | Detail page only                          |
| `description`         | ❌ not on cards    | ❌ not on cards    | ❌ not on cards  | Intentionally excluded — see §6           |

---

## 8. News Pages Design Decisions

### Editorial vs. Event Card Differentiation

News articles (`/noticies`) serve a different purpose than event listings: they are **editorial content** that contextualizes events. The design decisions below reflect this distinction while maintaining visual coherence with the rest of the site.

### 8.1 Card Containment: Border-Based, Not Elevated

News cards (`NewsCard`, `NewsRichCard`) use **border-based containment** (`border border-border/20 hover:border-border/40`) rather than `card-elevated` shadows. This matches the event card redesign pattern (see §2) and provides:

- Lighter visual weight appropriate for news thumbnails
- Subtle hover feedback via border opacity transition
- Consistent interaction pattern: `scale-[1.03]` (not `scale-105`) for gentle lift

### 8.1.1 Image Aspect Ratio: 3:2 Default

Standard/default news cards use **aspect-[3/2]** — the same ratio as event cards (`CardLayout`). Since news cards display the same event images from the API, matching ratios:

- Shows more of the source image (16:9 crops 19% more vertically)
- Reduces cognitive friction when switching between event and news views
- Follows the discovery velocity principle (§1): consistent patterns → faster scanning

Exceptions: **Hero variant** keeps `aspect-[16/9]` (cinematic, full-bleed with text overlay). **Horizontal variant** keeps `aspect-[4/3]` (compact side-by-side layout).

### 8.2 Date Formatting: Abbreviated Everywhere

All card contexts use `formatCardDate()` for consistent abbreviated dates (`"12 gen"` not `"12 de gener de 2026"`). Verbose `getFormattedDate()` is reserved for detail page headers only. This matches the event card convention established in §2.

### 8.3 No Hero Image on Article Detail

Article detail pages intentionally omit a hero image. The first event card below the article header already displays the same image, so rendering it as a hero would create visual duplication. Removing the hero keeps the layout clean and avoids redundant image loads.

### 8.4 Related News Section

A "Related Articles" section appears below the article body when `relatedNews` data is available, rendering up to 3 `NewsCard` items. The pattern follows the same grid layout as news listing pages for visual consistency.

### 8.5 Social Sharing (Dual Placement)

`NewsShareButtons` appears in two positions: above the article description and below the events section. Dual placement ensures share buttons are accessible both at first glance and after reading. The component is a thin `"use client"` wrapper importing `CardShareButton` — no new sharing library was introduced.

### 8.6 Reusable Breadcrumb (`Breadcrumbs`)

All three news routes (`/noticies`, `/noticies/[place]`, `/noticies/[place]/[slug]`) use the shared `Breadcrumbs` component (`components/ui/common/Breadcrumbs.tsx`) accepting `BreadcrumbItem[]` props with:

- `aria-current="page"` on the last item
- `flex-wrap` for mobile overflow
- Consistent separator and styling

### 8.7 Skeleton Alignment

`NewsArticleSkeleton` uses `bg-muted` (not `bg-gray-200`) and matches the article detail layout dimensions. `NewsListSkeleton` uses a news-specific card skeleton with 16:9 aspect ratio, description block, and badge shapes rather than reusing `EventCardSkeleton`.

### 8.8 i18n Completeness

All user-facing strings added during the refactor are translated across all three locales (`ca`, `es`, `en`): `relatedArticles` and `shareArticle` in `App.NewsArticleDetail`, and `viewCategory` aria-label in `Components.News`.
