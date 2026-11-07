# Card refactor plan: one accessible event card

**Status**: plan only, no code in this PR. Delete this file when the implementation ships (see `docs/README.md`).
**Scope**: `CardLayout` (events, news), the home carousel card, skeletons, the ad card. One PR into `develop`, three commits so each can be reviewed and reverted alone.

This plan was reviewed by two independent AI reviewers (accessibility/CSS, repo rules/risk) before opening this PR. Their findings are folded in below; "Changes after review" lists what they changed.

## Why

- A screen reader reads each title twice (link `aria-label` plus a hidden copy, then the `<h3>`), and a third time through the image `alt`.
- The card link is `absolute inset-0` inside an `overflow-hidden` article, and `.pressable-card` has no focus style, so keyboard focus is probably clipped (WCAG 2.4.7). To confirm in a browser.
- `CardHorizontalServer` copies `CardLayout`'s markup with smaller text; `CardLayout` takes ~25 props (rule: 10 or fewer).
- `DESIGN.md` describes a hover shadow and a grid that the code does not have.
- `· Diversos dies` repeats what the date range already says.

## Commit 1: refactor, no visible change

1. Add a `CardData` type (`types/props.ts`). `prepareCardContentData` returns it for events; `NewsCard` builds one by hand (it does not use `prepareCardContentData`). `CardLayout` takes `card`, `layout`, `compact`, `href`, `analyticsEventName`, `description`, `position`, `isPriority`, `renderLink`: 9 props.
2. Remove dead fields from `prepareCardContentData`: `viewCountAriaLabel`, `timeLabels`, `isMultiDay`, `categorySlug`, and the `tTime` parameter (plus `CompactCardProps.tTime` and its callers).
3. Merge `CardHorizontalServer` into `CardLayout` through `compact` (`px-3.5 pt-2.5 pb-3.5`, `text-sm` title with no min height, `text-xs` meta, `w-3.5` pin icon, image context `list`). Delete `cardHorizontal/CardHorizontalServer.tsx`, `cardHorizontal/index.tsx` (imported nowhere) and the `CardHorizontal*` types. `EventsAroundServer` renders `CardContentServer compact`.
4. Locale: `EventsAroundServer` already holds `rootLocale()`. `CardContentServer` gets an optional `locale` prop and falls back to `getLocaleSafely()` (reads `headers()`) only when it is missing, so the carousel does not start reading `headers()`.
5. Remove `imageViewTransitionName` (nothing calls `startViewTransition`; duplicate names would cancel a transition if one is added).
6. `EventCardSkeleton`: hairline border like the card instead of a shadow. Client skeleton grid in `HybridEventsListClient`: `gap-element-gap` (12px) to `gap-5` (the real list).
7. Test that the compact card's markup and classes are unchanged.

## Commit 2: accessible link pattern

1. **Title is the link.** `<h2|h3><a class="card-event-link">title</a></h2|h3>`. `.card-event-link::after` is `position:absolute; inset:0; z-index:1` and stretches over the article (`relative`). The link must not be positioned or transformed. Remove `aria-label` and the `sr-only` copy. The card link uses variant `plain`: `pressable-card` applies a `transform` on `:active` that would shrink the `::after`. `data-analytics-*` and `data-pressable-link` stay on the link.
2. **Heading level.** `headingLevel` (`h3` default). Only `HybridEventsList`, `ClientCardsList` (both sit under the page `<h1>`) and the main `NewsList` pass `h2`. Cards under a section `<h2>` (related news, profile events, home carousels) keep `h3`.
3. **DOM order.** Title first inside the body div, flex `order-*` keeps badges and date above it visually. The body stays after the image div, so the LCP image is still first in the HTML. Tab order changes: the favorite button now comes before the title link.
4. **Decorative image.** Card images get `alt=""`. `alt === ""` makes the image decorative in all four places that label it today: `ImageServer` fallback, `ClientImage` no-sources and error fallbacks (`role="img" aria-label=...`, hard-coded Catalan "Imatge no disponible") and `ImgDefaultCore` (`role="img"` when it has a title). Only callers that pass `alt=""` are affected, so the event page, profiles and sponsors keep their labels.
5. **Focus ring** on `.card-event-link:focus-visible::after`: `outline: 2px solid` primary, `outline-offset: -2px`, explicit 12px radius (the article clips square corners), plus a 4px inset white band so the ring keeps 3:1 over any photo. The link itself gets `outline: none`. The navbar is sticky from the `nav:` breakpoint, so the link gets `scroll-margin-top` and `scroll-margin-inline` so focus does not park the card under it or at the edge of a carousel.
6. **Hover and press.** Hover rules (border, title colour, image zoom 1.03) go inside `@media (hover: hover)`. Press feedback is `.card-event:has(.card-event-link:active)` with `transform: translateY(1px) scale(0.995)`, the same transform `.pressable-card:active` has today, so tapping the heart does not press the card (Safari older than 15.4 loses press feedback only). The global reduced-motion rule (`globals.css:551`) only zeroes durations; it does not remove transforms. So, like `.pressable-card` today (`globals.css:424-441`), the press transform and the image zoom both sit inside `@media (prefers-reduced-motion: no-preference)`; reduced-motion users get neither. The `shadow-card-hover` that `.pressable-card:active` adds is dropped on purpose: cards are border-only (`DESIGN.md` is being corrected to say so). `data-pressed` is only set by `PressableLink`, which cards do not use, so `:active` is the only press state they have today.
7. **`<time dateTime>`** for single-day events only (`<time>` cannot hold a range). Computed inline in `prepareCardContentData`: `test/prepareCardContentData.test.ts` mocks `@utils/date-helpers` with four exports, so a new helper would be `undefined` there.
8. Remove `pointer-events-none` from the body (redundant under the z-1 overlay) and the double `z-10`/`z-[2]` on the favorite wrapper.

## Commit 3: copy and visual

1. **Multi-day dates.** `formatCardDate` also returns `endLabel` and `endDay`. A running event shows `Fins al 30 nov.`; one starting today shows `Avui · Fins al 12 nov.` and one starting tomorrow `Demà · Fins al 12 nov.` (the existing urgency label, so the start day stays right); later ones keep the range. `· Diversos dies` goes (`multipleDates` deleted from ca, es, en: `i18n:check` does not flag unused keys). New key `CardContent.until`, with Catalan elision for days 1 and 11 (`Fins a l'1`, `Fins a l'11`) through an ICU `select`; es `Hasta el {date}`, en `Until {date}`. When the until label is shown the start time is hidden, because `Fins al 30 nov. · 18:00` reads as an end time.
2. Category badge `text-[11px]` to `text-xs`.
3. Ad card: reuse `Components.EventPage.sponsored` (client-listed) instead of hard-coded Catalan, `<p>` instead of `<h3>`, drop `cursor-pointer`.
4. Docs:
   - `DESIGN.md`: hover shadow (lines 281-283, 696-697, 826-827, 854-855) and grid text (676-678: it says 12px gap and 2 columns at sm, 3 at md; the code is `gap-5`, 2 at md, 3 at xl).
   - `docs/design-rationale.md`: §2.1 line 46 (`CardHorizontalServer`), §2.2 "Category badge on image (frosted glass)".
   - `design-system-conventions` skill: `.card-event*` classes.
   - `LESSONS.md`: "Avui/Demà" is computed at render and Cloudflare caches HTML for 30 minutes, so just after midnight a card can say "Demà" for an event now today.

## Changes after review

- Corrected: `CardLayout.tsx` is 123 lines, not 348, so no `CardMeta` split.
- `CardData` is a shared type, not just the return of `prepareCardContentData` (news builds its own).
- Heading level: `h3` default and only listings opt in to `h2` (a blanket `h2` for news breaks related-news, profile and home sections).
- Image decorative handling covers the error and placeholder paths, not only `alt`.
- Focus ring: explicit radius, contrast band, scroll margins; press feedback scoped with `:has()`.
- Carousel locale comes from `rootLocale()`, not `getLocaleSafely()`.
- Catalan elision and the hidden start time added. Reduced motion: the global rule only zeroes durations, so press and zoom stay inside `no-preference` (a second review round corrected my first "no separate rule" claim).
- **Deferred**: `CompactCard` (already one named link, and it renders inside the `"use cache"` `EventPageBody`, so it needs its own change with `locale` kept as a prop); the ad placeholder height (the real height is unmeasured; `contain-intrinsic-size` is only an off-screen hint); favorite button focus ring in forced-colors mode.

## What breaks and gets updated

- `test/CardLayout.test.tsx`: the `<h3>…</h3>` match (line 82), the flat props, the `renderLink` mock.
- `test/prepareCardContentData.test.ts`: the `date-helpers` mock shape, the `formatCardDate` return, about 20 `tTime` call sites, the removed fields.
- `test/category-labels.test.tsx`, `test/favorites-heart-visibility.test.tsx` (render `CardContentClient`).
- `types/props.ts`, `types/common.ts`, `EventsAroundServer.tsx`.
- Not affected: e2e (nothing keys on `aria-label`, `alt`, `<h3>` or `pressable-card`), analytics (`closest("[data-analytics-event-name]")` and `[data-pressable-link]` still match), JSON-LD, service worker.

## Verification

- `yarn lint && yarn typecheck && yarn test && yarn i18n:check`.
- `yarn build` to confirm the prerendered shells did not change (carousel, event page).
- `verify-que-fer` with Playwright (Chromium) at 375, 768 and 1280px: Tab through cards (ring visible, not clipped, sticky navbar does not cover it), one link per card in the accessibility tree, heading outline, reading and tab order, emulated `hover: none` and `prefers-reduced-motion`, screenshots.
- Compare `/barcelona` and an event page against `docs/performance/baselines.md` with ads off (lab runs disable ads, so ad CLS is not covered).
- Not verifiable in this environment: Safari/WebKit (stretched `::after` inside a `-webkit-box` line-clamp heading, outline radius) and Firefox. Only Chromium is installed; these stay open until checked on real devices.

## Open questions for the maintainer

- Hide the start time on `Fins al …` cards (proposed), or show it?
- Heart before the title link in tab order is accepted for now. Alternative: keep the heart after the link in DOM and position it visually.
- Is one PR with three commits acceptable, or split along the commits?
